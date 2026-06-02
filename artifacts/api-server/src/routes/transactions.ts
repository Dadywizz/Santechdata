import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable, walletsTable } from "@workspace/db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";
import { GetTransactionsQueryParams, GetTransactionParams } from "@workspace/api-zod";

const router: IRouter = Router();

function txToJson(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    amount: parseFloat(tx.amount),
    description: tx.description,
    reference: tx.reference,
    metadata: tx.metadata,
    userId: tx.userId,
    createdAt: tx.createdAt,
  };
}

// GET /transactions
router.get("/transactions", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetTransactionsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const all = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, req.userId!))
    .orderBy(desc(transactionsTable.createdAt));

  const filtered = all.filter((tx) => {
    if (params.success && params.data.type && tx.type !== params.data.type) return false;
    if (params.success && params.data.status && tx.status !== params.data.status) return false;
    return true;
  });

  const data = filtered.slice(offset, offset + limit).map(txToJson);

  res.json({ data, total: filtered.length, page, limit });
});

// GET /transactions/summary
router.get("/transactions/summary", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const all = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.userId, req.userId!), eq(transactionsTable.status, "success")))
    .orderBy(desc(transactionsTable.createdAt));

  const totalSpent = all.reduce((sum, tx) => {
    if (["data", "airtime", "electricity", "cable", "exam"].includes(tx.type)) {
      return sum + parseFloat(tx.amount);
    }
    return sum;
  }, 0);

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const tx of all) {
    if (!categoryMap.has(tx.type)) categoryMap.set(tx.type, { total: 0, count: 0 });
    const entry = categoryMap.get(tx.type)!;
    entry.total += parseFloat(tx.amount);
    entry.count += 1;
  }

  const byCategory = Array.from(categoryMap.entries()).map(([type, { total, count }]) => ({
    type, total, count,
  }));

  const recentTransactions = all.slice(0, 5).map(txToJson);

  res.json({ totalSpent, byCategory, recentTransactions });
});

// GET /transactions/:id
router.get("/transactions/:id", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [tx] = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.id, raw), eq(transactionsTable.userId, req.userId!)));

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json(txToJson(tx));
});

// GET /dashboard/summary
router.get("/dashboard/summary", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  const allTx = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.userId, req.userId!), eq(transactionsTable.status, "success")))
    .orderBy(desc(transactionsTable.createdAt));

  const totalSpent = allTx.reduce((sum, tx) => {
    if (["data", "airtime", "electricity", "cable", "exam"].includes(tx.type)) {
      return sum + parseFloat(tx.amount);
    }
    return sum;
  }, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySpend = allTx
    .filter((tx) => new Date(tx.createdAt) >= monthStart && ["data", "airtime", "electricity", "cable", "exam"].includes(tx.type))
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  // Count unread notifications
  const { notificationsTable } = await import("@workspace/db");
  const notifications = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.userId, req.userId!), eq(notificationsTable.isRead, false)));

  res.json({
    walletBalance: parseFloat(wallet?.balance ?? "0"),
    totalSpent,
    totalTransactions: allTx.length,
    monthlySpend,
    recentTransactions: allTx.slice(0, 5).map(txToJson),
    notificationCount: notifications.length,
  });
});

export default router;
