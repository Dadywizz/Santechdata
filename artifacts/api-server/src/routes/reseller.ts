import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, walletsTable, transactionsTable, notificationsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

const RESELLER_FEE = 500;

// GET /reseller/status — current user's reseller status
router.get("/reseller/status", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select({
    id: usersTable.id,
    role: usersTable.role,
    resellerSince: usersTable.resellerSince,
  }).from(usersTable).where(eq(usersTable.id, req.userId!));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select({ balance: walletsTable.balance })
    .from(walletsTable).where(eq(walletsTable.userId, req.userId!));

  res.json({
    isReseller: user.role === "reseller",
    resellerSince: user.resellerSince ?? null,
    walletBalance: wallet ? parseFloat(wallet.balance) : 0,
    upgradeFee: RESELLER_FEE,
  });
});

// POST /reseller/upgrade — pay ₦500 from wallet to become a reseller
router.post("/reseller/upgrade", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.role === "reseller") { res.status(400).json({ error: "You are already a reseller." }); return; }
  if (user.role === "admin")    { res.status(400).json({ error: "Admin accounts cannot become resellers." }); return; }

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
    message: "Your reseller account is now active. You now enjoy wholesale pricing on all data bundles. Start selling and earn more!",
    type: "general",
  });

  res.json({
    success: true,
    message: "Congratulations! Your reseller account is now active.",
    resellerSince: new Date(),
  });
});

export default router;
