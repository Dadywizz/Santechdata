import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  transactionsTable,
  otpsTable,
  notificationsTable,
  webauthnCredentialsTable,
} from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { authenticate, signToken, type AuthRequest } from "../middlewares/auth";
import { flutterwaveCreatePermanentVA, aspfiyCreateReservedAccount } from "../lib/providers/gateways";
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
import { sendOtpEmail } from "../lib/email";

const router: IRouter = Router();

// ── WebAuthn in-memory challenge store (short-lived, 5 min TTL) ──────────────
const registrationChallenges = new Map<string, { challenge: string; expiry: number }>();
const loginChallenges        = new Map<string, { challenge: string; userId: string; expiry: number }>();
const FIVE_MIN = 5 * 60 * 1000;

function getRpFromOrigin(origin: string | undefined): { rpId: string; rpOrigin: string } {
  try {
    if (origin) {
      const u = new URL(origin);
      return { rpId: u.hostname, rpOrigin: origin };
    }
  } catch {}
  return { rpId: "localhost", rpOrigin: "http://localhost" };
}

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
  const { fullName, phone, password, referralCode, nin } = parsed.data as any;
  const email = parsed.data.email.trim().toLowerCase();

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
    nin: nin ?? null,
    passwordHash,
    referralCode: myReferralCode,
    referredBy: referredById,
    emailVerified: true,
  }).returning();

  await db.insert(walletsTable).values({ userId: user.id });

  req.log.info({ userId: user.id }, "User registered");

  // Auto-generate virtual accounts in the background (fire-and-forget)
  void (async () => {
    const appBaseUrl = process.env.APP_URL ?? "https://santechdata.com.ng";
    const nameParts = (user.fullName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Aspfiy — always attempt (no NIN required)
    try {
      const aspfiy = await aspfiyCreateReservedAccount({
        reference: `aspfiy-${user.id}`,
        firstName,
        lastName,
        email: user.email,
        phone: user.phone,
        webhookUrl: `${appBaseUrl}/api/wallet/webhook/aspfiy`,
      });
      await db.update(walletsTable)
        .set({ aspfiyAccountNumber: aspfiy.accountNumber, aspfiyAccountBank: aspfiy.bankName })
        .where(eq(walletsTable.userId, user.id));
    } catch {}

    // Flutterwave (Nuvion MFB) — only if NIN was provided
    if (nin) {
      try {
        const flw = await flutterwaveCreatePermanentVA({
          email: user.email,
          firstName,
          lastName,
          phone: user.phone,
          nin,
          narration: `SanTech Data – ${user.fullName}`,
        });
        await db.update(walletsTable)
          .set({ virtualAccountNumber: flw.accountNumber, virtualAccountBank: flw.bankName })
          .where(eq(walletsTable.userId, user.id));
      } catch {}
    }
  })();

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
  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);
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

  db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id)).execute().catch(() => {});

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
  const email = parsed.data.email.trim().toLowerCase();
  const { otp } = parsed.data;

  const [otpRecord] = await db.select().from(otpsTable).where(
    and(
      sql`lower(${otpsTable.email}) = ${email}`,
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
  await db.update(usersTable).set({ emailVerified: true }).where(sql`lower(${usersTable.email}) = ${email}`);

  res.json({ message: "Email verified successfully" });
});

// POST /auth/resend-otp
router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  const parsed = ResendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();

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
  const email = parsed.data.email.trim().toLowerCase();

  const [user] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);
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

// ── WebAuthn — Register: Begin ────────────────────────────────────────────────
router.post("/auth/webauthn/register/begin", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { rpId, rpOrigin } = getRpFromOrigin(req.headers.origin as string | undefined);

  // Exclude credentials already registered on this user
  const existing = await db.select().from(webauthnCredentialsTable).where(eq(webauthnCredentialsTable.userId, user.id));

  const options = await generateRegistrationOptions({
    rpName: "SanTech Data",
    rpID: rpId,
    userID: Buffer.from(user.id),
    userName: user.email,
    userDisplayName: user.fullName,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.credentialId, type: "public-key" as const })),
    authenticatorSelection: {
      residentKey: "discouraged",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });

  // Store challenge temporarily (keyed by userId)
  registrationChallenges.set(user.id, { challenge: options.challenge, expiry: Date.now() + FIVE_MIN });

  req.log?.info({ userId: user.id, rpId, rpOrigin }, "WebAuthn registration challenge generated");
  res.json(options);
});

// ── WebAuthn — Register: Finish ───────────────────────────────────────────────
router.post("/auth/webauthn/register/finish", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const stored = registrationChallenges.get(user.id);
  if (!stored || stored.expiry < Date.now()) {
    res.status(400).json({ error: "Registration challenge expired. Please try again." }); return;
  }
  registrationChallenges.delete(user.id);

  const { rpId, rpOrigin } = getRpFromOrigin(req.headers.origin as string | undefined);

  let verified = false;
  let credentialId = "";
  let publicKey = "";
  let counter = 0;

  try {
    const result = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: stored.challenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpId,
      requireUserVerification: true,
    });
    verified = result.verified;
    if (result.registrationInfo) {
      credentialId = result.registrationInfo.credential.id;
      publicKey = Buffer.from(result.registrationInfo.credential.publicKey).toString("base64url");
      counter = result.registrationInfo.credential.counter;
    }
  } catch (err: any) {
    req.log?.error({ err }, "WebAuthn registration verification failed");
    res.status(400).json({ error: err?.message ?? "Fingerprint verification failed" }); return;
  }

  if (!verified) { res.status(400).json({ error: "Fingerprint verification failed" }); return; }

  // Replace any previous registration from this user (one device per user for simplicity)
  await db.delete(webauthnCredentialsTable).where(eq(webauthnCredentialsTable.userId, user.id));
  await db.insert(webauthnCredentialsTable).values({
    userId: user.id,
    credentialId,
    publicKey,
    counter,
    deviceName: "My Device",
  });

  req.log?.info({ userId: user.id }, "WebAuthn credential registered");
  res.json({ verified: true });
});

// ── WebAuthn — Login: Begin ───────────────────────────────────────────────────
router.post("/auth/webauthn/login/begin", async (req, res): Promise<void> => {
  const email = (req.body?.email ?? "").trim().toLowerCase();
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  const [user] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);
  if (!user) { res.status(401).json({ error: "No account found with this email" }); return; }
  if (user.status === "suspended") { res.status(401).json({ error: "Account suspended" }); return; }

  const credentials = await db.select().from(webauthnCredentialsTable).where(eq(webauthnCredentialsTable.userId, user.id));
  if (credentials.length === 0) {
    res.status(400).json({ error: "No fingerprint registered for this account. Please set it up in Profile → Fingerprint Login." }); return;
  }

  const { rpId } = getRpFromOrigin(req.headers.origin as string | undefined);

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials: credentials.map((c) => ({ id: c.credentialId, type: "public-key" as const })),
    userVerification: "required",
  });

  loginChallenges.set(email, { challenge: options.challenge, userId: user.id, expiry: Date.now() + FIVE_MIN });

  res.json(options);
});

// ── WebAuthn — Login: Finish ──────────────────────────────────────────────────
router.post("/auth/webauthn/login/finish", async (req, res): Promise<void> => {
  const email = (req.body?.email ?? "").trim().toLowerCase();
  const response = req.body?.response;
  if (!email || !response) { res.status(400).json({ error: "Missing email or response" }); return; }

  const stored = loginChallenges.get(email);
  if (!stored || stored.expiry < Date.now()) {
    res.status(400).json({ error: "Challenge expired. Please try again." }); return;
  }
  loginChallenges.delete(email);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stored.userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  // Find the matching credential
  const credId = response.id ?? response.rawId;
  const [credential] = await db.select().from(webauthnCredentialsTable)
    .where(eq(webauthnCredentialsTable.credentialId, credId));
  if (!credential) { res.status(401).json({ error: "Unrecognised fingerprint. Please use your password." }); return; }

  const { rpId, rpOrigin } = getRpFromOrigin(req.headers.origin as string | undefined);

  let verified = false;
  let newCounter = credential.counter;
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpId,
      requireUserVerification: true,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
        counter: credential.counter,
      },
    });
    verified = result.verified;
    if (result.authenticationInfo) newCounter = result.authenticationInfo.newCounter;
  } catch (err: any) {
    res.status(401).json({ error: err?.message ?? "Fingerprint verification failed" }); return;
  }

  if (!verified) { res.status(401).json({ error: "Fingerprint verification failed" }); return; }

  // Update counter (replay attack protection)
  await db.update(webauthnCredentialsTable).set({ counter: newCounter }).where(eq(webauthnCredentialsTable.id, credential.id));
  db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id)).execute().catch(() => {});

  const token = signToken(user.id, user.role);
  res.json({
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, status: user.status, emailVerified: user.emailVerified, referralCode: user.referralCode, referredBy: user.referredBy, createdAt: user.createdAt },
  });
});

// ── WebAuthn — Remove ─────────────────────────────────────────────────────────
router.post("/auth/webauthn/remove", authenticate, async (req: AuthRequest, res): Promise<void> => {
  await db.delete(webauthnCredentialsTable).where(eq(webauthnCredentialsTable.userId, req.userId!));
  res.json({ removed: true });
});

export default router;
