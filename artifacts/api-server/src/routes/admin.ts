import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { customFetch } from "../lib/custom-fetch";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  transactionsTable,
  dataPlansTable,
  notificationsTable,
  ticketsTable,
  settingsTable,
  examTypesTable,
  apiKeysTable,
} from "@workspace/db";
import { kybdataGetDataPlans, kybdataGetElectricityDiscos, isKybdataConfigured } from "../lib/providers/kybdata";
import { isGsubzConfigured } from "../lib/providers/gsubz";
import { getBigisubBaseUrl, isBigisubConfigured } from "../lib/providers/bigisub";
import { isEasyaccessConfigured, easyaccessGetPlans } from "../lib/providers/easyaccess";
import {
  getActiveProviderName, PROVIDER_INFO, getAllProviderStatuses,
  getAllNetworkMappings, testProviderConnection, NETWORKS,
  getAllExamMappings, EXAM_TYPES,
  getElectricityProviderName,
} from "../lib/providers/activeProvider";
import { eq, sql, desc, inArray, not, and } from "drizzle-orm";
import { refreshSettings } from "../lib/settingsCache";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  AdminGetUsersQueryParams,
  AdminGetTransactionsQueryParams,
  AdminCreateDataPlanBody,
  AdminUpdateDataPlanBody,
  AdminUpdateExamTypeBody,
  BroadcastNotificationBody,
  AdminResolveTransactionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Thrown inside the resolve-transaction db.transaction() to bail out with a
// specific HTTP status; caught once outside the transaction below.
class ResolveError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function userToJson(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, fullName: u.fullName, email: u.email, phone: u.phone,
    role: u.role, status: u.status, emailVerified: u.emailVerified,
    referralCode: u.referralCode, referredBy: u.referredBy, createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

function txToJson(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id, type: tx.type, status: tx.status, amount: parseFloat(tx.amount),
    description: tx.description, reference: tx.reference, metadata: tx.metadata,
    userId: tx.userId, createdAt: tx.createdAt,
  };
}

function examTypeToJson(e: typeof examTypesTable.$inferSelect) {
  return {
    id: e.id, name: e.name, code: e.code, price: parseFloat(e.price),
    costPrice: e.costPrice != null ? parseFloat(e.costPrice) : null,
    description: e.description,
  };
}

function planToJson(p: typeof dataPlansTable.$inferSelect) {
  return {
    id: p.id, network: p.network, name: p.name, size: p.size,
    validity: p.validity, price: parseFloat(p.price),
    resellerPrice: p.resellerPrice != null ? parseFloat(p.resellerPrice) : null,
    costPrice: parseFloat(p.costPrice),
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

  const suspendedUsers = allUsers.filter((u) => u.status === "suspended").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTx = allTx.filter((tx) => new Date(tx.createdAt) >= today);
  const todayRevenue = todayTx
    .filter((tx) => ["data", "airtime", "electricity", "cable", "exam"].includes(tx.type))
    .reduce((s, tx) => s + parseFloat(tx.amount), 0);

  res.json({
    totalUsers: allUsers.length,
    activeUsers,
    suspendedUsers,
    totalRevenue,
    todayRevenue,
    todayTransactions: todayTx.length,
    totalWalletBalance,
    totalTransactions: allTx.length,
    pendingTickets: pendingTickets.length,
  });
});

// GET /admin/users
router.get("/admin/users", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = AdminGetUsersQueryParams.safeParse(req.query);
  const page = params.success ? params.data.page : 1;
  const limit = params.success ? params.data.limit : 20;
  const search = params.success ? params.data.search : undefined;
  const statusFilter = params.success ? params.data.status : undefined;

  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  let filtered = users;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((u) =>
      u.email.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  }
  if (statusFilter && statusFilter !== "all") {
    filtered = filtered.filter((u) => u.status === statusFilter);
  }

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const withBalances = await Promise.all(
    paginated.map(async (u) => {
      const [w] = await db.select().from(walletsTable).where(eq(walletsTable.userId, u.id));
      return { ...userToJson(u), balance: w ? parseFloat(w.balance) : 0 };
    })
  );

  res.json({ data: withBalances, total, page, limit });
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

// POST /admin/users/:id/reset-virtual-account — clear stored VA so user can regenerate with BVN/NIN
router.post("/admin/users/:id/reset-virtual-account", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [wallet] = await db.update(walletsTable)
    .set({ virtualAccountNumber: null, virtualAccountBank: null, updatedAt: new Date() })
    .where(eq(walletsTable.userId, id))
    .returning();
  if (!wallet) { res.status(404).json({ error: "User wallet not found" }); return; }
  res.json({ ok: true });
});

// POST /admin/users/:id/set-password — admin force-sets a user's password (bypasses email)
router.post("/admin/users/:id/set-password", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { password } = req.body;
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  req.log.info({ adminId: req.userId, targetUserId: id }, "Admin set password for user");
  res.json({ ok: true });
});

// GET /admin/transactions
router.get("/admin/transactions", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = AdminGetTransactionsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 25) : 25;
  const typeFilter = params.success ? params.data.type : undefined;
  const statusFilter = params.success ? (params.data as any).status : undefined;

  const txList = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  let filtered = txList;
  if (typeFilter && typeFilter !== "all") filtered = filtered.filter((tx) => tx.type === typeFilter);
  if (statusFilter && statusFilter !== "all") filtered = filtered.filter((tx) => tx.status === statusFilter);

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const allUsers = await db.select().from(usersTable);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const data = paginated.map((tx) => {
    const user = userMap.get(tx.userId);
    return {
      ...txToJson(tx),
      user: user ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone } : null,
    };
  });

  res.json({ data, total, page, limit });
});

// POST /admin/transactions/:id/resolve — manually resolve an ambiguous
// service-purchase transaction: either a "pending" purchase whose provider
// call timed out client-side (wallet is still debited, outcome unknown), or
// a historical "failed" purchase (already auto-refunded) that the admin has
// since confirmed actually succeeded via the provider's own portal.
router.post("/admin/transactions/:id/resolve", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = AdminResolveTransactionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { outcome, token, note } = parsed.data;
  const RESOLVABLE_TYPES = new Set(["data", "airtime", "electricity", "cable", "exam"]);

  try {
    const resolvedTx = await db.transaction(async (dtx) => {
      const [current] = await dtx.select().from(transactionsTable).where(eq(transactionsTable.id, id)).for("update");
      if (!current) throw new ResolveError(404, "Transaction not found");
      if (!RESOLVABLE_TYPES.has(current.type)) {
        throw new ResolveError(400, "Only service-purchase transactions (data, airtime, electricity, cable, exam) can be resolved this way");
      }
      const meta = (current.metadata as Record<string, any>) ?? {};
      if (meta.resolution) {
        throw new ResolveError(409, `Transaction was already resolved as "${meta.resolution.outcome}" on ${meta.resolution.resolvedAt}`);
      }
      if (current.status === "success") {
        throw new ResolveError(409, "Transaction is already marked successful");
      }

      const amount = parseFloat(current.amount);

      if (current.status === "pending") {
        // Wallet is still debited — this was a provider-call timeout, not a
        // definitive failure, so no refund has happened yet.
        if (outcome === "failed") {
          await dtx.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, current.userId));
        }
        // outcome === "success": wallet already correctly charged, nothing to move.
      } else {
        // current.status === "failed": auto-refunded at the time of failure
        // (pre-fix behavior), so the customer already has their money back.
        if (outcome === "success") {
          const [wallet] = await dtx.select().from(walletsTable).where(eq(walletsTable.userId, current.userId));
          const balance = wallet ? parseFloat(wallet.balance) : 0;
          if (balance < amount) {
            throw new ResolveError(400, `Cannot re-debit ₦${amount.toLocaleString()} for this confirmed purchase — wallet balance is only ₦${balance.toLocaleString()}. Fund the wallet first, then resolve again.`);
          }
          await dtx.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, current.userId));
        }
        // outcome === "failed": already refunded and already marked failed — this just records confirmation.
      }

      const resolution = { resolvedBy: req.userId, resolvedAt: new Date().toISOString(), outcome, note };
      const newMetadata = { ...meta, resolution, ...(token ? { token } : {}) };
      const [updated] = await dtx.update(transactionsTable)
        .set({ status: outcome === "success" ? "success" : "failed", metadata: newMetadata })
        .where(eq(transactionsTable.id, id))
        .returning();
      return updated;
    });

    await db.insert(notificationsTable).values({
      userId: resolvedTx.userId,
      title: outcome === "success" ? "Purchase Confirmed" : "Purchase Failed — Refunded",
      message: outcome === "success"
        ? `Good news — your ₦${parseFloat(resolvedTx.amount).toLocaleString()} ${resolvedTx.type} purchase went through.${token ? ` Reference: ${token}` : ""}`
        : `Your ₦${parseFloat(resolvedTx.amount).toLocaleString()} ${resolvedTx.type} purchase could not be confirmed with the provider and has been refunded to your wallet.`,
      type: resolvedTx.type as any,
    });

    req.log.info({ adminId: req.userId, transactionId: id, outcome }, "Admin resolved ambiguous transaction");
    res.json({ message: `Transaction resolved as ${outcome}` });
  } catch (err: any) {
    if (err instanceof ResolveError) { res.status(err.status).json({ error: err.message }); return; }
    req.log.error({ err, transactionId: id }, "Failed to resolve transaction");
    res.status(500).json({ error: "Failed to resolve transaction" });
  }
});

// GET /admin/failed-payments — failed or pending wallet_fund transactions with user info
router.get("/admin/failed-payments", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const txList = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.type, "wallet_fund"))
    .orderBy(desc(transactionsTable.createdAt));

  const problematic = txList.filter((tx) => tx.status === "failed" || tx.status === "pending");

  const withUsers = await Promise.all(
    problematic.map(async (tx) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, tx.userId));
      return {
        ...txToJson(tx),
        user: user ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone } : null,
        currentBalance: wallet ? parseFloat(wallet.balance) : 0,
      };
    })
  );

  res.json(withUsers);
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
  if ("resellerPrice" in parsed.data) {
    updates.resellerPrice = (parsed.data as any).resellerPrice != null
      ? (parsed.data as any).resellerPrice.toString()
      : null;
  }

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
    existing.profit += parseFloat(tx.amount) * 0.05;
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

// POST /admin/notifications/broadcast
router.post("/admin/notifications/broadcast", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = BroadcastNotificationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { title, message, targetUserId } = parsed.data;

  if (targetUserId) {
    const [target] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, targetUserId));
    if (!target) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(notificationsTable).values({ userId: target.id, title, message, type: "general" });
    res.json({ sent: 1 });
  } else {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    await Promise.all(
      users.map((u) =>
        db.insert(notificationsTable).values({ userId: u.id, title, message, type: "general" })
      )
    );
    res.json({ sent: users.length });
  }
});


// POST /admin/notifications/notify-unlinked — notify all users with no virtual account
router.post("/admin/notifications/notify-unlinked", authenticate, requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const usersWithoutVA = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(sql`${walletsTable.virtualAccountNumber} IS NULL AND ${usersTable.role} = 'customer'`);

  if (usersWithoutVA.length === 0) {
    res.json({ sent: 0, message: "All customers already have a bank account linked." });
    return;
  }

  await Promise.all(
    usersWithoutVA.map((u) =>
      db.insert(notificationsTable).values({
        userId: u.id,
        title: "🏦 Set Up Your Free Bank Account",
        message: "You can now get a dedicated bank account number for your SanTech Data wallet. Transfer any amount anytime and your wallet is credited automatically. Tap here or go to Fund Wallet → Bank Transfer to set it up now.",
        type: "general",
      })
    )
  );

  res.json({ sent: usersWithoutVA.length });
});

// GET /admin/settings
router.get("/admin/settings", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const obj: Record<string, string> = {};
  for (const s of settings) obj[s.key] = s.value;
  // Inject live provider statuses + network/exam mappings from memory
  const statuses = getAllProviderStatuses();
  const netMap   = getAllNetworkMappings();
  const examMap  = getAllExamMappings();
  obj.activeProvider          = getActiveProviderName();
  obj.bigisub_base_url        = getBigisubBaseUrl();
  obj.kyb_configured          = String(statuses.kyb);
  obj.bigisub_configured      = String(statuses.bigisub);
  // Verified = explicit test passed (kyb_verified/bigisub_verified in DB).
  // If never tested via "Link Provider" button, fall back to configured (has token).
  obj.kyb_verified     = statuses.kyb     ? (obj["kyb_verified"]     ?? obj.kyb_configured)     : "false";
  obj.bigisub_verified = statuses.bigisub ? (obj["bigisub_verified"] ?? "false") : "false";
  obj.clubkonnect_configured  = String(statuses.clubkonnect);
  obj.gsubz_configured        = String(statuses.gsubz);
  obj.easyaccess_configured   = String(statuses.easyaccess);
  obj.easyaccess_verified     = statuses.easyaccess ? (obj["easyaccess_verified"] ?? "false") : "false";
  obj.elec_provider           = getElectricityProviderName();
  for (const net  of NETWORKS)    obj[`net_provider_${net}`]  = netMap[net];
  for (const exam of EXAM_TYPES)  obj[`exam_provider_${exam}`] = examMap[exam];
  res.json(obj);
});

// PATCH /admin/settings
router.patch("/admin/settings", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const entries = Object.entries(req.body as Record<string, string>);
  for (const [key, value] of entries) {
    await db.insert(settingsTable).values({ key, value }).onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
  }
  // Hot-reload this instance immediately; other autoscale instances will
  // pick up the change within their own settings-cache TTL (see settingsCache.ts).
  await refreshSettings();
  res.json({ updated: entries.length, propagationSeconds: 15 });
});

// POST /admin/link-provider — save credential + test connection
router.post("/admin/link-provider", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { provider } = req.body as { provider: string };
  if (!provider || !(provider in PROVIDER_INFO)) {
    res.status(400).json({ ok: false, message: "Unknown provider" }); return;
  }
  const result = await testProviderConnection(provider as any);
  // Persist the actual verification status so the badge reflects reality
  const verifiedKey = `${provider}_verified`;
  await db.insert(settingsTable).values({ key: verifiedKey, value: String(result.ok) })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(result.ok), updatedAt: new Date() } });
  res.json(result);
});

// POST /admin/sync-kyb-plans — fetch data plans from KYB Data and upsert into DB
router.post("/admin/sync-kyb-plans", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  if (!isKybdataConfigured()) {
    res.status(503).json({ error: "KYB Data token not configured. Set it in Admin → Settings." });
    return;
  }

  // KYB Data returns: { success, data: [{ id, name, amount, category, available }] }
  // category examples: "MTN GIFTING", "AIRTEL SME", "GLO SME ", "9MOBILE CG"
  function extractNetwork(category: string): string | null {
    const c = (category || "").trim().toUpperCase();
    if (c.startsWith("MTN")) return "MTN";
    if (c.startsWith("AIRTEL")) return "AIRTEL";
    if (c.startsWith("GLO")) return "GLO";
    if (c.startsWith("9MOBILE") || c.startsWith("ETISALAT")) return "9MOBILE";
    return null;
  }

  function parseSize(name: string): string {
    // Handles: "1.5GB", "500MB", "1.GB", "5.GB", "1 GB", "500 MB"
    const m = name.match(/(\d+(?:\.\d+)?)\s*\.?\s*(TB|GB|G\b|MB|M\b)/i);
    if (!m) return "?";
    const num = m[1].replace(/\.$/, "");
    const unit = m[2].toUpperCase().replace(/^G$/, "GB").replace(/^M$/, "MB");
    return `${num}${unit}`.slice(0, 20);
  }

  function parseValidity(name: string): string {
    const m = name.match(/(\d+)\s*(day|days|month|months|week|weeks)/i);
    if (!m) return "30 Days";
    const n = parseInt(m[1]);
    const u = m[2].toLowerCase();
    if (u.startsWith("week")) return `${n * 7} Days`;
    if (u.startsWith("month")) return `${n} Month${n > 1 ? "s" : ""}`;
    return `${n} Day${n > 1 ? "s" : ""}`;
  }

  let added = 0, updated = 0, deactivated = 0;
  const errors: string[] = [];

  try {
    // Fetch raw from KYB Data — their actual field names are: id, name, amount, category, available
    const raw = await kybdataGetDataPlans() as unknown as Array<Record<string, unknown>>;
    req.log?.info({ count: raw.length }, "KYB Data sync: fetched plans");

    const kybProviderCodes = new Set<string>();

    for (const p of raw) {
      const id = p.id ?? p.plan_id;
      const name = String(p.name ?? "").trim();
      const category = String(p.category ?? p.network ?? "").trim();
      const available = p.available !== false;
      const price = Number(p.amount ?? p.price ?? 0);

      if (!id || !name || price <= 0 || !available) continue;

      const network = extractNetwork(category);
      if (!network) continue;

      const providerCode = String(id);
      kybProviderCodes.add(providerCode);
      const size = parseSize(name);
      const validity = parseValidity(name);
      const costPrice = (price * 0.97).toFixed(2);

      const existing = await db.select({ id: dataPlansTable.id })
        .from(dataPlansTable)
        .where(eq(dataPlansTable.providerCode, providerCode));

      if (existing.length > 0) {
        await db.update(dataPlansTable)
          .set({ name: name.slice(0, 100), size, validity, price: price.toString(), costPrice, isActive: true, updatedAt: new Date() })
          .where(eq(dataPlansTable.providerCode, providerCode));
        updated++;
      } else {
        await db.insert(dataPlansTable).values({
          network,
          name: name.slice(0, 100),
          size, validity,
          price: price.toString(),
          costPrice,
          providerCode,
          isActive: true,
        });
        added++;
      }
    }

    // Deactivate any plans in DB whose providerCode no longer exists on KYB
    if (kybProviderCodes.size > 0) {
      const codes = Array.from(kybProviderCodes);
      const result = await db.update(dataPlansTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(not(inArray(dataPlansTable.providerCode, codes)));
      deactivated = (result as any).rowCount ?? 0;
    }

    // Deduplicate: for same network+size+validity keep only cheapest, deactivate the rest
    const allActive = await db.select().from(dataPlansTable).where(eq(dataPlansTable.isActive, true));
    const seen = new Map<string, { id: string; price: number }>();
    const toDeactivate: string[] = [];
    for (const plan of allActive) {
      const key = `${plan.network}|${plan.size}|${plan.validity}`;
      const price = parseFloat(plan.price);
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, { id: plan.id, price });
      } else if (price < existing.price) {
        toDeactivate.push(existing.id);
        seen.set(key, { id: plan.id, price });
      } else {
        toDeactivate.push(plan.id);
      }
    }
    if (toDeactivate.length > 0) {
      await db.update(dataPlansTable).set({ isActive: false, updatedAt: new Date() }).where(inArray(dataPlansTable.id, toDeactivate));
      deactivated += toDeactivate.length;
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    req.log?.error({ err }, "KYB Data sync error");
  }

  res.json({ added, updated, deactivated, errors });
});

// GET /admin/easyaccess-plans — read-only lookup of EasyAccess's raw plan catalog,
// used to help map data_plans.providerCode to EasyAccess plan IDs before switching
// a network's Data routing to EasyAccess.
router.get("/admin/easyaccess-plans", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  if (!isEasyaccessConfigured()) {
    res.status(503).json({ error: "EasyAccess token not configured. Set it in Admin → Settings." });
    return;
  }
  const productType = String(req.query.product_type ?? "");
  if (!productType) {
    res.status(400).json({ error: "product_type query param is required (e.g. mtn_sme, glo_gifting, airtel_gifting, 9mobile_sme, waec, neco, nabteb)" });
    return;
  }
  try {
    const raw = await easyaccessGetPlans(productType);
    res.json(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log?.error({ err }, "EasyAccess get-plans error");
    res.status(502).json({ error: msg });
  }
});

// GET /admin/kyb-electricity-discos — read-only lookup of KYB Data's raw disco
// catalog, used to confirm the correct discoid before switching electricity
// routing to KYB Data (KYB_ELEC_DISCO_ID in services.ts uses guessed IDs).
router.get("/admin/kyb-electricity-discos", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  if (!isKybdataConfigured()) {
    res.status(503).json({ error: "KYB Data token not configured. Set it in Admin → Settings." });
    return;
  }
  try {
    const raw = await kybdataGetElectricityDiscos();
    res.json(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log?.error({ err }, "KYB Data get-electricity-discos error");
    res.status(502).json({ error: msg });
  }
});

// GET /admin/resellers — list all reseller accounts
router.get("/admin/resellers", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const resellers = await db.select().from(usersTable).where(eq(usersTable.role, "reseller"));
  const withWallets = await Promise.all(
    resellers.map(async (u) => {
      const [wallet] = await db.select({ balance: walletsTable.balance }).from(walletsTable).where(eq(walletsTable.userId, u.id));
      const txCount = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable)
        .where(eq(transactionsTable.userId, u.id));
      return {
        id: u.id, fullName: u.fullName, email: u.email, phone: u.phone,
        status: u.status, resellerSince: u.resellerSince,
        walletBalance: wallet ? parseFloat(wallet.balance) : 0,
        transactionCount: Number(txCount[0]?.count ?? 0),
      };
    })
  );
  res.json({ resellers: withWallets, total: withWallets.length });
});

// PATCH /admin/resellers/:id — update reseller (status or revoke reseller role)
router.patch("/admin/resellers/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { action } = req.body as { action: "suspend" | "activate" | "revoke" };
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user || user.role !== "reseller") { res.status(404).json({ error: "Reseller not found" }); return; }

  if (action === "revoke") {
    await db.update(usersTable).set({ role: "customer", resellerSince: null, updatedAt: new Date() }).where(eq(usersTable.id, id));
    res.json({ message: "Reseller access revoked. Account downgraded to customer." }); return;
  }
  if (action === "suspend" || action === "activate") {
    const status = action === "suspend" ? "suspended" : "active";
    await db.update(usersTable).set({ status, updatedAt: new Date() }).where(eq(usersTable.id, id));
    res.json({ message: `Reseller account ${status}.` }); return;
  }
  res.status(400).json({ error: "Unknown action. Use suspend, activate, or revoke." });
});

// POST /admin/clear-data-plans — wipe all data plans so admin can re-add for a new provider
router.post("/admin/clear-data-plans", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  await db.delete(dataPlansTable);
  res.json({ message: "All data plans cleared. You can now add plans for your new provider." });
});

// GET /admin/exams — list all exam types with cost price + sell price for pricing management
router.get("/admin/exams", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const types = await db.select().from(examTypesTable);
  res.json(types.map(examTypeToJson));
});

// POST /admin/seed-exam-types — upsert WAEC, NECO, JAMB, NABTEB with default pricing.
// Existing rows keep their code but get their name/description refreshed; price/costPrice
// are only set on first insert so admin edits made via /admin/exams are never overwritten.
router.post("/admin/seed-exam-types", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const TYPES = [
    { name: "NECO (National Examinations Council)", code: "NECO" as const, price: "2099", costPrice: "1950", description: "NECO result checker PIN" },
    { name: "WAEC (West African Examinations Council)", code: "WAEC" as const, price: "3700", costPrice: "3500", description: "WAEC result checker PIN" },
    { name: "JAMB (Joint Admissions and Matriculation Board)", code: "JAMB" as const, price: "1000", costPrice: "850", description: "JAMB result checker PIN" },
    { name: "NABTEB (National Business and Technical Examinations Board)", code: "NABTEB" as const, price: "1000", costPrice: "850", description: "NABTEB result checker PIN" },
  ];

  let upserted = 0;
  for (const t of TYPES) {
    await db.insert(examTypesTable).values(t)
      .onConflictDoUpdate({
        target: examTypesTable.code,
        set: { name: t.name, description: t.description },
      });
    upserted++;
  }
  res.json({ upserted, message: `${upserted} exam type(s) synced (WAEC, NECO, JAMB, NABTEB).` });
});

// PATCH /admin/exams/:id — update exam type pricing
router.patch("/admin/exams/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = AdminUpdateExamTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.price != null) updates.price = parsed.data.price.toString();
  if (parsed.data.costPrice != null) updates.costPrice = parsed.data.costPrice.toString();
  if ("description" in parsed.data) updates.description = parsed.data.description ?? null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [examType] = await db.update(examTypesTable).set(updates).where(eq(examTypesTable.id, raw)).returning();
  if (!examType) {
    res.status(404).json({ error: "Exam type not found" });
    return;
  }
  res.json(examTypeToJson(examType));
});

// POST /admin/debug-monnify — test Monnify auth (without creating any account)
router.post("/admin/debug-monnify", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  if (!process.env.MONNIFY_API_KEY || !process.env.MONNIFY_SECRET_KEY || !process.env.MONNIFY_CONTRACT_CODE) {
    res.json({ configured: false, error: "Missing MONNIFY_API_KEY, MONNIFY_SECRET_KEY, or MONNIFY_CONTRACT_CODE" });
    return;
  }
  const baseUrl = process.env.MONNIFY_API_KEY?.startsWith("MK_TEST_") ? "https://sandbox.monnify.com" : "https://api.monnify.com";
  try {
    const creds = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64");
    const authRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/json" },
    });
    const authData = await authRes.json() as Record<string, unknown>;
    res.json({
      configured: true,
      baseUrl,
      authSuccess: (authData as any).requestSuccessful === true,
      contractCode: process.env.MONNIFY_CONTRACT_CODE?.slice(0, 4) + "****",
      response: authData,
    });
  } catch (err: any) {
    res.json({ configured: true, baseUrl, authSuccess: false, error: err?.message });
  }
});

// TEMPORARY diagnostic route — remove after EasyAccess egress-IP investigation is resolved.
router.get("/admin/debug-egress-ip", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const body = await r.json();
    res.json({ egressIp: (body as any).ip });
  } catch (err: any) {
    res.json({ error: err?.message });
  }
});

// ── USER API KEYS (customer self-service) ────────────────────────────────────

router.get("/user/api-keys", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      key: apiKeysTable.key,
      isActive: apiKeysTable.isActive,
      totalRequests: apiKeysTable.totalRequests,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, userId))
    .orderBy(desc(apiKeysTable.createdAt));
  res.json(keys);
});

router.post("/user/api-keys", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Key name is required" }); return; }

  const existing = await db.select({ id: apiKeysTable.id }).from(apiKeysTable).where(eq(apiKeysTable.userId, userId));
  if (existing.length >= 3) { res.status(400).json({ error: "Maximum 3 API keys allowed per account" }); return; }

  const rawKey = `sk_live_${crypto.randomUUID().replace(/-/g, "")}`;
  const [created] = await db.insert(apiKeysTable).values({ userId, name: name.trim(), key: rawKey }).returning();
  res.status(201).json({
    id: created.id, name: created.name, key: created.key,
    isActive: created.isActive, totalRequests: created.totalRequests,
    lastUsedAt: created.lastUsedAt, createdAt: created.createdAt,
  });
});

router.delete("/user/api-keys/:id", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const { id } = req.params;
  const [deleted] = await db.delete(apiKeysTable)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "API key not found" }); return; }
  res.json({ message: "API key deleted" });
});

// ── API KEYS (admin) ──────────────────────────────────────────────────────────

router.get("/admin/api-keys", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      userId: apiKeysTable.userId,
      name: apiKeysTable.name,
      key: apiKeysTable.key,
      isActive: apiKeysTable.isActive,
      totalRequests: apiKeysTable.totalRequests,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
      userFullName: usersTable.fullName,
      userEmail: usersTable.email,
    })
    .from(apiKeysTable)
    .leftJoin(usersTable, eq(apiKeysTable.userId, usersTable.id))
    .orderBy(desc(apiKeysTable.createdAt));

  res.json(keys.map(k => ({
    id: k.id, userId: k.userId, name: k.name, key: k.key,
    isActive: k.isActive, totalRequests: k.totalRequests,
    lastUsedAt: k.lastUsedAt, createdAt: k.createdAt,
    user: { fullName: k.userFullName, email: k.userEmail },
  })));
});

router.post("/admin/api-keys", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { userId, name } = req.body as { userId?: string; name?: string };
  if (!userId || !name) { res.status(400).json({ error: "userId and name are required" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rawKey = `sk_live_${crypto.randomUUID().replace(/-/g, "")}`;
  const [created] = await db.insert(apiKeysTable).values({ userId, name, key: rawKey }).returning();
  res.status(201).json({
    id: created.id, userId: created.userId, name: created.name, key: created.key,
    isActive: created.isActive, totalRequests: created.totalRequests,
    lastUsedAt: created.lastUsedAt, createdAt: created.createdAt,
    user: { fullName: user.fullName, email: user.email },
  });
});

router.patch("/admin/api-keys/:id", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== "boolean") { res.status(400).json({ error: "isActive (boolean) is required" }); return; }
  const [updated] = await db.update(apiKeysTable).set({ isActive }).where(eq(apiKeysTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "API key not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
  res.json({
    id: updated.id, userId: updated.userId, name: updated.name, key: updated.key,
    isActive: updated.isActive, totalRequests: updated.totalRequests,
    lastUsedAt: updated.lastUsedAt, createdAt: updated.createdAt,
    user: user ? { fullName: user.fullName, email: user.email } : null,
  });
});

router.delete("/admin/api-keys/:id", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const id = (_req as any).params.id as string;
  const [deleted] = await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "API key not found" }); return; }
  res.json({ message: "API key deleted" });
});

export default router;
