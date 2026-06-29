import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, walletsTable, transactionsTable, notificationsTable, settingsTable,
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

const RESELLER_FEE = 500;

// GET /reseller/status — current user's reseller status + wallet balance
router.get("/reseller/status", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select({
    id: usersTable.id,
    role: usersTable.role,
    resellerSince: usersTable.resellerSince,
    referralCode: usersTable.referralCode,
  }).from(usersTable).where(eq(usersTable.id, req.userId!));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select({ balance: walletsTable.balance })
    .from(walletsTable).where(eq(walletsTable.userId, req.userId!));

  const [rateSetting] = await db.select({ value: settingsTable.value })
    .from(settingsTable).where(eq(settingsTable.key, "resellerCommissionRate"));

  res.json({
    isReseller: user.role === "reseller",
    resellerSince: user.resellerSince ?? null,
    referralCode: user.referralCode ?? null,
    walletBalance: wallet ? parseFloat(wallet.balance) : 0,
    upgradeFee: RESELLER_FEE,
    commissionRate: parseFloat(rateSetting?.value ?? "3"),
  });
});

// GET /reseller/referrals — referred users + commission earned (resellers only)
router.get("/reseller/referrals", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select({ role: usersTable.role, referralCode: usersTable.referralCode })
    .from(usersTable).where(eq(usersTable.id, req.userId!));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.role !== "reseller") { res.status(403).json({ error: "Reseller access required" }); return; }

  const referred = await db.select({
    id: usersTable.id,
    fullName: usersTable.fullName,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.referredBy, req.userId!));

  const commissions = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.userId, req.userId!), eq(transactionsTable.type, "commission" as any)));

  const totalCommission = commissions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const thisMonth = new Date();
  thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const monthlyCommission = commissions
    .filter((tx) => new Date(tx.createdAt) >= thisMonth)
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  res.json({
    referralCode: user.referralCode ?? "",
    totalReferrals: referred.length,
    totalCommission,
    monthlyCommission,
    referredUsers: referred.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      joinedAt: u.createdAt,
    })),
    recentCommissions: commissions.slice(-20).reverse().map((tx) => ({
      id: tx.id,
      amount: parseFloat(tx.amount),
      description: tx.description,
      createdAt: tx.createdAt,
    })),
  });
});

// POST /reseller/upgrade — pay ₦500 from wallet to become a reseller
router.post("/reseller/upgrade", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.role === "reseller") { res.status(400).json({ error: "You are already a reseller." }); return; }
  if (user.role === "admin") { res.status(400).json({ error: "Admin accounts cannot become resellers." }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (!wallet || parseFloat(wallet.balance) < RESELLER_FEE) {
    res.status(400).json({
      error: `Insufficient wallet balance. You need ₦${RESELLER_FEE.toLocaleString()} to activate your reseller account. Please fund your wallet first.`,
    });
    return;
  }

  const reference = `RESELLER-${Date.now()}`;

  await db.update(walletsTable)
    .set({ balance: sql`balance - ${RESELLER_FEE}`, updatedAt: new Date() })
    .where(eq(walletsTable.userId, req.userId!));

  await db.update(usersTable)
    .set({ role: "reseller", resellerSince: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, req.userId!));

  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "wallet_fund",
    status: "success",
    amount: RESELLER_FEE.toString(),
    description: "Reseller account activation fee",
    reference,
    metadata: { purpose: "reseller_upgrade" },
  });

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "🎉 Welcome to the SanTech Reseller Programme!",
    message: "Your reseller account is now active. Share your referral link — every purchase your referrals make earns you commission automatically!",
    type: "general",
  });

  res.json({
    success: true,
    message: "Congratulations! Your reseller account is now active. Start sharing your referral link to earn commission!",
    resellerSince: new Date(),
  });
});

export default router;
