import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  transactionsTable,
  dataPlansTable,
  notificationsTable,
  ticketsTable,
} from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  AdminGetUsersQueryParams,
  AdminGetTransactionsQueryParams,
  AdminCreateDataPlanBody,
  AdminUpdateDataPlanBody,
  BroadcastNotificationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function userToJson(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, fullName: u.fullName, email: u.email, phone: u.phone,
    role: u.role, status: u.status, emailVerified: u.emailVerified,
    referralCode: u.referralCode, referredBy: u.referredBy, createdAt: u.createdAt,
  };
}

function txToJson(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id, type: tx.type, status: tx.status, amount: parseFloat(tx.amount),
    description: tx.description, reference: tx.reference, metadata: tx.metadata,
    userId: tx.userId, createdAt: tx.createdAt,
  };
}

// GET /admin/stats
router.get("/admin/stats", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable);
  const activeUsers = allUsers.filter((u) => u.status === "active").length;

  const allTx = await db.select().from(transactionsTable).where(eq(transactionsTable.status, "success"));
  const totalRevenue = allTx
    .filter((tx) => ["data", "airtime", "electricity", "cable", "exam"].includes(tx.type))
    .reduce((s, tx) => s + parseFloat(tx.amount), 0);

  const allWallets = await db.select().from(walletsTable);
  const totalWalletBalance = allWallets.reduce((s, w) => s + parseFloat(w.balance), 0);

  const openTickets = await db.select().from(ticketsTable).where(eq(ticketsTable.status, "open"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTx = allTx.filter((tx) => new Date(tx.createdAt) >= today);
  const todayRevenue = todayTx
    .filter((tx) => ["data", "airtime", "electricity", "cable", "exam"].includes(tx.type))
    .reduce((s, tx) => s + parseFloat(tx.amount), 0);

  res.json({
    totalUsers: allUsers.length,
    activeUsers,
    totalTransactions: allTx.length,
    totalRevenue,
    totalWalletBalance,
    pendingTickets: openTickets.length,
    todayTransactions: todayTx.length,
    todayRevenue,
  });
});

// GET /admin/users
router.get("/admin/users", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = AdminGetUsersQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const search = params.success ? params.data.search : undefined;
  const status = params.success ? params.data.status : undefined;
  const offset = (page - 1) * limit;

  let users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));

  if (search) {
    const s = search.toLowerCase();
    users = users.filter((u) =>
      u.fullName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.phone.includes(s),
    );
  }
  if (status) {
    users = users.filter((u) => u.status === status);
  }

  res.json({
    data: users.slice(offset, offset + limit).map(userToJson),
    total: users.length,
    page,
    limit,
  });
});

// GET /admin/users/:id
router.get("/admin/users/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, raw));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(userToJson(user));
});

// PATCH /admin/users/:id/status
router.patch("/admin/users/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body as { status: string };

  const [user] = await db.update(usersTable)
    .set({ status: status as "active" | "suspended", updatedAt: new Date() })
    .where(eq(usersTable.id, raw))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(userToJson(user));
});

// POST /admin/users/:id/fund
router.post("/admin/users/:id/fund", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { amount, note } = req.body as { amount: number; note: string };

  await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, raw));
  await db.insert(transactionsTable).values({
    userId: raw,
    type: "wallet_fund",
    status: "success",
    amount: amount.toString(),
    description: `Admin credit: ${note}`,
    reference: `ADM-${Date.now()}`,
    metadata: { note, adminId: req.userId },
  });
  await db.insert(notificationsTable).values({
    userId: raw,
    title: "Wallet Credited",
    message: `Your wallet has been credited with ₦${amount.toLocaleString()} by admin.`,
    type: "wallet",
  });

  res.json({ message: "Wallet funded successfully" });
});

// GET /admin/transactions
router.get("/admin/transactions", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = AdminGetTransactionsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  let all = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));

  if (params.success) {
    if (params.data.type) all = all.filter((tx) => tx.type === params.data.type);
    if (params.data.status) all = all.filter((tx) => tx.status === params.data.status);
    if (params.data.userId) all = all.filter((tx) => tx.userId === params.data.userId);
  }

  res.json({
    data: all.slice(offset, offset + limit).map(txToJson),
    total: all.length,
    page,
    limit,
  });
});

// GET /admin/data-plans
router.get("/admin/data-plans", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const plans = await db.select().from(dataPlansTable).orderBy(dataPlansTable.network, dataPlansTable.price);
  res.json(plans.map((p) => ({
    id: p.id, network: p.network, name: p.name, size: p.size,
    validity: p.validity, price: parseFloat(p.price), costPrice: parseFloat(p.costPrice), isActive: p.isActive,
  })));
});

// POST /admin/data-plans
router.post("/admin/data-plans", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AdminCreateDataPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { network, name, size, validity, price, costPrice } = parsed.data;
  const [plan] = await db.insert(dataPlansTable).values({
    network: network as "MTN" | "AIRTEL" | "GLO" | "9MOBILE",
    name, size, validity,
    price: price.toString(),
    costPrice: costPrice.toString(),
  }).returning();
  res.status(201).json({
    id: plan.id, network: plan.network, name: plan.name, size: plan.size,
    validity: plan.validity, price: parseFloat(plan.price), costPrice: parseFloat(plan.costPrice), isActive: plan.isActive,
  });
});

// PATCH /admin/data-plans/:id
router.patch("/admin/data-plans/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = AdminUpdateDataPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.price != null) updates.price = parsed.data.price.toString();
  if (parsed.data.costPrice != null) updates.costPrice = parsed.data.costPrice.toString();
  if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;

  const [plan] = await db.update(dataPlansTable).set(updates).where(eq(dataPlansTable.id, raw)).returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json({
    id: plan.id, network: plan.network, name: plan.name, size: plan.size,
    validity: plan.validity, price: parseFloat(plan.price), costPrice: parseFloat(plan.costPrice), isActive: plan.isActive,
  });
});

// DELETE /admin/data-plans/:id
router.delete("/admin/data-plans/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(dataPlansTable).where(eq(dataPlansTable.id, raw));
  res.json({ message: "Data plan deleted" });
});

// GET /admin/analytics/revenue
router.get("/admin/analytics/revenue", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const period = (req.query.period as string) || "daily";
  const allTx = await db.select().from(transactionsTable).where(eq(transactionsTable.status, "success")).orderBy(transactionsTable.createdAt);

  const grouped = new Map<string, { revenue: number; profit: number; transactions: number }>();

  for (const tx of allTx) {
    const d = new Date(tx.createdAt);
    let key: string;
    if (period === "monthly") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else if (period === "weekly") {
      const weekNum = Math.ceil(d.getDate() / 7);
      key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    } else {
      key = d.toISOString().slice(0, 10);
    }

    if (!grouped.has(key)) grouped.set(key, { revenue: 0, profit: 0, transactions: 0 });
    const entry = grouped.get(key)!;
    const amt = parseFloat(tx.amount);
    if (["data", "airtime", "electricity", "cable", "exam"].includes(tx.type)) {
      entry.revenue += amt;
      entry.profit += amt * 0.05;
    }
    entry.transactions += 1;
  }

  const result = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, vals]) => ({ date, ...vals }));

  res.json(result);
});

// GET /admin/analytics/services
router.get("/admin/analytics/services", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const allTx = await db.select().from(transactionsTable).where(eq(transactionsTable.status, "success"));

  const serviceMap = new Map<string, { count: number; revenue: number }>();
  let totalRevenue = 0;

  for (const tx of allTx) {
    if (!["data", "airtime", "electricity", "cable", "exam"].includes(tx.type)) continue;
    if (!serviceMap.has(tx.type)) serviceMap.set(tx.type, { count: 0, revenue: 0 });
    const entry = serviceMap.get(tx.type)!;
    const amt = parseFloat(tx.amount);
    entry.count += 1;
    entry.revenue += amt;
    totalRevenue += amt;
  }

  const result = Array.from(serviceMap.entries()).map(([service, { count, revenue }]) => ({
    service, count, revenue,
    percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
  }));

  res.json(result);
});

// POST /admin/notifications/broadcast
router.post("/admin/notifications/broadcast", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = BroadcastNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, message, targetUserId } = parsed.data;

  if (targetUserId) {
    await db.insert(notificationsTable).values({ userId: targetUserId, title, message, type: "broadcast" });
  } else {
    const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.status, "active"));
    if (users.length > 0) {
      await db.insert(notificationsTable).values(users.map((u) => ({ userId: u.id, title, message, type: "broadcast" })));
    }
  }

  res.json({ message: "Notification broadcast sent" });
});

// GET /admin/export/transactions.csv
router.get("/admin/export/transactions.csv", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const all = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const rows = [
    ["ID", "User ID", "Type", "Status", "Amount (N)", "Description", "Reference", "Date"],
    ...all.map((tx) => [
      tx.id,
      tx.userId,
      tx.type,
      tx.status,
      tx.amount,
      `"${(tx.description ?? "").replace(/"/g, '""')}"`,
      tx.reference ?? "",
      tx.createdAt?.toISOString() ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="transactions-${Date.now()}.csv"`);
  res.send(csv);
});

export default router;
