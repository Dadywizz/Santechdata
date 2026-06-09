import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import {
  dataPlansTable, transactionsTable, walletsTable, notificationsTable,
  examTypesTable, settingsTable,
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
  isKybdataConfigured,
  kybdataPurchaseAirtime,
  kybdataPurchaseData,
  kybdataVerifyMeter,
  kybdataPurchaseElectricity,
  kybdataPurchaseCable,
  kybdataVerifySmartcard,
  kybdataPurchaseExam,
} from "../lib/providers/kybdata";

const KYB_ELEC_DISCO_ID: Record<string, string> = {
  "ikeja-electric": "1", "eko-electric": "2", "abuja-electric": "3",
  "kaduna-electric": "4", "portharcourt-electric": "5", "ibadan-electric": "6",
  "enugu-electric": "7", "jos-electric": "8", "benin-electric": "9",
  "kano-electric": "10", "yola-electric": "11", "aba-electric": "12",
};

const router: IRouter = Router();

// ── PUBLIC SETTINGS ───────────────────────────────────────────────────────────
router.get("/settings/public", async (_req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  const obj: Record<string, string> = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json({
    announcement: obj.announcement ?? "",
    announcementActive: obj.announcementActive === "true",
    bankTransferActive: obj.bankTransferActive === "true",
    bankAccountNumber: obj.bankAccountNumber ?? "",
    bankAccountName: obj.bankAccountName ?? "",
    bankName: obj.bankName ?? "",
  });
});

// ── DATA ──────────────────────────────────────────────────────────────────────
router.get("/data/plans", async (req: Request, res): Promise<void> => {
  const params = GetDataPlansQueryParams.safeParse(req.query);
  const plans = await db.select().from(dataPlansTable).where(eq(dataPlansTable.isActive, true));
  const filtered = params.success && params.data.network
    ? plans.filter((p) => p.network === params.data.network)
    : plans;
  res.json(filtered.map((p) => ({
    id: p.id, network: p.network, name: p.name, size: p.size,
    validity: p.validity, price: parseFloat(p.price),
    costPrice: parseFloat(p.costPrice), providerCode: p.providerCode, isActive: p.isActive,
  })));
});

router.post("/data/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PurchaseDataBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { planId, phone } = parsed.data;

  const [plan] = await db.select().from(dataPlansTable).where(eq(dataPlansTable.id, planId));
  if (!plan || !plan.isActive) { res.status(404).json({ error: "Data plan not found or unavailable" }); return; }
  if (!plan.providerCode) { res.status(503).json({ error: "This data plan is not yet configured. Please contact support." }); return; }
  if (!isKybdataConfigured()) { res.status(503).json({ error: "Service temporarily unavailable. Please try again later." }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  const price = parseFloat(plan.price);
  if (parseFloat(wallet.balance) < price) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." }); return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
  const reference = `DATA-${Date.now()}`;
  let delivered = false;

  try {
    const r = await kybdataPurchaseData({ plan: plan.providerCode, mobile_number: phone });
    req.log?.info({ r }, "KYB Data purchase response");
    const success = (r as any).success === true;
    const st = String((r as any).status ?? "").toLowerCase();
    const msg = String(r.message ?? "").toLowerCase();
    delivered = success || st === "success" || st === "200" || st === "00"
      || msg.includes("success") || msg.includes("successful") || msg.includes("delivered");
  } catch (err) { req.log?.error({ err }, "Data purchase error"); }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "data", status: "failed", amount: price.toString(),
      description: `${plan.network} ${plan.size} data for ${phone} — delivery failed`, reference,
      metadata: { network: plan.network, size: plan.size, validity: plan.validity, phone },
    });
    await db.insert(notificationsTable).values({
      userId: req.userId!, title: "Data Purchase Failed",
      message: `Your ₦${price} data purchase failed. Your wallet has been refunded.`, type: "data",
    });
    res.status(502).json({ error: "Data delivery failed. Your wallet has been refunded. Please try again or contact support." }); return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!, type: "data", status: "success", amount: price.toString(),
    description: `${plan.network} ${plan.size} data for ${phone}`, reference,
    metadata: { network: plan.network, size: plan.size, validity: plan.validity, phone },
  }).returning();
  await db.insert(notificationsTable).values({
    userId: req.userId!, title: "Data Purchase Successful",
    message: `${plan.network} ${plan.size} data has been sent to ${phone}.`, type: "data",
  });
  res.json({ id: tx.id, type: tx.type, status: tx.status, amount: parseFloat(tx.amount), description: tx.description, reference: tx.reference, metadata: tx.metadata, userId: tx.userId, createdAt: tx.createdAt });
});

// ── AIRTIME ───────────────────────────────────────────────────────────────────
router.post("/airtime/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  // KYB Data does not currently support airtime on this account — block all attempts
  res.status(503).json({ error: "Airtime recharge is temporarily unavailable. Please contact support on 09026329296." }); return;

  const parsed = PurchaseAirtimeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { network, phone, amount } = parsed.data;

  if (!isKybdataConfigured()) { res.status(503).json({ error: "Service temporarily unavailable. Please try again later." }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." }); return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
  const reference = `AIRTIME-${Date.now()}`;
  let delivered = false;

  try {
    const r = await kybdataPurchaseAirtime({ network, amount, mobile_number: phone });
    req.log?.info({ r }, "KYB Data airtime response");
    const success = (r as any).success === true;
    const st = String((r as any).status ?? "").toLowerCase();
    const msg = String(r.message ?? "").toLowerCase();
    delivered = success || st === "success" || st === "200" || st === "00"
      || msg.includes("success") || msg.includes("successful") || msg.includes("delivered");
  } catch (err) { req.log?.error({ err }, "Airtime purchase error"); }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "airtime", status: "failed", amount: amount.toString(),
      description: `${network} ₦${amount} airtime for ${phone} — delivery failed`, reference,
      metadata: { network, phone, amount },
    });
    await db.insert(notificationsTable).values({
      userId: req.userId!, title: "Airtime Purchase Failed",
      message: `₦${amount} ${network} airtime failed. Your wallet has been refunded.`, type: "airtime",
    });
    res.status(502).json({ error: "Airtime delivery failed. Your wallet has been refunded. Please try again or contact support." }); return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!, type: "airtime", status: "success", amount: amount.toString(),
    description: `${network} ₦${amount} airtime for ${phone}`, reference,
    metadata: { network, phone, amount },
  }).returning();
  await db.insert(notificationsTable).values({
    userId: req.userId!, title: "Airtime Purchase Successful",
    message: `₦${amount} ${network} airtime has been sent to ${phone}.`, type: "airtime",
  });
  res.json({ id: tx.id, type: tx.type, status: tx.status, amount: parseFloat(tx.amount), description: tx.description, reference: tx.reference, metadata: tx.metadata, userId: tx.userId, createdAt: tx.createdAt });
});

// ── ELECTRICITY ───────────────────────────────────────────────────────────────
const ELECTRICITY_PROVIDERS = [
  { id: "ikeja-electric",        name: "Ikeja Electric (IKEDC)"        },
  { id: "eko-electric",          name: "Eko Electric (EKEDC)"          },
  { id: "abuja-electric",        name: "Abuja Electric (AEDC)"         },
  { id: "kaduna-electric",       name: "Kaduna Electric (KAEDCO)"      },
  { id: "portharcourt-electric", name: "Port Harcourt Electric (PHED)" },
  { id: "ibadan-electric",       name: "Ibadan Electric (IBEDC)"       },
  { id: "enugu-electric",        name: "Enugu Electric (EEDC)"         },
  { id: "jos-electric",          name: "Jos Electric (JED)"            },
  { id: "benin-electric",        name: "Benin Electric (BEDC)"         },
  { id: "kano-electric",         name: "Kano Electric (KEDCO)"         },
  { id: "yola-electric",         name: "Yola Electric (YEDC)"          },
  { id: "aba-electric",          name: "Aba Electric (APLE)"           },
];

router.get("/electricity/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(ELECTRICITY_PROVIDERS);
});

router.post("/electricity/verify-meter", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifyMeterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { meterNumber, providerCode, meterType } = parsed.data;
  try {
    if (isKybdataConfigured()) {
      const discoId = KYB_ELEC_DISCO_ID[providerCode.toLowerCase()] ?? "1";
      const r = await kybdataVerifyMeter({ meter_number: meterNumber, discoid: discoId, meter_type: meterType ?? "prepaid" });
      res.json({ meterNumber, name: r.customer_name || "Customer", address: r.address || "" }); return;
    }
  } catch (err) { req.log?.error({ err }, "Meter verify error"); }
  res.json({ meterNumber, name: "Customer", address: "" });
});

router.post("/electricity/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PurchaseElectricityBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { meterNumber, providerCode, meterType, amount, phone } = parsed.data;

  if (amount < 500) { res.status(400).json({ error: "Minimum electricity purchase is ₦500" }); return; }
  if (!isKybdataConfigured()) { res.status(503).json({ error: "Service temporarily unavailable. Please try again later." }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." }); return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
  const reference = `ELEC-${Date.now()}`;
  let elecToken = "";
  let delivered = false;

  try {
    const discoId = KYB_ELEC_DISCO_ID[providerCode.toLowerCase()] ?? "1";
    const r = await kybdataPurchaseElectricity({ discoid: discoId, MeterType: meterType ?? "prepaid", meter_number: meterNumber, amount });
    req.log?.info({ r }, "KYB Data electricity response");
    const success = (r as any).success === true;
    const st = String((r as any).status ?? "").toLowerCase();
    const msg = String(r.message ?? "").toLowerCase();
    delivered = success || st === "success" || st === "200" || st === "00"
      || msg.includes("success") || msg.includes("successful") || msg.includes("delivered");
    elecToken = r.token ?? (r as any).data?.token ?? "";
  } catch (err) { req.log?.error({ err }, "Electricity purchase error"); }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "electricity", status: "failed", amount: amount.toString(),
      description: `Electricity for meter ${meterNumber} — delivery failed`, reference,
      metadata: { meterNumber, providerCode, meterType, phone },
    });
    await db.insert(notificationsTable).values({
      userId: req.userId!, title: "Electricity Purchase Failed",
      message: `Your ₦${amount} electricity purchase failed. Your wallet has been refunded.`, type: "electricity",
    });
    res.status(502).json({ error: "Electricity token delivery failed. Your wallet has been refunded." }); return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!, type: "electricity", status: "success", amount: amount.toString(),
    description: `Electricity token for meter ${meterNumber}`, reference,
    metadata: { meterNumber, providerCode, meterType, token: elecToken, phone },
  }).returning();
  await db.insert(notificationsTable).values({
    userId: req.userId!, title: "Electricity Token Purchased",
    message: `Token: ${elecToken} for meter ${meterNumber}`, type: "electricity",
  });
  res.json({ id: tx.id, status: "success", token: elecToken, amount, meterNumber, createdAt: tx.createdAt });
});

// ── CABLE TV ──────────────────────────────────────────────────────────────────
const CABLE_PROVIDERS = [
  { id: "dstv",      name: "DStv"      },
  { id: "gotv",      name: "GOtv"      },
  { id: "startimes", name: "StarTimes" },
];

const CABLE_PLANS = [
  { id: "dstv-90",  provider: "dstv",      name: "DStv Padi",                          price: 4399,  validity: "Monthly", kybPlanId: 90  },
  { id: "dstv-91",  provider: "dstv",      name: "DStv Yanga",                         price: 5999,  validity: "Monthly", kybPlanId: 91  },
  { id: "dstv-92",  provider: "dstv",      name: "DStv Confam",                        price: 10999, validity: "Monthly", kybPlanId: 92  },
  { id: "dstv-93",  provider: "dstv",      name: "DStv Compact",                       price: 18999, validity: "Monthly", kybPlanId: 93  },
  { id: "dstv-105", provider: "dstv",      name: "DStv Compact Plus",                  price: 29999, validity: "Monthly", kybPlanId: 105 },
  { id: "dstv-106", provider: "dstv",      name: "DStv Premium",                       price: 44499, validity: "Monthly", kybPlanId: 106 },
  { id: "gotv-94",  provider: "gotv",      name: "GOtv Smallie",                       price: 1899,  validity: "Monthly", kybPlanId: 94  },
  { id: "gotv-97",  provider: "gotv",      name: "GOtv Jinja",                         price: 3899,  validity: "Monthly", kybPlanId: 97  },
  { id: "gotv-96",  provider: "gotv",      name: "GOtv Jolli",                         price: 5799,  validity: "Monthly", kybPlanId: 96  },
  { id: "gotv-95",  provider: "gotv",      name: "GOtv Max",                           price: 8499,  validity: "Monthly", kybPlanId: 95  },
  { id: "gotv-112", provider: "gotv",      name: "GOtv Supa",                          price: 11399, validity: "Monthly", kybPlanId: 112 },
  { id: "gotv-113", provider: "gotv",      name: "GOtv Supa Plus",                     price: 16799, validity: "Monthly", kybPlanId: 113 },
  { id: "st-100",   provider: "startimes", name: "StarTimes Nova (Antenna) Monthly",   price: 2099,  validity: "Monthly", kybPlanId: 100 },
  { id: "st-139",   provider: "startimes", name: "StarTimes Nova (Dish) Monthly",      price: 2099,  validity: "Monthly", kybPlanId: 139 },
  { id: "st-101",   provider: "startimes", name: "StarTimes Basic (Antenna) Monthly",  price: 3999,  validity: "Monthly", kybPlanId: 101 },
  { id: "st-102",   provider: "startimes", name: "StarTimes Basic (Dish) Monthly",     price: 5099,  validity: "Monthly", kybPlanId: 102 },
  { id: "st-103",   provider: "startimes", name: "StarTimes Classic (Antenna) Monthly",price: 5999,  validity: "Monthly", kybPlanId: 103 },
  { id: "st-140",   provider: "startimes", name: "StarTimes Classic (Dish) Monthly",   price: 7399,  validity: "Monthly", kybPlanId: 140 },
  { id: "st-104",   provider: "startimes", name: "StarTimes Super (Antenna) Monthly",  price: 9499,  validity: "Monthly", kybPlanId: 104 },
  { id: "st-141",   provider: "startimes", name: "StarTimes Super (Dish) Monthly",     price: 9799,  validity: "Monthly", kybPlanId: 141 },
];

router.get("/cable/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(CABLE_PROVIDERS);
});

router.get("/cable/plans", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCablePlansQueryParams.safeParse(req.query);
  const provider = (params.success ? params.data.provider ?? "" : "").toLowerCase();
  const filtered = provider ? CABLE_PLANS.filter((p) => p.provider === provider) : CABLE_PLANS;
  res.json(filtered.map(({ kybPlanId: _k, ...p }) => p));
});

router.post("/cable/verify-smartcard", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifySmartcardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { smartcardNumber, provider } = parsed.data as { smartcardNumber: string; provider?: string };
  try {
    if (isKybdataConfigured() && provider) {
      const r = await kybdataVerifySmartcard({ smart_card_number: smartcardNumber, cable_name: provider });
      res.json({ smartcardNumber, name: r.customer_name || "Customer", currentPlan: r.current_plan || "", dueDate: "" }); return;
    }
  } catch (err) { req.log?.error({ err }, "Smartcard verify error"); }
  res.json({ smartcardNumber, name: "Customer", currentPlan: "", dueDate: "" });
});

router.post("/cable/subscribe", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubscribeCableBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { planId, smartcardNumber, provider } = parsed.data;

  const plan = CABLE_PLANS.find((p) => p.id === planId);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  if (!isKybdataConfigured()) { res.status(503).json({ error: "Service temporarily unavailable. Please try again later." }); return; }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < plan.price) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." }); return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${plan.price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
  const reference = `CABLE-${Date.now()}`;
  let delivered = false;

  try {
    const r = await kybdataPurchaseCable({ plan_id: plan.kybPlanId, smart_card_number: smartcardNumber });
    req.log?.info({ r }, "KYB Data cable response");
    const success = (r as any).success === true;
    const st = String((r as any).status ?? "").toLowerCase();
    const msg = String(r.message ?? "").toLowerCase();
    delivered = success || st === "success" || st === "200" || st === "00"
      || msg.includes("success") || msg.includes("successful") || msg.includes("delivered");
  } catch (err) { req.log?.error({ err }, "Cable subscribe error"); }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${plan.price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "cable", status: "failed", amount: plan.price.toString(),
      description: `${plan.name} for ${smartcardNumber} — delivery failed`, reference,
      metadata: { provider, planName: plan.name, smartcardNumber },
    });
    await db.insert(notificationsTable).values({
      userId: req.userId!, title: "Cable Subscription Failed",
      message: `Your ${plan.name} subscription failed. Your wallet has been refunded.`, type: "cable",
    });
    res.status(502).json({ error: "Cable subscription failed. Your wallet has been refunded." }); return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!, type: "cable", status: "success", amount: plan.price.toString(),
    description: `${plan.name} for ${smartcardNumber}`, reference,
    metadata: { provider, planName: plan.name, smartcardNumber },
  }).returning();
  await db.insert(notificationsTable).values({
    userId: req.userId!, title: "Cable Subscription Successful",
    message: `${plan.name} activated for smartcard ${smartcardNumber}.`, type: "cable",
  });
  res.json({ id: tx.id, type: tx.type, status: tx.status, amount: parseFloat(tx.amount), description: tx.description, reference: tx.reference, metadata: tx.metadata, userId: tx.userId, createdAt: tx.createdAt });
});

// ── EXAM TOKENS ───────────────────────────────────────────────────────────────
router.get("/exam/types", async (_req, res): Promise<void> => {
  const types = await db.select().from(examTypesTable);
  res.json(types.map((t) => ({ id: t.id, name: t.name, code: t.code, price: parseFloat(t.price), description: t.description })));
});

router.post("/exam/purchase", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = PurchaseExamTokenBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { examTypeId, quantity, phone } = parsed.data;

  const [examType] = await db.select().from(examTypesTable).where(eq(examTypesTable.id, examTypeId));
  if (!examType) { res.status(404).json({ error: "Exam type not found" }); return; }
  if (!isKybdataConfigured()) { res.status(503).json({ error: "Service temporarily unavailable. Please try again later." }); return; }

  // KYB Data numeric IDs for exam types
  const KYB_EXAM_IDS: Record<string, number> = { NECO: 19, WAEC: 34 };
  const kybExamId = KYB_EXAM_IDS[examType.code.toUpperCase()];
  if (!kybExamId) {
    res.status(503).json({ error: `${examType.code} tokens are not currently available. Please contact support on 09026329296.` }); return;
  }

  const totalCost = parseFloat(examType.price) * quantity;
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < totalCost) {
    res.status(400).json({ error: "Insufficient wallet balance. Please fund your wallet to continue." }); return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${totalCost}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
  const reference = `EXAM-${Date.now()}`;
  let pins: Array<{ pin: string; serial: string }> = [];
  let delivered = false;

  try {
    const r = await kybdataPurchaseExam({ examid: kybExamId, quantity });
    req.log?.info({ r }, "KYB Data exam response");
    // KYB returns { success: true/false, message, data }
    const success = (r as any).success === true;
    const st = String((r as any).status ?? "").toLowerCase();
    const msg = String(r.message ?? "").toLowerCase();
    delivered = success || st === "success" || st === "200" || st === "00"
      || msg.includes("success") || msg.includes("successful") || msg.includes("delivered");
    // Extract pins from response: may be in r.pins, r.data.pins, or r.data
    const pinsRaw = r.pins ?? (r as any).data?.pins ?? (r as any).data ?? [];
    if (delivered && Array.isArray(pinsRaw)) pins = pinsRaw.map((p: any) => ({ pin: String(p.pin ?? p.token ?? p), serial: String(p.serial ?? p.sn ?? "") }));
  } catch (err) { req.log?.error({ err }, "Exam purchase error"); }

  if (!delivered) {
    await db.update(walletsTable).set({ balance: sql`balance + ${totalCost}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "exam", status: "failed", amount: totalCost.toString(),
      description: `${quantity}x ${examType.name} token(s) — delivery failed`, reference,
      metadata: { examType: examType.code, quantity, phone },
    });
    await db.insert(notificationsTable).values({
      userId: req.userId!, title: "Exam Token Purchase Failed",
      message: `Your ${examType.name} token purchase failed. Your wallet has been refunded.`, type: "exam",
    });
    res.status(502).json({ error: "Exam token delivery failed. Your wallet has been refunded. Please contact support." }); return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!, type: "exam", status: "success", amount: totalCost.toString(),
    description: `${quantity}x ${examType.name} token(s)`, reference,
    metadata: { examType: examType.code, quantity, pins, phone },
  }).returning();
  await db.insert(notificationsTable).values({
    userId: req.userId!, title: "Exam Token Purchase Successful",
    message: `${quantity} ${examType.name} PIN(s) purchased successfully.`, type: "exam",
  });
  res.json({ id: tx.id, status: "success", pins, examType: examType.code, amount: totalCost, createdAt: tx.createdAt });
});

export default router;
