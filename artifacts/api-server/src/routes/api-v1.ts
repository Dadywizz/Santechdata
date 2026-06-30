import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, dataPlansTable, transactionsTable, walletsTable, notificationsTable,
} from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireApiKey, type ApiKeyRequest } from "../middlewares/apiKeyAuth";
import {
  isActiveProviderConfigured,
  activePurchaseData,
  activePurchaseAirtime,
} from "../lib/providers/activeProvider";

const router: IRouter = Router();

// ── GET /api/v1/balance ────────────────────────────────────────────────────
router.get("/v1/balance", requireApiKey, async (req: ApiKeyRequest, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.apiUserId!));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  res.json({ balance: parseFloat(wallet.balance), currency: "NGN" });
});

// ── GET /api/v1/plans ──────────────────────────────────────────────────────
router.get("/v1/plans", requireApiKey, async (req: ApiKeyRequest, res): Promise<void> => {
  const { network } = req.query as { network?: string };
  const plans = await db.select().from(dataPlansTable).where(eq(dataPlansTable.isActive, true));
  const filtered = network ? plans.filter(p => p.network.toLowerCase() === network.toLowerCase()) : plans;
  res.json(filtered.map(p => ({
    id: p.id, network: p.network, name: p.name, size: p.size,
    validity: p.validity, price: parseFloat(p.price),
    providerCode: p.providerCode,
  })));
});

// ── POST /api/v1/data/purchase ─────────────────────────────────────────────
router.post("/v1/data/purchase", requireApiKey, async (req: ApiKeyRequest, res): Promise<void> => {
  const { planId, phone } = req.body as { planId?: string; phone?: string };
  if (!planId || !phone) { res.status(400).json({ error: "planId and phone are required" }); return; }
  if (!isActiveProviderConfigured()) { res.status(503).json({ error: "Service temporarily unavailable" }); return; }

  const [plan] = await db.select().from(dataPlansTable).where(eq(dataPlansTable.id, planId));
  if (!plan || !plan.isActive) { res.status(404).json({ error: "Data plan not found or unavailable" }); return; }
  if (!plan.providerCode) { res.status(503).json({ error: "Data plan not configured. Contact support." }); return; }

  const price = parseFloat(plan.price);
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.apiUserId!));
  if (parseFloat(wallet.balance) < price) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your API wallet." }); return;
  }

  await db.update(walletsTable)
    .set({ balance: sql`balance - ${price}`, updatedAt: new Date() })
    .where(eq(walletsTable.userId, req.apiUserId!));

  const reference = `API-DATA-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  let delivered = false;
  let providerError = "";
  let rawResponse: unknown = null;

  try {
    const r = await activePurchaseData({ plan: plan.providerCode, mobile_number: phone, network: plan.network });
    rawResponse = r;
    const success = (r as any).success === true;
    const st = String((r as any).status ?? "").toLowerCase();
    const msg = String((r as any).message ?? "").toLowerCase();
    delivered = success || st === "success" || st === "200" || msg.includes("success") || msg.includes("delivered");
    if (!delivered) providerError = (r as any).message || "";
  } catch (err: any) {
    providerError = err?.message ?? "Provider error";
  }

  if (!delivered) {
    await db.update(walletsTable)
      .set({ balance: sql`balance + ${price}`, updatedAt: new Date() })
      .where(eq(walletsTable.userId, req.apiUserId!));
    await db.insert(transactionsTable).values({
      userId: req.apiUserId!, type: "data", status: "failed", amount: price.toString(),
      description: `API: ${plan.network} ${plan.name} data for ${phone} — failed`,
      reference, metadata: { apiKeyId: req.apiKeyId, network: plan.network, phone, providerError, rawResponse },
    });
    res.status(422).json({ error: providerError || "Data delivery failed. Wallet refunded." }); return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.apiUserId!, type: "data", status: "success", amount: price.toString(),
    description: `API: ${plan.network} ${plan.name} data for ${phone}`,
    reference, metadata: { apiKeyId: req.apiKeyId, network: plan.network, size: plan.size, phone },
  }).returning();

  res.json({
    status: "success",
    message: `${plan.network} ${plan.size} data delivered to ${phone}`,
    reference: tx.reference,
    amount: price,
    network: plan.network,
    phone,
  });
});

// ── POST /api/v1/airtime/purchase ──────────────────────────────────────────
router.post("/v1/airtime/purchase", requireApiKey, async (req: ApiKeyRequest, res): Promise<void> => {
  const { network, phone, amount } = req.body as { network?: string; phone?: string; amount?: number };
  if (!network || !phone || !amount) {
    res.status(400).json({ error: "network, phone, and amount are required" }); return;
  }
  const validNetworks = ["MTN", "Airtel", "GLO", "9Mobile"];
  if (!validNetworks.includes(network)) {
    res.status(400).json({ error: `network must be one of: ${validNetworks.join(", ")}` }); return;
  }
  if (amount < 50 || amount > 50000) {
    res.status(400).json({ error: "amount must be between 50 and 50000" }); return;
  }
  if (!isActiveProviderConfigured()) { res.status(503).json({ error: "Service temporarily unavailable" }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.apiUserId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your API wallet." }); return;
  }

  await db.update(walletsTable)
    .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
    .where(eq(walletsTable.userId, req.apiUserId!));

  const reference = `API-AIR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  let delivered = false;
  let providerError = "";

  try {
    const r = await activePurchaseAirtime({ network, mobile_number: phone, amount });
    const success = (r as any).success === true;
    const st = String((r as any).status ?? "").toLowerCase();
    const msg = String((r as any).message ?? "").toLowerCase();
    delivered = success || st === "success" || st === "200" || msg.includes("success") || msg.includes("delivered");
    if (!delivered) providerError = (r as any).message || "";
  } catch (err: any) {
    providerError = err?.message ?? "Provider error";
  }

  if (!delivered) {
    await db.update(walletsTable)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(walletsTable.userId, req.apiUserId!));
    await db.insert(transactionsTable).values({
      userId: req.apiUserId!, type: "airtime", status: "failed", amount: amount.toString(),
      description: `API: ${network} ₦${amount} airtime for ${phone} — failed`,
      reference, metadata: { apiKeyId: req.apiKeyId, network, phone, providerError },
    });
    res.status(422).json({ error: providerError || "Airtime delivery failed. Wallet refunded." }); return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.apiUserId!, type: "airtime", status: "success", amount: amount.toString(),
    description: `API: ${network} ₦${amount} airtime for ${phone}`,
    reference, metadata: { apiKeyId: req.apiKeyId, network, phone },
  }).returning();

  res.json({
    status: "success",
    message: `₦${amount} ${network} airtime sent to ${phone}`,
    reference: tx.reference,
    amount,
    network,
    phone,
  });
});

// ── GET /api/v1/transactions ───────────────────────────────────────────────
router.get("/v1/transactions", requireApiKey, async (req: ApiKeyRequest, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "20")), 100);
  const txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, req.apiUserId!))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);
  res.json(txs.map(tx => ({
    id: tx.id, type: tx.type, status: tx.status,
    amount: parseFloat(tx.amount), description: tx.description,
    reference: tx.reference, createdAt: tx.createdAt,
  })));
});

export default router;
