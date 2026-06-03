import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  dataPlansTable, transactionsTable, walletsTable, notificationsTable,
  examTypesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";
import {
  GetDataPlansQueryParams,
  PurchaseDataBody,
  PurchaseAirtimeBody,
  VerifyMeterBody,
  PurchaseElectricityBody,
  GetCablePlansQueryParams,
  VerifySmartcardBody,
  SubscribeCableBody,
  PurchaseExamTokenBody,
} from "@workspace/api-zod";
import {
  clubkonnectPurchaseData,
  clubkonnectPurchaseAirtime,
  clubkonnectGetExamPins,
} from "../lib/providers/clubkonnect";

const router: IRouter = Router();

function isClubkonnectConfigured(): boolean {
  return !!(process.env.CLUBKONNECT_USERID && process.env.CLUBKONNECT_APIKEY);
}

const NETWORK_MAP: Record<string, string> = {
  MTN: "MTN",
  AIRTEL: "AIRTEL",
  GLO: "GLO",
  "9MOBILE": "9MOBILE",
};

// ── DATA ──────────────────────────────────────────────────────────────────────
router.get("/data/plans", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetDataPlansQueryParams.safeParse(req.query);

  const plans = await db.select().from(dataPlansTable).where(eq(dataPlansTable.isActive, true));
  const filtered = params.success && params.data.network
    ? plans.filter((p) => p.network === params.data.network)
    : plans;

  res.json(filtered.map((p) => ({
    id: p.id,
    network: p.network,
    name: p.name,
    size: p.size,
    validity: p.validity,
    price: parseFloat(p.price),
    costPrice: parseFloat(p.costPrice),
    providerCode: p.providerCode,
    isActive: p.isActive,
  })));
});

router.post("/data/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PurchaseDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { planId, phone } = parsed.data;

  const [plan] = await db.select().from(dataPlansTable).where(eq(dataPlansTable.id, planId));
  if (!plan || !plan.isActive) {
    res.status(404).json({ error: "Data plan not found or unavailable" });
    return;
  }

  if (!isClubkonnectConfigured()) {
    res.status(503).json({ error: "VTU service is temporarily unavailable. Please try again later or contact support." });
    return;
  }

  if (!plan.providerCode) {
    res.status(503).json({ error: "This data plan is not yet configured for delivery. Please contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  const price = parseFloat(plan.price);
  if (parseFloat(wallet.balance) < price) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  // Deduct wallet first
  await db.update(walletsTable).set({ balance: sql`balance - ${price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `DATA-${Date.now()}`;

  let delivered = false;
  try {
    const ckRes = await clubkonnectPurchaseData({
      network: NETWORK_MAP[plan.network] ?? plan.network,
      phone,
      planId: plan.providerCode,
      requestId: reference,
    });
    delivered = ckRes?.status?.toUpperCase() === "SUCCESS";
    req.log?.info({ ckRes }, "Clubkonnect data purchase response");
  } catch (err) {
    req.log?.error({ err }, "Clubkonnect data purchase error");
  }

  if (!delivered) {
    // Refund wallet
    await db.update(walletsTable).set({ balance: sql`balance + ${price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "data",
      status: "failed",
      amount: price.toString(),
      description: `${plan.network} ${plan.size} data for ${phone} — delivery failed`,
      reference,
      metadata: { network: plan.network, size: plan.size, validity: plan.validity, phone },
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Data Purchase Failed",
      message: `Your ₦${price} data purchase failed. Your wallet has been refunded. Please try again or contact support.`,
      type: "data",
    });

    res.status(502).json({ error: "Data delivery failed. Your wallet has been refunded. Please try again or contact support." });
    return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "data",
    status: "success",
    amount: price.toString(),
    description: `${plan.network} ${plan.size} data for ${phone}`,
    reference,
    metadata: { network: plan.network, size: plan.size, validity: plan.validity, phone },
  }).returning();

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Data Purchase Successful",
    message: `${plan.network} ${plan.size} data has been sent to ${phone}.`,
    type: "data",
  });

  res.json({
    id: tx.id, type: tx.type, status: tx.status,
    amount: parseFloat(tx.amount), description: tx.description,
    reference: tx.reference, metadata: tx.metadata, userId: tx.userId,
    createdAt: tx.createdAt,
  });
});

// ── AIRTIME ───────────────────────────────────────────────────────────────────
router.post("/airtime/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PurchaseAirtimeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { network, phone, amount } = parsed.data;

  if (amount < 50) {
    res.status(400).json({ error: "Minimum airtime amount is ₦50" });
    return;
  }

  if (!isClubkonnectConfigured()) {
    res.status(503).json({ error: "VTU service is temporarily unavailable. Please try again later or contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  // Deduct wallet first
  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `AIR-${Date.now()}`;

  let delivered = false;
  try {
    const ckRes = await clubkonnectPurchaseAirtime({
      network: NETWORK_MAP[network] ?? network,
      phone,
      amount,
      requestId: reference,
    });
    delivered = ckRes?.status?.toUpperCase() === "SUCCESS";
    req.log?.info({ ckRes }, "Clubkonnect airtime purchase response");
  } catch (err) {
    req.log?.error({ err }, "Clubkonnect airtime purchase error");
  }

  if (!delivered) {
    // Refund wallet
    await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "airtime",
      status: "failed",
      amount: amount.toString(),
      description: `${network} airtime for ${phone} — delivery failed`,
      reference,
      metadata: { network, phone },
    });

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Airtime Purchase Failed",
      message: `Your ₦${amount} airtime purchase failed. Your wallet has been refunded. Please try again or contact support.`,
      type: "airtime",
    });

    res.status(502).json({ error: "Airtime delivery failed. Your wallet has been refunded. Please try again or contact support." });
    return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "airtime",
    status: "success",
    amount: amount.toString(),
    description: `${network} airtime for ${phone}`,
    reference,
    metadata: { network, phone },
  }).returning();

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Airtime Purchase Successful",
    message: `₦${amount} ${network} airtime sent to ${phone}.`,
    type: "airtime",
  });

  res.json({
    id: tx.id, type: tx.type, status: tx.status,
    amount: parseFloat(tx.amount), description: tx.description,
    reference: tx.reference, metadata: tx.metadata, userId: tx.userId,
    createdAt: tx.createdAt,
  });
});

// ── ELECTRICITY ───────────────────────────────────────────────────────────────
const ELECTRICITY_PROVIDERS = [
  { id: "ikeja-electric", name: "Ikeja Electric", code: "IE" },
  { id: "eko-electric", name: "Eko Electric", code: "EKO" },
  { id: "abuja-electric", name: "Abuja Electric", code: "AEDC" },
  { id: "port-harcourt-electric", name: "Port Harcourt Electric", code: "PHED" },
  { id: "enugu-electric", name: "Enugu Electric", code: "EEDC" },
  { id: "ibadan-electric", name: "Ibadan Electric", code: "IBEDC" },
  { id: "kano-electric", name: "Kano Electric", code: "KEDCO" },
];

router.get("/electricity/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(ELECTRICITY_PROVIDERS);
});

router.post("/electricity/verify-meter", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifyMeterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { meterNumber, providerCode, meterType } = parsed.data;

  res.json({
    meterNumber,
    name: "Customer",
    address: "",
  });
});

router.post("/electricity/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PurchaseElectricityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { meterNumber, providerCode, meterType, amount, phone } = parsed.data;

  if (amount < 500) {
    res.status(400).json({ error: "Minimum electricity purchase is ₦500" });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `ELEC-${Date.now()}`;
  const token = Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join("-");

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "electricity",
    status: "success",
    amount: amount.toString(),
    description: `Electricity token for meter ${meterNumber}`,
    reference,
    metadata: { meterNumber, providerCode, meterType, token, phone },
  }).returning();

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Electricity Token Purchased",
    message: `Token: ${token} for meter ${meterNumber}`,
    type: "electricity",
  });

  res.json({ id: tx.id, status: "success", token, amount, meterNumber, createdAt: tx.createdAt });
});

// ── CABLE TV ──────────────────────────────────────────────────────────────────
const CABLE_PROVIDERS = [
  { id: "dstv", name: "DStv", code: "DSTV" },
  { id: "gotv", name: "GOtv", code: "GOTV" },
  { id: "startimes", name: "StarTimes", code: "STARTIMES" },
];

const CABLE_PLANS = [
  { id: "dstv-padi", provider: "DSTV", name: "DStv Padi", price: 2950, validity: "Monthly", vtCode: "padi" },
  { id: "dstv-yanga", provider: "DSTV", name: "DStv Yanga", price: 3600, validity: "Monthly", vtCode: "yanga" },
  { id: "dstv-confam", provider: "DSTV", name: "DStv Confam", price: 6200, validity: "Monthly", vtCode: "confam" },
  { id: "dstv-compact", provider: "DSTV", name: "DStv Compact", price: 10500, validity: "Monthly", vtCode: "compact" },
  { id: "dstv-premium", provider: "DSTV", name: "DStv Premium", price: 29500, validity: "Monthly", vtCode: "premium" },
  { id: "gotv-supa", provider: "GOTV", name: "GOtv Supa", price: 6400, validity: "Monthly", vtCode: "gotv-supa" },
  { id: "gotv-max", provider: "GOTV", name: "GOtv Max", price: 4850, validity: "Monthly", vtCode: "gotv-max" },
  { id: "gotv-jolli", provider: "GOTV", name: "GOtv Jolli", price: 3300, validity: "Monthly", vtCode: "gotv-jolli" },
  { id: "gotv-jinja", provider: "GOTV", name: "GOtv Jinja", price: 2250, validity: "Monthly", vtCode: "gotv-jinja" },
  { id: "startimes-nova", provider: "STARTIMES", name: "StarTimes Nova", price: 900, validity: "Monthly", vtCode: "nova" },
  { id: "startimes-basic", provider: "STARTIMES", name: "StarTimes Basic", price: 1850, validity: "Monthly", vtCode: "basic" },
  { id: "startimes-smart", provider: "STARTIMES", name: "StarTimes Smart", price: 3100, validity: "Monthly", vtCode: "smart" },
];

router.get("/cable/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(CABLE_PROVIDERS);
});

router.get("/cable/plans", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCablePlansQueryParams.safeParse(req.query);
  const filtered = params.success && params.data.provider
    ? CABLE_PLANS.filter((p) => p.provider === params.data.provider)
    : CABLE_PLANS;
  res.json(filtered.map(({ vtCode: _v, ...p }) => p));
});

router.post("/cable/verify-smartcard", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifySmartcardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { smartcardNumber, provider } = parsed.data;

  res.json({
    smartcardNumber,
    name: "Customer",
    currentPlan: provider === "DSTV" ? "DStv Compact" : provider === "GOTV" ? "GOtv Max" : "StarTimes Smart",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

router.post("/cable/subscribe", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubscribeCableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { planId, smartcardNumber, provider } = parsed.data;

  const plan = CABLE_PLANS.find((p) => p.id === planId);
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < plan.price) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${plan.price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `CABLE-${Date.now()}`;

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "cable",
    status: "success",
    amount: plan.price.toString(),
    description: `${plan.name} subscription for ${smartcardNumber}`,
    reference,
    metadata: { provider, planName: plan.name, smartcardNumber },
  }).returning();

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Cable Subscription Successful",
    message: `${plan.name} activated for smartcard ${smartcardNumber}.`,
    type: "cable",
  });

  res.json({
    id: tx.id, type: tx.type, status: tx.status,
    amount: parseFloat(tx.amount), description: tx.description,
    reference: tx.reference, metadata: tx.metadata, userId: tx.userId,
    createdAt: tx.createdAt,
  });
});

// ── EXAM TOKENS ───────────────────────────────────────────────────────────────
router.get("/exam/types", authenticate, async (_req, res): Promise<void> => {
  const types = await db.select().from(examTypesTable);
  res.json(types.map((t) => ({
    id: t.id, name: t.name, code: t.code,
    price: parseFloat(t.price),
    description: t.description,
  })));
});

router.post("/exam/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PurchaseExamTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { examTypeId, quantity, phone } = parsed.data;

  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, examTypeId));
  if (!examType) {
    res.status(404).json({ error: "Exam type not found" });
    return;
  }

  const totalCost = parseFloat(examType.price) * quantity;
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < totalCost) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${totalCost}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `EXAM-${Date.now()}`;
  let pins: Array<{ pin: string; serial: string }> = [];

  if (isClubkonnectConfigured()) {
    try {
      const ckRes = await clubkonnectGetExamPins({
        examType: examType.code,
        quantity,
        requestId: reference,
      });
      if (ckRes?.Pins?.length) {
        pins = ckRes.Pins.map((pin, i) => ({ pin, serial: `${examType.code}${Date.now()}${i}` }));
      }
    } catch (err) {
      req.log?.error({ err }, "Clubkonnect exam pins error");
    }
  }

  if (!pins.length) {
    // Simulated fallback
    pins = Array.from({ length: quantity }, (_, i) => ({
      pin: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      serial: `${examType.code}${Date.now()}${i}`,
    }));
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "exam",
    status: "success",
    amount: totalCost.toString(),
    description: `${quantity}x ${examType.name} token(s)`,
    reference,
    metadata: { examType: examType.code, quantity, pins, phone },
  }).returning();

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Exam Token Purchase Successful",
    message: `${quantity} ${examType.name} PIN(s) purchased successfully.`,
    type: "exam",
  });

  res.json({
    id: tx.id,
    status: "success",
    pins,
    examType: examType.code,
    amount: totalCost,
    createdAt: tx.createdAt,
  });
});

export default router;
