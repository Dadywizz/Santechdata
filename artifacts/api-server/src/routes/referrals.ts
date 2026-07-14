import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

// GET /referrals
router.get("/referrals", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const referred = await db.select().from(usersTable).where(eq(usersTable.referredBy, req.userId!));

  const REFERRAL_BONUS = 100;
  const totalEarnings = referred.length * REFERRAL_BONUS;

  const referrals = referred.map((r) => ({
    name: r.fullName,
    date: r.createdAt,
    bonus: REFERRAL_BONUS,
  }));

  const baseUrl = process.env.APP_URL || "https://santech-data.replit.app";
  res.json({
    referralCode: user.referralCode ?? "",
    referralLink: `${baseUrl}/register?ref=${user.referralCode ?? ""}`,
    totalReferrals: referred.length,
    totalEarnings,
    referrals,
  });
});

export default router;
