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
  vtpassPurchaseData,
  vtpassPurchaseAirtime,
  vtpassVerifyMeter,
  vtpassPayElectricity,
  vtpassVerifySmartcard,
  vtpassCableSubscribe,
  vtpassPurchaseExam,
  isVtpassConfigured,
} from "../lib/providers/vtpass";

const router: IRouter = Router();

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

  if (!isVtpassConfigured()) {
    res.status(503).json({ error: "VTU service is temporarily unavailable. Please contact support." });
    return;
  }

  if (!plan.providerCode) {
    res.status(503).json({ error: "This data plan is not yet configured. Please contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  const price = parseFloat(plan.price);
  if (parseFloat(wallet.balance) < price) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `DATA-${Date.now()}`;
  let delivered = false;

  try {
    const vtRes = await vtpassPurchaseData({
      network: plan.network,
      phone,
      variationCode: plan.providerCode,
      amount: price,
    });
    delivered = vtRes?.code === "000";
    req.log?.info({ vtRes }, "VTpass data purchase response");
  } catch (err) {
    req.log?.error({ err }, "VTpass data purchase error");
  }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "data",
      status: "failed",
      amount: price.toString(),
      description: `${plan.network} ${plan.size} data for ${phone} — delivery failed`,
      reference,
      metadata: { network: plan.network, size: plan.size, validity: plan.validity, phone },
    });

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Data Purchase Failed",
      message: `Your ₦${price} data purchase failed. Your wallet has been refunded.`,
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

  if (!isVtpassConfigured()) {
    res.status(503).json({ error: "Airtime service is temporarily unavailable. Please contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `AIR-${Date.now()}`;
  let delivered = false;

  try {
    const vtRes = await vtpassPurchaseAirtime({ network, phone, amount });
    delivered = vtRes?.code === "000";
    req.log?.info({ vtRes }, "VTpass airtime purchase response");
  } catch (err) {
    req.log?.error({ err }, "VTpass airtime purchase error");
  }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "airtime",
      status: "failed",
      amount: amount.toString(),
      description: `${network} ₦${amount} airtime for ${phone} — delivery failed`,
      reference,
      metadata: { network, phone },
    });

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Airtime Purchase Failed",
      message: `Your ₦${amount} airtime purchase failed. Your wallet has been refunded.`,
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
// VTpass electricity service IDs
const ELECTRICITY_PROVIDERS = [
  { id: "ikeja-electric",         name: "Ikeja Electric (IKEDC)"         },
  { id: "eko-electric",           name: "Eko Electric (EKEDC)"           },
  { id: "abuja-electric",         name: "Abuja Electric (AEDC)"          },
  { id: "kano-electric",          name: "Kano Electric (KEDCO)"          },
  { id: "portharcourt-electric",  name: "Port Harcourt Electric (PHED)"  },
  { id: "jos-electric",           name: "Jos Electric (JED)"             },
  { id: "kaduna-electric",        name: "Kaduna Electric (KAEDCO)"       },
  { id: "enugu-electric",         name: "Enugu Electric (EEDC)"          },
  { id: "ibadan-electric",        name: "Ibadan Electric (IBEDC)"        },
  { id: "benin-electric",         name: "Benin Electric (BEDC)"          },
  { id: "aba-electric",           name: "Aba Electric (APLE)"            },
  { id: "yola-electric",          name: "Yola Electric (YEDC)"           },
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

  if (!isVtpassConfigured()) {
    res.json({ meterNumber, name: "Customer", address: "" });
    return;
  }

  // providerCode from frontend is the VTpass serviceID (e.g. "abuja-electric")
  const serviceID = providerCode.toLowerCase();

  try {
    const vtRes = await vtpassVerifyMeter({ serviceID, meterNumber, meterType });
    const ok = vtRes?.code === "000" && vtRes?.content?.Customer_Name;
    res.json({
      meterNumber,
      name: ok ? (vtRes.content!.Customer_Name ?? "Customer") : "Customer",
      address: ok ? (vtRes.content!.Address ?? "") : "",
    });
  } catch (err) {
    req.log?.error({ err }, "VTpass meter verify error");
    res.json({ meterNumber, name: "Customer", address: "" });
  }
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

  if (!isVtpassConfigured()) {
    res.status(503).json({ error: "Electricity service is temporarily unavailable. Please contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `ELEC-${Date.now()}`;
  const serviceID = providerCode.toLowerCase();

  let token = "";
  let delivered = false;
  try {
    const vtRes = await vtpassPayElectricity({ serviceID, meterNumber, meterType, amount, phone });
    delivered = vtRes?.code === "000";
    const txns = vtRes?.content as { transactions?: { token?: string } } | undefined;
    token = txns?.transactions?.token ?? "";
    req.log?.info({ vtRes }, "VTpass electricity purchase response");
  } catch (err) {
    req.log?.error({ err }, "VTpass electricity purchase error");
  }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "electricity",
      status: "failed",
      amount: amount.toString(),
      description: `Electricity for meter ${meterNumber} — delivery failed`,
      reference,
      metadata: { meterNumber, providerCode, meterType, phone },
    });

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Electricity Purchase Failed",
      message: `Your ₦${amount} electricity purchase failed. Your wallet has been refunded.`,
      type: "electricity",
    });

    res.status(502).json({ error: "Electricity token delivery failed. Your wallet has been refunded." });
    return;
  }

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
// VTpass cable service IDs and plans
// DStv / GOtv are NOT available on this VTpass account — only StarTimes works.
const CABLE_PROVIDERS = [
  { id: "startimes", name: "StarTimes" },
  { id: "dstv",      name: "DStv"      },
  { id: "gotv",      name: "GOtv"      },
];

// StarTimes plans use VTpass variation codes. DStv/GOtv prices shown for info but won't deliver.
const CABLE_PLANS = [
  // StarTimes (vtpass serviceID: startimes)
  { id: "st-nova-m",    provider: "startimes", name: "StarTimes Nova (Monthly)",    price: 2100,  validity: "Monthly", vtCode: "nova"    },
  { id: "st-basic-m",   provider: "startimes", name: "StarTimes Basic (Monthly)",   price: 4000,  validity: "Monthly", vtCode: "basic"   },
  { id: "st-smart-m",   provider: "startimes", name: "StarTimes Smart (Monthly)",   price: 5100,  validity: "Monthly", vtCode: "smart"   },
  { id: "st-classic-m", provider: "startimes", name: "StarTimes Classic (Monthly)", price: 6000,  validity: "Monthly", vtCode: "classic" },
  { id: "st-super-m",   provider: "startimes", name: "StarTimes Super (Monthly)",   price: 9800,  validity: "Monthly", vtCode: "super"   },
  { id: "st-nova-w",    provider: "startimes", name: "StarTimes Nova (Weekly)",     price: 700,   validity: "Weekly",  vtCode: "nova-weekly"    },
  { id: "st-basic-w",   provider: "startimes", name: "StarTimes Basic (Weekly)",    price: 1400,  validity: "Weekly",  vtCode: "basic-weekly"   },
  { id: "st-classic-w", provider: "startimes", name: "StarTimes Classic (Weekly)",  price: 2000,  validity: "Weekly",  vtCode: "classic-weekly" },
  { id: "st-super-w",   provider: "startimes", name: "StarTimes Super (Weekly)",    price: 3300,  validity: "Weekly",  vtCode: "super-weekly"   },
  // DStv — prices for display only; require DStv-enabled VTpass account
  { id: "dstv-access",       provider: "dstv", name: "DStv Access",       price: 5000,  validity: "Monthly", vtCode: "dstv-access"       },
  { id: "dstv-compact",      provider: "dstv", name: "DStv Compact",      price: 15700, validity: "Monthly", vtCode: "dstv-compact"      },
  { id: "dstv-compact-plus", provider: "dstv", name: "DStv Compact Plus", price: 25000, validity: "Monthly", vtCode: "dstv-compact-plus" },
  { id: "dstv-premium",      provider: "dstv", name: "DStv Premium",      price: 37000, validity: "Monthly", vtCode: "dstv-premium"      },
  // GOtv
  { id: "gotv-lite",  provider: "gotv", name: "GOtv Lite",  price: 1575, validity: "Monthly", vtCode: "gotv-lite"  },
  { id: "gotv-jolli", provider: "gotv", name: "GOtv Jolli", price: 2460, validity: "Monthly", vtCode: "gotv-jolli" },
  { id: "gotv-max",   provider: "gotv", name: "GOtv Max",   price: 4150, validity: "Monthly", vtCode: "gotv-max"   },
  { id: "gotv-supa",  provider: "gotv", name: "GOtv Supa",  price: 6400, validity: "Monthly", vtCode: "gotv-supa"  },
];

router.get("/cable/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(CABLE_PROVIDERS);
});

router.get("/cable/plans", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCablePlansQueryParams.safeParse(req.query);
  const filtered = params.success && params.data.provider
    ? CABLE_PLANS.filter((p) => p.provider === (params.data.provider ?? "").toLowerCase())
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

  if (!isVtpassConfigured()) {
    res.json({ smartcardNumber, name: "Customer", currentPlan: "", dueDate: "" });
    return;
  }

  const serviceID = (provider ?? "startimes").toLowerCase();

  try {
    const vtRes = await vtpassVerifySmartcard({ serviceID, smartcardNumber });
    const ok = vtRes?.code === "000" && vtRes?.content?.Customer_Name;
    res.json({
      smartcardNumber,
      name: ok ? (vtRes.content!.Customer_Name ?? "Customer") : "Customer",
      currentPlan: "",
      dueDate: "",
    });
  } catch (err) {
    req.log?.error({ err }, "VTpass smartcard verify error");
    res.json({ smartcardNumber, name: "Customer", currentPlan: "", dueDate: "" });
  }
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

  if (!isVtpassConfigured()) {
    res.status(503).json({ error: "Cable TV service is temporarily unavailable. Please contact support." });
    return;
  }

  const serviceID = plan.provider.toLowerCase();

  if (serviceID !== "startimes") {
    res.status(503).json({
      error: `${plan.provider === "dstv" ? "DStv" : "GOtv"} subscriptions are not yet available on this platform. Please use StarTimes or contact support.`,
    });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < plan.price) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${plan.price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `CABLE-${Date.now()}`;
  let delivered = false;

  try {
    const vtRes = await vtpassCableSubscribe({
      serviceID,
      smartcardNumber,
      variationCode: plan.vtCode,
      amount: plan.price,
      phone: smartcardNumber,
    });
    delivered = vtRes?.code === "000";
    req.log?.info({ vtRes }, "VTpass cable subscribe response");
  } catch (err) {
    req.log?.error({ err }, "VTpass cable subscribe error");
  }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${plan.price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "cable",
      status: "failed",
      amount: plan.price.toString(),
      description: `${plan.name} for ${smartcardNumber} — delivery failed`,
      reference,
      metadata: { provider, planName: plan.name, smartcardNumber },
    });

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Cable Subscription Failed",
      message: `Your ${plan.name} subscription failed. Your wallet has been refunded.`,
      type: "cable",
    });

    res.status(502).json({ error: "Cable subscription failed. Your wallet has been refunded." });
    return;
  }

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

  if (!isVtpassConfigured()) {
    res.status(503).json({ error: "Exam token service is temporarily unavailable. Please contact support." });
    return;
  }

  const code = examType.code.toUpperCase();
  if (!code.includes("WAEC")) {
    res.status(503).json({
      error: `${examType.name} tokens are not yet available on this platform. Please contact support on 09026329296.`,
    });
    return;
  }

  const totalCost = parseFloat(examType.price) * quantity;
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < totalCost) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${totalCost}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `EXAM-${Date.now()}`;
  let pins: Array<{ pin: string; serial: string }> = [];
  let delivered = false;

  try {
    const vtRes = await vtpassPurchaseExam({ examCode: examType.code, quantity, phone, amount: totalCost });
    delivered = vtRes?.code === "000";
    req.log?.info({ vtRes }, "VTpass exam purchase response");

    const rawOut = (vtRes?.content as Record<string, unknown> | undefined)?.rawOutput as string | undefined;
    if (delivered && rawOut) {
      pins = [{ pin: rawOut, serial: `${examType.code}${Date.now()}` }];
    }
  } catch (err) {
    req.log?.error({ err }, "VTpass exam purchase error");
  }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${totalCost}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "exam",
      status: "failed",
      amount: totalCost.toString(),
      description: `${quantity}x ${examType.name} token(s) — delivery failed`,
      reference,
      metadata: { examType: examType.code, quantity, phone },
    });

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Exam Token Purchase Failed",
      message: `Your ${examType.name} token purchase failed. Your wallet has been refunded.`,
      type: "exam",
    });

    res.status(502).json({ error: "Exam token delivery failed. Your wallet has been refunded. Please contact support." });
    return;
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
