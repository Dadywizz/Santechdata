import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { airtimeToCashTable, walletsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

const RATES: Record<string, number> = { MTN: 75, AIRTEL: 70, GLO: 65, "9MOBILE": 65 };
const MAX_AIRTIME = 10000;
const FEE = 20;
const RECEIVE_PHONE = "08063136201";

function itemToJson(r: typeof airtimeToCashTable.$inferSelect, user?: { fullName: string; email: string; phone: string } | null) {
  return {
    id: r.id,
    userId: r.userId,
    network: r.network,
    airtimeAmount: parseFloat(r.airtimeAmount),
    payoutAmount: parseFloat(r.payoutAmount),
    rate: r.rate,
    senderPhone: r.senderPhone,
    status: r.status,
    adminNote: r.adminNote ?? null,
    createdAt: r.createdAt,
    user: user ?? null,
  };
}

// GET /airtime-to-cash — user's own requests
router.get("/airtime-to-cash", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(airtimeToCashTable)
    .where(eq(airtimeToCashTable.userId, req.userId!))
    .orderBy(desc(airtimeToCashTable.createdAt));
  res.json(rows.map((r) => itemToJson(r)));
});

// POST /airtime-to-cash — submit request
router.post("/airtime-to-cash", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const { network, airtimeAmount, senderPhone } = req.body as {
    network: string; airtimeAmount: number; senderPhone: string;
  };

  if (!["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(network)) {
    res.status(400).json({ error: "Invalid network" });
    return;
  }
  if (!airtimeAmount || airtimeAmount < 100) {
    res.status(400).json({ error: "Minimum airtime amount is ₦100" });
    return;
  }
  if (airtimeAmount > MAX_AIRTIME) {
    res.status(400).json({ error: `Maximum airtime per request is ₦${MAX_AIRTIME.toLocaleString()}` });
    return;
  }
  if (!senderPhone || !/^0[789]\d{9}$/.test(senderPhone.trim())) {
    res.status(400).json({ error: "Enter a valid Nigerian phone number" });
    return;
  }

  const rate = RATES[network] ?? 70;
  const payoutAmount = Math.floor(airtimeAmount * rate / 100) - FEE;

  if (payoutAmount <= 0) {
    res.status(400).json({ error: "Airtime amount too small after fee deduction" });
    return;
  }

  const [row] = await db.insert(airtimeToCashTable).values({
    userId: req.userId!,
    network: network as "MTN" | "AIRTEL" | "GLO" | "9MOBILE",
    airtimeAmount: airtimeAmount.toString(),
    payoutAmount: payoutAmount.toString(),
    rate,
    senderPhone: senderPhone.trim(),
    status: "pending",
  }).returning();

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Airtime to Cash Request Received",
    message: `Your request to convert ₦${airtimeAmount.toLocaleString()} ${network} airtime has been received. You'll be credited ₦${payoutAmount.toLocaleString()} once approved. Please send the airtime to ${RECEIVE_PHONE}.`,
    type: "info",
  });

  res.status(201).json(itemToJson(row));
});

// GET /admin/airtime-to-cash
router.get("/admin/airtime-to-cash", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(airtimeToCashTable)
    .orderBy(desc(airtimeToCashTable.createdAt));

  const withUsers = await Promise.all(rows.map(async (r) => {
    const [user] = await db.select({ fullName: usersTable.fullName, email: usersTable.email, phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, r.userId));
    return itemToJson(r, user ?? null);
  }));

  res.json(withUsers);
});

// PATCH /admin/airtime-to-cash/:id/review
router.patch("/admin/airtime-to-cash/:id/review", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { action, adminNote } = req.body as { action: "approve" | "reject"; adminNote?: string };

  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    return;
  }

  const [existing] = await db.select().from(airtimeToCashTable).where(eq(airtimeToCashTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (existing.status !== "pending") {
    res.status(400).json({ error: `Request already ${existing.status}` });
    return;
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  if (action === "approve") {
    const payout = parseFloat(existing.payoutAmount);
    await db.update(walletsTable)
      .set({ balance: sql`balance + ${payout}`, updatedAt: new Date() })
      .where(eq(walletsTable.userId, existing.userId));

    await db.insert(notificationsTable).values({
      userId: existing.userId,
      title: "Airtime to Cash Approved ✅",
      message: `Your ₦${parseFloat(existing.airtimeAmount).toLocaleString()} ${existing.network} airtime has been approved. ₦${payout.toLocaleString()} has been credited to your wallet.`,
      type: "success",
    });
  } else {
    await db.insert(notificationsTable).values({
      userId: existing.userId,
      title: "Airtime to Cash Rejected",
      message: `Your airtime-to-cash request for ₦${parseFloat(existing.airtimeAmount).toLocaleString()} ${existing.network} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""} Contact support if you have questions.`,
      type: "error",
    });
  }

  const [updated] = await db.update(airtimeToCashTable)
    .set({ status: newStatus, adminNote: adminNote ?? null, updatedAt: new Date() })
    .where(eq(airtimeToCashTable.id, id))
    .returning();

  res.json(itemToJson(updated));
});

export default router;
