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
    res.status(503).json({ error: "VTU service is temporarily unavailable. Please try again later or contact support." });
    return;
  }

  if (!plan.providerCode) {
    res.status(503).json({ error: "This data plan is not yet configured for delivery. Please contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  const price = parseFloat(plan.price);
  const costPrice = parseFloat(plan.costPrice);
  if (parseFloat(wallet.balance) < price) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `DATA-${Date.now()}`;

  let delivered = false;
  try {
    const vtRes = await vtpassPurchaseData({
      requestId: reference,
      network: plan.network,
      phone,
      variationCode: plan.providerCode,
      amount: costPrice,
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

  if (!isVtpassConfigured()) {
    res.status(503).json({ error: "VTU service is temporarily unavailable. Please try again later or contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `AIR-${Date.now()}`;

  let delivered = false;
  try {
    const vtRes = await vtpassPurchaseAirtime({
      requestId: reference,
      network,
      phone,
      amount,
    });
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
// VTpass serviceID is the provider id (e.g. ikeja-electric, eko-electric, phed, etc.)
const ELECTRICITY_PROVIDERS = [
  { id: "ikeja-electric", name: "Ikeja Electric", vtpassId: "ikeja-electric" },
  { id: "eko-electric", name: "Eko Electric", vtpassId: "eko-electric" },
  { id: "abuja-electric", name: "Abuja Electric", vtpassId: "abuja-electric" },
  { id: "port-harcourt-electric", name: "Port Harcourt Electric", vtpassId: "phed" },
  { id: "enugu-electric", name: "Enugu Electric", vtpassId: "enugu-electric" },
  { id: "ibadan-electric", name: "Ibadan Electric", vtpassId: "ibadan-electric" },
  { id: "kano-electric", name: "Kano Electric", vtpassId: "kano-electric" },
  { id: "aba-electric", name: "Aba Electric", vtpassId: "aba-electric" },
  { id: "jos-electric", name: "Jos Electric", vtpassId: "jos-electric" },
  { id: "benin-electric", name: "Benin Electric", vtpassId: "benin-electric" },
];

router.get("/electricity/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(ELECTRICITY_PROVIDERS.map(({ vtpassId: _v, ...p }) => p));
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

  const provider = ELECTRICITY_PROVIDERS.find((p) => p.id === providerCode || p.vtpassId === providerCode);
  const serviceID = provider?.vtpassId ?? providerCode;

  try {
    const vtRes = await vtpassVerifyMeter(serviceID, meterNumber, meterType as "prepaid" | "postpaid");
    if (vtRes?.code === "000" && vtRes.content?.Customer_Name) {
      res.json({
        meterNumber,
        name: vtRes.content.Customer_Name,
        address: vtRes.content.Address ?? "",
      });
    } else {
      res.json({ meterNumber, name: "Customer", address: "" });
    }
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
    res.status(503).json({ error: "Electricity service is temporarily unavailable. Please try again later or contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `ELEC-${Date.now()}`;
  const provider = ELECTRICITY_PROVIDERS.find((p) => p.id === providerCode || p.vtpassId === providerCode);
  const serviceID = provider?.vtpassId ?? providerCode;

  let token = "";
  let delivered = false;
  try {
    const vtRes = await vtpassPayElectricity({
      requestId: reference,
      providerCode: serviceID,
      meterNumber,
      meterType: meterType as "prepaid" | "postpaid",
      amount,
      phone,
    });
    delivered = vtRes?.code === "000";
    token = vtRes?.content?.transactions?.token ?? "";
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
      message: `Your ₦${amount} electricity purchase failed. Your wallet has been refunded. Please try again or contact support.`,
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
// vtpassId matches VTpass serviceID exactly
const CABLE_PROVIDERS = [
  { id: "dstv", name: "DStv", vtpassId: "dstv" },
  { id: "gotv", name: "GOtv", vtpassId: "gotv" },
  { id: "startimes", name: "StarTimes", vtpassId: "startimes" },
];

// variation_code must match VTpass plan codes exactly
const CABLE_PLANS = [
  { id: "dstv-padi",        provider: "dstv",      name: "DStv Padi",       price: 2950,  validity: "Monthly", vtCode: "padi" },
  { id: "dstv-yanga",       provider: "dstv",      name: "DStv Yanga",      price: 3600,  validity: "Monthly", vtCode: "yanga" },
  { id: "dstv-confam",      provider: "dstv",      name: "DStv Confam",     price: 6200,  validity: "Monthly", vtCode: "confam" },
  { id: "dstv-compact",     provider: "dstv",      name: "DStv Compact",    price: 10500, validity: "Monthly", vtCode: "compact" },
  { id: "dstv-compact-plus",provider: "dstv",      name: "DStv Compact+",   price: 16600, validity: "Monthly", vtCode: "compact-plus" },
  { id: "dstv-premium",     provider: "dstv",      name: "DStv Premium",    price: 29500, validity: "Monthly", vtCode: "premium" },
  { id: "gotv-lite",        provider: "gotv",      name: "GOtv Lite",       price: 410,   validity: "Monthly", vtCode: "gotv-lite" },
  { id: "gotv-jinja",       provider: "gotv",      name: "GOtv Jinja",      price: 2250,  validity: "Monthly", vtCode: "gotv-jinja" },
  { id: "gotv-jolli",       provider: "gotv",      name: "GOtv Jolli",      price: 3300,  validity: "Monthly", vtCode: "gotv-jolli" },
  { id: "gotv-max",         provider: "gotv",      name: "GOtv Max",        price: 4850,  validity: "Monthly", vtCode: "gotv-max" },
  { id: "gotv-supa",        provider: "gotv",      name: "GOtv Supa",       price: 6400,  validity: "Monthly", vtCode: "gotv-supa" },
  { id: "gotv-supa-plus",   provider: "gotv",      name: "GOtv Supa+",      price: 9600,  validity: "Monthly", vtCode: "gotv-supa-plus" },
  { id: "startimes-nova",   provider: "startimes", name: "StarTimes Nova",  price: 900,   validity: "Monthly", vtCode: "nova" },
  { id: "startimes-basic",  provider: "startimes", name: "StarTimes Basic", price: 1850,  validity: "Monthly", vtCode: "basic" },
  { id: "startimes-smart",  provider: "startimes", name: "StarTimes Smart", price: 3100,  validity: "Monthly", vtCode: "smart" },
  { id: "startimes-classic",provider: "startimes", name: "StarTimes Classic",price: 2200, validity: "Monthly", vtCode: "classic" },
  { id: "startimes-super",  provider: "startimes", name: "StarTimes Super", price: 4900,  validity: "Monthly", vtCode: "super" },
];

router.get("/cable/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(CABLE_PROVIDERS.map(({ vtpassId: _v, ...p }) => p));
});

router.get("/cable/plans", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCablePlansQueryParams.safeParse(req.query);
  const filtered = params.success && params.data.provider
    ? CABLE_PLANS.filter((p) => p.provider === params.data.provider?.toLowerCase())
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

  const cableProvider = CABLE_PROVIDERS.find((p) => p.id === provider?.toLowerCase() || p.vtpassId === provider?.toLowerCase());
  const serviceID = cableProvider?.vtpassId ?? provider?.toLowerCase();

  try {
    const vtRes = await vtpassVerifySmartcard(serviceID, smartcardNumber);
    if (vtRes?.code === "000" && vtRes.content?.Customer_Name) {
      res.json({
        smartcardNumber,
        name: vtRes.content.Customer_Name,
        currentPlan: "",
        dueDate: "",
      });
    } else {
      res.json({ smartcardNumber, name: "Customer", currentPlan: "", dueDate: "" });
    }
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
    res.status(503).json({ error: "Cable TV service is temporarily unavailable. Please try again later or contact support." });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < plan.price) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${plan.price}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `CABLE-${Date.now()}`;
  const cableProvider = CABLE_PROVIDERS.find((p) => p.id === plan.provider || p.vtpassId === plan.provider);
  const serviceID = cableProvider?.vtpassId ?? plan.provider;

  let delivered = false;
  try {
    const vtRes = await vtpassCableSubscribe({
      requestId: reference,
      providerCode: serviceID,
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
      message: `Your ${plan.name} subscription failed. Your wallet has been refunded. Please try again or contact support.`,
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
    res.status(503).json({ error: "Exam token service is temporarily unavailable. Please try again later or contact support." });
    return;
  }

  const totalCost = parseFloat(examType.price) * quantity;
  const totalCostPrice = parseFloat(examType.costPrice) * quantity;
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(wallet.balance) < totalCost) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  await db.update(walletsTable).set({ balance: sql`balance - ${totalCost}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));

  const reference = `EXAM-${Date.now()}`;
  let pins: Array<{ pin: string; serial: string }> = [];
  let delivered = false;

  try {
    const vtRes = await vtpassPurchaseExam({
      requestId: reference,
      examCode: examType.code,
      phone,
      quantity,
      amount: totalCostPrice,
    });
    delivered = vtRes?.code === "000";
    req.log?.info({ vtRes }, "VTpass exam purchase response");

    if (delivered) {
      const rawOutput = vtRes?.content?.rawOutput ?? "";
      const tokens: string[] = vtRes?.content?.transactions?.tokens ?? [];
      if (tokens.length) {
        pins = tokens.map((pin, i) => ({ pin, serial: `${examType.code}${Date.now()}${i}` }));
      } else if (vtRes?.content?.transactions?.token) {
        pins = [{ pin: vtRes.content.transactions.token, serial: `${examType.code}${Date.now()}0` }];
      } else if (rawOutput) {
        pins = rawOutput.split(",").filter(Boolean).map((pin, i) => ({
          pin: pin.trim(),
          serial: `${examType.code}${Date.now()}${i}`,
        }));
      }
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

    res.status(502).json({ error: "Exam token delivery failed. Your wallet has been refunded." });
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
