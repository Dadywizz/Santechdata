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
  clubkonnectVerifyMeter,
  clubkonnectPayElectricity,
  clubkonnectGetExamPins,
  isClubkonnectConfigured,
} from "../lib/providers/clubkonnect";
import {
  flutterwavePurchaseAirtime,
  flutterwaveVerifySmartcard,
  flutterwaveCableSubscribe,
  isFlutterwaveVtuConfigured,
  FLW_CABLE_BILLER,
} from "../lib/providers/flutterwave-vtu";

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

  if (!isClubkonnectConfigured()) {
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
    const ckRes = await clubkonnectPurchaseData({
      network: plan.network,
      phone,
      planId: plan.providerCode,
      requestId: reference,
    });
    delivered = ckRes?.status === "success" || ckRes?.status === "1" || ckRes?.message?.toLowerCase().includes("successful");
    req.log?.info({ ckRes }, "Clubkonnect data purchase response");
  } catch (err) {
    req.log?.error({ err }, "Clubkonnect data purchase error");
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

  if (!isFlutterwaveVtuConfigured()) {
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
    const flwRes = await flutterwavePurchaseAirtime({ network, phone, amount, reference });
    delivered = flwRes?.status === "success" || flwRes?.message?.toLowerCase().includes("successful");
    req.log?.info({ flwRes }, "Flutterwave airtime purchase response");
  } catch (err) {
    req.log?.error({ err }, "Flutterwave airtime purchase error");
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
// Clubkonnect electricity NetworkIDs
const ELECTRICITY_PROVIDERS = [
  { id: "ikeja-electric",       name: "Ikeja Electric",        ckId: "IKEDC" },
  { id: "eko-electric",         name: "Eko Electric",          ckId: "EKEDC" },
  { id: "abuja-electric",       name: "Abuja Electric",        ckId: "AEDC"  },
  { id: "port-harcourt-electric", name: "Port Harcourt Electric", ckId: "PHED" },
  { id: "enugu-electric",       name: "Enugu Electric",        ckId: "ENUGU" },
  { id: "ibadan-electric",      name: "Ibadan Electric",       ckId: "IBEDC" },
  { id: "kano-electric",        name: "Kano Electric",         ckId: "KEDCO" },
  { id: "aba-electric",         name: "Aba Electric",          ckId: "APLE"  },
  { id: "jos-electric",         name: "Jos Electric",          ckId: "JED"   },
  { id: "benin-electric",       name: "Benin Electric",        ckId: "BEDC"  },
];

router.get("/electricity/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(ELECTRICITY_PROVIDERS.map(({ ckId: _c, ...p }) => p));
});

router.post("/electricity/verify-meter", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifyMeterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { meterNumber, providerCode, meterType } = parsed.data;

  if (!isClubkonnectConfigured()) {
    res.json({ meterNumber, name: "Customer", address: "" });
    return;
  }

  const provider = ELECTRICITY_PROVIDERS.find((p) => p.id === providerCode || p.ckId === providerCode);
  const networkId = provider?.ckId ?? providerCode;

  try {
    const ckRes = await clubkonnectVerifyMeter({ meterNumber, networkId, meterType });
    const ok = ckRes?.status === "success" || ckRes?.status === "1";
    res.json({
      meterNumber,
      name: ok ? (ckRes.CustomerName ?? "Customer") : "Customer",
      address: ok ? (ckRes.CustomerAddress ?? "") : "",
    });
  } catch (err) {
    req.log?.error({ err }, "Clubkonnect meter verify error");
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

  if (!isClubkonnectConfigured()) {
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
  const provider = ELECTRICITY_PROVIDERS.find((p) => p.id === providerCode || p.ckId === providerCode);
  const networkId = provider?.ckId ?? providerCode;

  let token = "";
  let delivered = false;
  try {
    const ckRes = await clubkonnectPayElectricity({ meterNumber, networkId, meterType, amount, phone, requestId: reference });
    delivered = ckRes?.status === "success" || ckRes?.status === "1" || ckRes?.message?.toLowerCase().includes("successful");
    token = ckRes?.token ?? "";
    req.log?.info({ ckRes }, "Clubkonnect electricity purchase response");
  } catch (err) {
    req.log?.error({ err }, "Clubkonnect electricity purchase error");
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
// Flutterwave cable biller IDs match CABLE_BILLER keys in flutterwave-vtu.ts
const CABLE_PROVIDERS = [
  { id: "dstv",      name: "DStv"      },
  { id: "gotv",      name: "GOtv"      },
  { id: "startimes", name: "StarTimes" },
];

// Flutterwave item codes from /v3/bill-categories
const CABLE_PLANS = [
  { id: "dstv-access",       provider: "dstv",      name: "DStv Access",      price: 1800,  validity: "Monthly", flwCode: "CB141" },
  { id: "dstv-compact",      provider: "dstv",      name: "DStv Compact",     price: 14600, validity: "Monthly", flwCode: "CB140" },
  { id: "gotv-lite",         provider: "gotv",      name: "GOtv Lite",        price: 1050,  validity: "Monthly", flwCode: "CB137" },
  { id: "gotv-jolli",        provider: "gotv",      name: "GOtv Jolli",       price: 1200,  validity: "Monthly", flwCode: "CB138" },
  { id: "gotv-max",          provider: "gotv",      name: "GOtv Max",         price: 1800,  validity: "Monthly", flwCode: "CB139" },
  { id: "startimes-nova",    provider: "startimes", name: "StarTimes Nova",   price: 900,   validity: "Monthly", flwCode: "CB191" },
  { id: "startimes-basic",   provider: "startimes", name: "StarTimes Basic",  price: 1700,  validity: "Monthly", flwCode: "CB260" },
  { id: "startimes-smart",   provider: "startimes", name: "StarTimes Smart",  price: 2200,  validity: "Monthly", flwCode: "CB263" },
  { id: "startimes-classic", provider: "startimes", name: "StarTimes Classic",price: 1200,  validity: "Monthly", flwCode: "CB265" },
  { id: "startimes-super",   provider: "startimes", name: "StarTimes Super",  price: 4200,  validity: "Monthly", flwCode: "CB272" },
];

router.get("/cable/providers", authenticate, async (_req, res): Promise<void> => {
  res.json(CABLE_PROVIDERS);
});

router.get("/cable/plans", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCablePlansQueryParams.safeParse(req.query);
  const filtered = params.success && params.data.provider
    ? CABLE_PLANS.filter((p) => p.provider === params.data.provider?.toLowerCase())
    : CABLE_PLANS;
  res.json(filtered.map(({ flwCode: _f, ...p }) => p));
});

router.post("/cable/verify-smartcard", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifySmartcardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { smartcardNumber, provider } = parsed.data;

  if (!isFlutterwaveVtuConfigured()) {
    res.json({ smartcardNumber, name: "Customer", currentPlan: "", dueDate: "" });
    return;
  }

  try {
    const flwRes = await flutterwaveVerifySmartcard({ provider: provider ?? "dstv", smartcardNumber });
    const ok = flwRes?.status === "success";
    res.json({
      smartcardNumber,
      name: ok ? (flwRes.name ?? "Customer") : "Customer",
      currentPlan: "",
      dueDate: "",
    });
  } catch (err) {
    req.log?.error({ err }, "Flutterwave smartcard verify error");
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

  if (!isFlutterwaveVtuConfigured()) {
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
    const flwRes = await flutterwaveCableSubscribe({
      provider: plan.provider,
      smartcardNumber,
      itemCode: plan.flwCode,
      amount: plan.price,
      reference,
    });
    delivered = flwRes?.status === "success" || flwRes?.message?.toLowerCase().includes("successful");
    req.log?.info({ flwRes }, "Flutterwave cable subscribe response");
  } catch (err) {
    req.log?.error({ err }, "Flutterwave cable subscribe error");
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

  if (!isClubkonnectConfigured()) {
    res.status(503).json({ error: "Exam token service is temporarily unavailable. Please contact support." });
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
    const ckRes = await clubkonnectGetExamPins({ examType: examType.code, quantity, requestId: reference });
    delivered = ckRes?.status === "success" || ckRes?.status === "1" || ckRes?.message?.toLowerCase().includes("successful");
    req.log?.info({ ckRes }, "Clubkonnect exam purchase response");

    if (delivered && ckRes?.Pins?.length) {
      pins = ckRes.Pins.map((pin, i) => ({ pin, serial: `${examType.code}${Date.now()}${i}` }));
    }
  } catch (err) {
    req.log?.error({ err }, "Clubkonnect exam purchase error");
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
