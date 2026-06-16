import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  otpsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { authenticate, signToken, type AuthRequest } from "../middlewares/auth";
import {
  RegisterBody,
  LoginBody,
  VerifyEmailBody,
  ResendOtpBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  ChangePasswordBody,
  UpdateProfileBody,
} from "@workspace/api-zod";
import { monnifyCreateReservedAccount } from "../lib/providers/gateways";
import { sendOtpEmail } from "../lib/email";

const router: IRouter = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { fullName, email, phone, password, referralCode } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const [existingPhone] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existingPhone) {
    res.status(400).json({ error: "Phone number already in use" });
    return;
  }

  let referredById: string | null = null;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
    if (referrer) referredById = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const myReferralCode = generateReferralCode();

  const [user] = await db.insert(usersTable).values({
    fullName,
    email,
    phone,
    passwordHash,
    referralCode: myReferralCode,
    referredBy: referredById,
  }).returning();

  const [newWallet] = await db.insert(walletsTable).values({ userId: user.id }).returning();

  // Fire-and-forget: create Monnify dedicated virtual account for instant bank funding
  monnifyCreateReservedAccount({
    accountReference: user.id,
    accountName: user.fullName,
    customerEmail: user.email,
    customerName: user.fullName,
  }).then(async (acct) => {
    if (acct && newWallet) {
      await db.update(walletsTable)
        .set({ virtualAccountNumber: acct.accountNumber, virtualAccountBank: acct.bankName })
        .where(eq(walletsTable.id, newWallet.id));
    }
  }).catch(() => {});

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(otpsTable).values({ email, otp, type: "email_verify", expiresAt });
  sendOtpEmail(email, otp, "verify").catch(() => {});

  req.log.info({ userId: user.id }, "User registered");

  const token = signToken(user.id, user.role);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      createdAt: user.createdAt,
    },
  });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.status === "suspended") {
    res.status(401).json({ error: "Account suspended. Contact support." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id, user.role);
  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      createdAt: user.createdAt,
    },
  });
});

// GET /auth/me
router.get("/auth/me", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    createdAt: user.createdAt,
  });
});

// POST /auth/verify-email
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, otp } = parsed.data;

  const [otpRecord] = await db.select().from(otpsTable).where(
    and(
      eq(otpsTable.email, email),
      eq(otpsTable.otp, otp),
      eq(otpsTable.type, "email_verify"),
      eq(otpsTable.used, false),
      gt(otpsTable.expiresAt, new Date()),
    ),
  );

  if (!otpRecord) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otpRecord.id));
  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.email, email));

  res.json({ message: "Email verified successfully" });
});

// POST /auth/resend-otp
router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  const parsed = ResendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email } = parsed.data;

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(otpsTable).values({ email, otp, type: "email_verify", expiresAt });
  sendOtpEmail(email, otp, "verify").catch(() => {});

  req.log.info({ email }, "OTP resent");
  res.json({ message: "OTP sent to your email" });
});

// POST /auth/forgot-password
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (user) {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.insert(otpsTable).values({ email, otp, type: "password_reset", expiresAt });
    sendOtpEmail(email, otp, "reset").catch(() => {});
    req.log.info({ email }, "Password reset OTP generated");
  }

  res.json({ message: "If that email exists, a reset link has been sent" });
});

// POST /auth/reset-password
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { token: otp, password } = parsed.data;

  const [otpRecord] = await db.select().from(otpsTable).where(
    and(
      eq(otpsTable.otp, otp),
      eq(otpsTable.type, "password_reset"),
      eq(otpsTable.used, false),
      gt(otpsTable.expiresAt, new Date()),
    ),
  );

  if (!otpRecord) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.email, otpRecord.email));
  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otpRecord.id));

  res.json({ message: "Password reset successfully" });
});

// POST /auth/change-password
router.post("/auth/change-password", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, req.userId!));

  res.json({ message: "Password changed successfully" });
});

// PATCH /auth/profile
router.patch("/auth/profile", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName) updates.fullName = parsed.data.fullName;
  if (parsed.data.phone) updates.phone = parsed.data.phone;
  updates.updatedAt = new Date();

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    createdAt: user.createdAt,
  });
});

export default router;
