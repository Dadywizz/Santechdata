import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  transactionsTable,
  dataPlansTable,
  notificationsTable,
  ticketsTable,
  settingsTable,
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

function planToJson(p: typeof dataPlansTable.$inferSelect) {
  return {
    id: p.id, network: p.network, name: p.name, size: p.size,
    validity: p.validity, price: parseFloat(p.price), costPrice: parseFloat(p.costPrice),
    providerCode: p.providerCode, isActive: p.isActive,
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

  const pendingTickets = await db.select().from(ticketsTable).where(eq(ticketsTable.status, "open"));

  res.json({
    totalUsers: allUsers.length,
    activeUsers,
    totalRevenue,
    totalWalletBalance,
    totalTransactions: allTx.length,
    pendingTickets: pendingTickets.length,
  });
});

// GET /admin/users
router.get("/admin/users", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = AdminGetUsersQueryParams.safeParse(req.query);
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const filtered = params.success && params.data.search
    ? users.filter((u) =>
        u.email.toLowerCase().includes(params.data.search!.toLowerCase()) ||
        u.fullName.toLowerCase().includes(params.data.search!.toLowerCase())
      )
    : users;

  const withBalances = await Promise.all(
    filtered.map(async (u) => {
      const [w] = await db.select().from(walletsTable).where(eq(walletsTable.userId, u.id));
      return { ...userToJson(u), balance: w ? parseFloat(w.balance) : 0 };
    })
  );

  res.json(withBalances);
});

// GET /admin/users/:id
router.get("/admin/users/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, id));
  res.json({ ...userToJson(user), balance: wallet ? parseFloat(wallet.balance) : 0 });
});

// PATCH /admin/users/:id/status
router.patch("/admin/users/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body as { status: string };
  const [user] = await db.update(usersTable).set({ status: status as "active" | "suspended", updatedAt: new Date() }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(userToJson(user));
});

// POST /admin/users/:id/fund
router.post("/admin/users/:id/fund", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { amount, note } = req.body as { amount: number; note?: string };
  if (!amount || amount <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }

  const [wallet] = await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, id)).returning();
  if (!wallet) { res.status(404).json({ error: "User wallet not found" }); return; }

  await db.insert(transactionsTable).values({
    userId: id,
    type: "wallet_fund",
    status: "success",
    amount: amount.toString(),
    description: note || "Admin wallet credit",
    reference: `ADMIN-FUND-${Date.now()}`,
    metadata: { adminFund: true },
  });

  await db.insert(notificationsTable).values({
    userId: id,
    title: "Wallet Credited",
    message: `Your wallet has been credited with ₦${amount.toLocaleString()} by admin.${note ? ` Note: ${note}` : ""}`,
    type: "wallet",
  });

  res.json({ balance: parseFloat(wallet.balance) });
});

// GET /admin/transactions
router.get("/admin/transactions", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = AdminGetTransactionsQueryParams.safeParse(req.query);
  const txList = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const filtered = params.success && params.data.type && params.data.type !== "all"
    ? txList.filter((tx) => tx.type === params.data.type)
    : txList;
  res.json(filtered.map(txToJson));
});

// GET /admin/data-plans
router.get("/admin/data-plans", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const plans = await db.select().from(dataPlansTable).orderBy(dataPlansTable.network, dataPlansTable.price);
  res.json(plans.map(planToJson));
});

// POST /admin/data-plans
router.post("/admin/data-plans", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AdminCreateDataPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { network, name, size, validity, price, costPrice } = parsed.data;
  const providerCode = (req.body as any).providerCode ?? "";
  const [plan] = await db.insert(dataPlansTable).values({
    network: network as "MTN" | "AIRTEL" | "GLO" | "9MOBILE",
    name, size, validity,
    price: price.toString(),
    costPrice: costPrice.toString(),
    providerCode,
  }).returning();
  res.status(201).json(planToJson(plan));
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
  if ((parsed.data as any).providerCode != null) updates.providerCode = (parsed.data as any).providerCode;

  const [plan] = await db.update(dataPlansTable).set(updates).where(eq(dataPlansTable.id, raw)).returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(planToJson(plan));
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
    if (!["data", "airtime", "electricity", "cable", "exam"].includes(tx.type)) continue;
    const date = new Date(tx.createdAt);
    let key: string;
    if (period === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else if (period === "weekly") {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      key = `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
    } else {
      key = date.toISOString().slice(0, 10);
    }

    const existing = grouped.get(key) ?? { revenue: 0, profit: 0, transactions: 0 };
    existing.revenue += parseFloat(tx.amount);
    existing.transactions++;
    grouped.set(key, existing);
  }

  const data = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, v]) => ({ date, ...v }));

  res.json(data);
});

// GET /admin/analytics/services
router.get("/admin/analytics/services", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const allTx = await db.select().from(transactionsTable).where(eq(transactionsTable.status, "success"));
  const serviceTypes = ["data", "airtime", "electricity", "cable", "exam"];
  const data = serviceTypes.map((type) => {
    const txs = allTx.filter((tx) => tx.type === type);
    return { type, count: txs.length, revenue: txs.reduce((s, tx) => s + parseFloat(tx.amount), 0) };
  });
  res.json(data);
});

// GET /admin/tickets
router.get("/admin/tickets", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const tickets = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));
  const withUsers = await Promise.all(
    tickets.map(async (t) => {
      const [user] = await db.select({ email: usersTable.email, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, t.userId));
      return { ...t, userEmail: user?.email, userFullName: user?.fullName };
    })
  );
  res.json(withUsers);
});

// PATCH /admin/tickets/:id
router.patch("/admin/tickets/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body as { status: string };
  const [ticket] = await db.update(ticketsTable).set({ status: status as any, updatedAt: new Date() }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json(ticket);
});

// POST /admin/broadcast
router.post("/admin/broadcast", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = BroadcastNotificationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { title, message } = parsed.data;
  const users = await db.select({ id: usersTable.id }).from(usersTable);
  await Promise.all(
    users.map((u) =>
      db.insert(notificationsTable).values({ userId: u.id, title, message, type: "general" })
    )
  );
  res.json({ sent: users.length });
});

// GET /admin/clubkonnect-test — ping Clubkonnect from production to verify IP whitelist
router.get("/admin/clubkonnect-test", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const userId = process.env.CLUBKONNECT_USERID ?? "";
  const apiKey = process.env.CLUBKONNECT_APIKEY ?? "";
  if (!userId || !apiKey) { res.status(503).json({ error: "Clubkonnect credentials not configured" }); return; }
  try {
    const body = new URLSearchParams({
      UserID: userId, APIKey: apiKey, NetworkID: "MTN",
      MobileNumber: "08000000000", DataPlan: "1", RequestID: `IPTEST${Date.now()}`,
    });
    const r = await fetch("https://www.clubkonnect.com/APIEPINDatabundleV1.asp", {
      method: "POST", body, signal: AbortSignal.timeout(10000),
    });
    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
    res.json({ httpStatus: r.status, response: data });
  } catch (err: any) {
    const cause = err?.cause as any;
    res.status(502).json({ error: "Failed to reach Clubkonnect", detail: err?.message, cause: cause?.message ?? cause?.code });
  }
});

// GET /admin/clubkonnect-plans?network=MTN
router.get("/admin/clubkonnect-plans", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const network = req.query.network as string;
  if (!network) { res.status(400).json({ error: "network required (MTN, AIRTEL, GLO, 9MOBILE)" }); return; }
  const userId = process.env.CLUBKONNECT_USERID ?? "";
  const apiKey = process.env.CLUBKONNECT_APIKEY ?? "";
  if (!userId || !apiKey) {
    res.status(503).json({ error: "Clubkonnect credentials not configured (CLUBKONNECT_USERID, CLUBKONNECT_APIKEY)" });
    return;
  }
  try {
    const body = new URLSearchParams({ UserID: userId, APIKey: apiKey, NetworkID: network });
    const r = await fetch("https://www.clubkonnect.com/APIEPINDatabundleV1.asp", { method: "POST", body, signal: AbortSignal.timeout(10000) });
    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
    res.json(data);
  } catch (err: any) {
    const cause = err?.cause as any;
    res.status(502).json({
      error: "Failed to reach Clubkonnect",
      detail: err?.message ?? String(err),
      cause: cause?.message ?? cause?.code ?? String(cause ?? ""),
    });
  }
});

// GET /admin/vtpass-variations — proxy VTpass variation codes for a service
router.get("/admin/vtpass-variations", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const serviceID = req.query.serviceID as string;
  if (!serviceID) { res.status(400).json({ error: "serviceID required" }); return; }
  const BASE = process.env.VTPASS_SANDBOX === "true"
    ? "https://sandbox.vtpass.com.ng/api"
    : "https://vtpass.com.ng/api";
  try {
    const r = await fetch(`${BASE}/service-variations?serviceID=${encodeURIComponent(serviceID)}`, {
      headers: {
        "api-key": process.env.VTPASS_API_KEY ?? "",
        "public-key": process.env.VTPASS_PUBLIC_KEY ?? "",
      },
    });
    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
    res.json(data);
  } catch (err: any) {
    const cause = err?.cause as any;
    res.status(502).json({
      error: "Failed to reach VTpass",
      detail: err?.message ?? String(err),
      cause: cause?.message ?? cause?.code ?? String(cause ?? ""),
      base: BASE,
      hasKey: !!(process.env.VTPASS_API_KEY),
    });
  }
});

// GET /admin/server-ip — returns this server's outbound IP (for Clubkonnect whitelisting)
router.get("/admin/server-ip", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  try {
    const r = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(8000) });
    const d = await r.json() as { ip: string };
    res.json({ ip: d.ip });
  } catch (err: any) {
    res.status(502).json({ error: "Could not determine server IP", detail: err?.message });
  }
});

// GET /admin/settings
router.get("/admin/settings", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const obj: Record<string, string> = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json(obj);
});

// PUT /admin/settings
router.put("/admin/settings", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const entries = Object.entries(req.body as Record<string, string>);
  for (const [key, value] of entries) {
    await db.insert(settingsTable).values({ key, value }).onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
  }
  res.json({ updated: entries.length });
});

export default router;
