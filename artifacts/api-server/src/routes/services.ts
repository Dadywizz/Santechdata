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
  isEasyAccessConfigured,
  eaPurchaseData,
  eaVerifyMeter,
  eaPayElectricity,
  eaPayTV,
  eaPurchaseExam,
} from "../lib/providers/easyaccess";

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

  if (!isEasyAccessConfigured()) {
    res.status(503).json({ error: "Data service is temporarily unavailable. Please contact support." });
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
    const eaRes = await eaPurchaseData({
      network: plan.network,
      planId: plan.providerCode,
      phone,
    });
    delivered = eaRes.success;
    req.log?.info({ eaRes }, "EasyAccess data purchase response");
  } catch (err) {
    req.log?.error({ err }, "EasyAccess data purchase error");
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
// Airtime is not currently available. Route kept so the API contract remains valid.
router.post("/airtime/purchase", authenticate, async (_req: AuthRequest, res): Promise<void> => {
  res.status(503).json({ error: "Airtime is not currently available. Please check back later or contact support on 09026329296." });
});

// ── ELECTRICITY ───────────────────────────────────────────────────────────────
// EasyAccess company codes: 1=Ikeja 2=Eko 3=Abuja 4=Kaduna 5=PHC 6=Ibadan 7=Enugu 8=Jos 9=Benin 10=Kano 11=Yola 12=Aba
const ELECTRICITY_PROVIDERS = [
  { id: "ikeja-electric",        name: "Ikeja Electric (IKEDC)"         },
  { id: "eko-electric",          name: "Eko Electric (EKEDC)"           },
  { id: "abuja-electric",        name: "Abuja Electric (AEDC)"          },
  { id: "kaduna-electric",       name: "Kaduna Electric (KAEDCO)"       },
  { id: "portharcourt-electric", name: "Port Harcourt Electric (PHED)"  },
  { id: "ibadan-electric",       name: "Ibadan Electric (IBEDC)"        },
  { id: "enugu-electric",        name: "Enugu Electric (EEDC)"          },
  { id: "jos-electric",          name: "Jos Electric (JED)"             },
  { id: "benin-electric",        name: "Benin Electric (BEDC)"          },
  { id: "kano-electric",         name: "Kano Electric (KEDCO)"          },
  { id: "yola-electric",         name: "Yola Electric (YEDC)"           },
  { id: "aba-electric",          name: "Aba Electric (APLE)"            },
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

  if (!isEasyAccessConfigured()) {
    res.json({ meterNumber, name: "Customer", address: "" });
    return;
  }

  try {
    const result = await eaVerifyMeter({
      companyCode: providerCode.toLowerCase(),
      meterType: meterType ?? "prepaid",
      meterNo: meterNumber,
    });
    res.json({
      meterNumber,
      name: result.name || "Customer",
      address: result.address || "",
    });
  } catch (err) {
    req.log?.error({ err }, "EasyAccess meter verify error");
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

  if (!isEasyAccessConfigured()) {
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
  let elecToken = "";
  let delivered = false;

  try {
    const eaRes = await eaPayElectricity({
      companyCode: providerCode.toLowerCase(),
      meterType: meterType ?? "prepaid",
      meterNo: meterNumber,
      amount,
    });
    delivered = eaRes.success;
    elecToken = eaRes.token;
    req.log?.info({ eaRes }, "EasyAccess electricity purchase response");
  } catch (err) {
    req.log?.error({ err }, "EasyAccess electricity purchase error");
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
    metadata: { meterNumber, providerCode, meterType, token: elecToken, phone },
  }).returning();

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Electricity Token Purchased",
    message: `Token: ${elecToken} for meter ${meterNumber}`,
    type: "electricity",
  });

  res.json({ id: tx.id, status: "success", token: elecToken, amount, meterNumber, createdAt: tx.createdAt });
});

// ── CABLE TV ──────────────────────────────────────────────────────────────────
// EasyAccess plan_ids from GET /get-plans?product_type=dstv|gotv|startimes
const CABLE_PROVIDERS = [
  { id: "dstv",       name: "DStv"      },
  { id: "gotv",       name: "GOtv"      },
  { id: "startimes",  name: "StarTimes" },
];

const CABLE_PLANS = [
  // DStv (EasyAccess company=1)
  { id: "dstv-90",  provider: "dstv",      name: "DStv Padi",              price: 4399,  validity: "Monthly", eaPlanId: 90  },
  { id: "dstv-91",  provider: "dstv",      name: "DStv Yanga",             price: 5999,  validity: "Monthly", eaPlanId: 91  },
  { id: "dstv-92",  provider: "dstv",      name: "DStv Confam",            price: 10999, validity: "Monthly", eaPlanId: 92  },
  { id: "dstv-93",  provider: "dstv",      name: "DStv Compact",           price: 18999, validity: "Monthly", eaPlanId: 93  },
  { id: "dstv-105", provider: "dstv",      name: "DStv Compact Plus",      price: 29999, validity: "Monthly", eaPlanId: 105 },
  { id: "dstv-106", provider: "dstv",      name: "DStv Premium",           price: 44499, validity: "Monthly", eaPlanId: 106 },
  // GOtv (EasyAccess company=2)
  { id: "gotv-94",  provider: "gotv",      name: "GOtv Smallie",           price: 1899,  validity: "Monthly", eaPlanId: 94  },
  { id: "gotv-97",  provider: "gotv",      name: "GOtv Jinja",             price: 3899,  validity: "Monthly", eaPlanId: 97  },
  { id: "gotv-96",  provider: "gotv",      name: "GOtv Jolli",             price: 5799,  validity: "Monthly", eaPlanId: 96  },
  { id: "gotv-95",  provider: "gotv",      name: "GOtv Max",               price: 8499,  validity: "Monthly", eaPlanId: 95  },
  { id: "gotv-112", provider: "gotv",      name: "GOtv Supa",              price: 11399, validity: "Monthly", eaPlanId: 112 },
  { id: "gotv-113", provider: "gotv",      name: "GOtv Supa Plus",         price: 16799, validity: "Monthly", eaPlanId: 113 },
  // StarTimes (EasyAccess company=3)
  { id: "st-100",   provider: "startimes", name: "StarTimes Nova (Antenna) Monthly",   price: 2099,  validity: "Monthly", eaPlanId: 100 },
  { id: "st-139",   provider: "startimes", name: "StarTimes Nova (Dish) Monthly",      price: 2099,  validity: "Monthly", eaPlanId: 139 },
  { id: "st-101",   provider: "startimes", name: "StarTimes Basic (Antenna) Monthly",  price: 3999,  validity: "Monthly", eaPlanId: 101 },
  { id: "st-102",   provider: "startimes", name: "StarTimes Basic (Dish) Monthly",     price: 5099,  validity: "Monthly", eaPlanId: 102 },
  { id: "st-103",   provider: "startimes", name: "StarTimes Classic (Antenna) Monthly",price: 5999,  validity: "Monthly", eaPlanId: 103 },
  { id: "st-140",   provider: "startimes", name: "StarTimes Classic (Dish) Monthly",   price: 7399,  validity: "Monthly", eaPlanId: 140 },
  { id: "st-104",   provider: "startimes", name: "StarTimes Super (Antenna) Monthly",  price: 9499,  validity: "Monthly", eaPlanId: 104 },
  { id: "st-141",   provider: "startimes", name: "StarTimes Super (Dish) Monthly",     price: 9799,  validity: "Monthly", eaPlanId: 141 },
];

router.get("/cable/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(CABLE_PROVIDERS);
});

router.get("/cable/plans", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCablePlansQueryParams.safeParse(req.query);
  const filtered = params.success && params.data.provider
    ? CABLE_PLANS.filter((p) => p.provider === (params.data.provider ?? "").toLowerCase())
    : CABLE_PLANS;
  res.json(filtered.map(({ eaPlanId: _e, ...p }) => p));
});

router.post("/cable/verify-smartcard", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifySmartcardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { smartcardNumber } = parsed.data;
  // EasyAccess does not have a smartcard verify endpoint — return minimal info
  res.json({ smartcardNumber, name: "Customer", currentPlan: "", dueDate: "" });
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

  if (!isEasyAccessConfigured()) {
    res.status(503).json({ error: "Cable TV service is temporarily unavailable. Please contact support." });
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
    const eaRes = await eaPayTV({
      provider: plan.provider,
      packageId: plan.eaPlanId,
      iucNo: smartcardNumber,
    });
    delivered = eaRes.success;
    req.log?.info({ eaRes }, "EasyAccess cable subscribe response");
  } catch (err) {
    req.log?.error({ err }, "EasyAccess cable subscribe error");
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
// EasyAccess exam plan_ids: WAEC=1 (₦5069), NECO=2 (₦2099), NABTEB=3 (₦867)
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

  if (!isEasyAccessConfigured()) {
    res.status(503).json({ error: "Exam token service is temporarily unavailable. Please contact support." });
    return;
  }

  const code = examType.code.toLowerCase();
  const supportedBoards = ["waec", "neco", "nabteb"];
  if (!supportedBoards.some((b) => code.includes(b))) {
    res.status(503).json({
      error: `${examType.name} tokens are not yet available. Please contact support on 09026329296.`,
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

  // Determine exam board key for EasyAccess
  let examBoard = "waec";
  if (code.includes("neco")) examBoard = "neco";
  else if (code.includes("nabteb")) examBoard = "nabteb";

  try {
    const eaRes = await eaPurchaseExam({ examBoard, count: quantity });
    delivered = eaRes.success;
    pins = eaRes.pins;
    req.log?.info({ eaRes }, "EasyAccess exam purchase response");
  } catch (err) {
    req.log?.error({ err }, "EasyAccess exam purchase error");
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
