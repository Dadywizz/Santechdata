import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";
import { InitiateFundingBody, VerifyFundingBody, WalletTransferBody } from "@workspace/api-zod";
import { flutterwaveInitPayment, flutterwaveVerifyTransaction, monnifyInitTransaction, monnifyVerifyTransaction, paystackInitTransaction, paystackVerifyTransaction } from "../lib/providers/gateways";

const router: IRouter = Router();

// GET /wallet
router.get("/wallet", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  res.json({
    id: wallet.id,
    userId: wallet.userId,
    balance: parseFloat(wallet.balance),
    currency: wallet.currency,
    updatedAt: wallet.updatedAt,
  });
});

// POST /wallet/fund/initiate
router.post("/wallet/fund/initiate", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = InitiateFundingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount, gateway } = parsed.data;
  if (amount < 100) {
    res.status(400).json({ error: "Minimum funding amount is ₦100" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const reference = `SANTECH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // Build redirect URL — prefer REPLIT_DOMAINS (production), fall back to request host (dev)
  const replitDomains = process.env.REPLIT_DOMAINS;
  let redirectUrl: string;
  if (replitDomains) {
    const primaryDomain = replitDomains.split(",")[0].trim();
    redirectUrl = `https://${primaryDomain}/payment/callback`;
  } else {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost";
    redirectUrl = `${proto}://${host}/payment/callback`;
  }

  let paymentUrl = "";

  try {
    if (gateway === "flutterwave" && process.env.FLUTTERWAVE_SECRET_KEY) {
      const flwData = await flutterwaveInitPayment({
        email: user.email,
        amount,
        reference,
        name: user.fullName || user.email,
        phone: user.phone || "",
        redirectUrl,
      });
      paymentUrl = flwData.link;
    } else if (gateway === "monnify" && process.env.MONNIFY_API_KEY) {
      const monnifyData = await monnifyInitTransaction({
        email: user.email,
        amount,
        reference,
        name: user.fullName || user.email,
        redirectUrl,
      });
      paymentUrl = monnifyData.checkoutUrl;
    } else if (gateway === "paystack" && process.env.PAYSTACK_SECRET_KEY) {
      const psData = await paystackInitTransaction({
        email: user.email,
        amount,
        reference,
        callbackUrl: redirectUrl,
      });
      paymentUrl = psData.authorization_url;
    } else {
      res.status(503).json({ error: `${gateway} is not configured yet. Please contact support.` });
      return;
    }
  } catch (err) {
    req.log?.error({ err }, "Payment gateway error");
    res.status(502).json({ error: "Could not connect to payment gateway. Please try again." });
    return;
  }

  // Create pending transaction
  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "wallet_fund",
    status: "pending",
    amount: amount.toString(),
    description: `Wallet funding via ${gateway}`,
    reference,
    metadata: { gateway, amount },
  });

  res.json({ paymentUrl, reference, gateway });
});

// POST /wallet/fund/verify
router.post("/wallet/fund/verify", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifyFundingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { reference } = parsed.data;
  const transactionId = req.body.transactionId as string | undefined;

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.reference, reference));
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  if (tx.status === "success") {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
    res.json({ id: wallet.id, userId: wallet.userId, balance: parseFloat(wallet.balance), currency: wallet.currency, updatedAt: wallet.updatedAt });
    return;
  }

  const meta = tx.metadata as Record<string, any>;
  const gateway = meta?.gateway as string;
  let verified = false;
  let verifiedAmount = parseFloat(tx.amount);

  // Real gateway verification
  if (gateway === "flutterwave" && transactionId && process.env.FLUTTERWAVE_SECRET_KEY) {
    try {
      const result = await flutterwaveVerifyTransaction(transactionId);
      verified = result.success;
      verifiedAmount = result.amount;
    } catch {
      res.status(502).json({ error: "Could not verify payment with Flutterwave. Please contact support." });
      return;
    }
  } else if (gateway === "monnify" && process.env.MONNIFY_API_KEY) {
    try {
      const result = await monnifyVerifyTransaction(reference);
      verified = result.success;
      verifiedAmount = result.amount;
    } catch {
      res.status(502).json({ error: "Could not verify payment with Monnify. Please contact support." });
      return;
    }
  } else if (gateway === "paystack" && process.env.PAYSTACK_SECRET_KEY) {
    try {
      const result = await paystackVerifyTransaction(reference);
      verified = result.success;
      verifiedAmount = result.amount;
      // Bank transfer initiated but not yet received by Paystack — don't fail, keep pending
      if (result.pending) {
        res.status(202).json({ error: "Your bank transfer is being processed. Your wallet will be credited automatically once Paystack confirms receipt — this usually takes 1–5 minutes. You do not need to do anything." });
        return;
      }
    } catch {
      res.status(502).json({ error: "Could not verify payment with Paystack. Please contact support." });
      return;
    }
  } else {
    res.status(400).json({ error: "Payment verification failed. Please contact support with your reference: " + reference });
    return;
  }

  if (!verified) {
    await db.update(transactionsTable).set({ status: "failed" }).where(eq(transactionsTable.id, tx.id));
    res.status(400).json({ error: "Payment not completed. Your wallet has NOT been charged — no money was taken. Please try again and complete the payment on the checkout page." });
    return;
  }

  // Credit the wallet
  await db.update(transactionsTable).set({ status: "success" }).where(eq(transactionsTable.id, tx.id));
  await db.update(walletsTable)
    .set({ balance: sql`balance + ${verifiedAmount}`, updatedAt: new Date() })
    .where(eq(walletsTable.userId, req.userId!));

  await db.insert(notificationsTable).values({
    userId: req.userId!,
    title: "Wallet Funded",
    message: `Your wallet has been credited with ₦${verifiedAmount.toLocaleString()}.`,
    type: "wallet",
  });

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  res.json({ id: wallet.id, userId: wallet.userId, balance: parseFloat(wallet.balance), currency: wallet.currency, updatedAt: wallet.updatedAt });
});

// POST /wallet/webhook/paystack — no auth, verified by HMAC signature
router.post("/wallet/webhook/paystack", async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) { res.sendStatus(200); return; }

  const sig = req.headers["x-paystack-signature"] as string;
  const rawBody = (req as AuthRequest & { rawBody?: Buffer }).rawBody;
  if (!sig || !rawBody) { res.sendStatus(400); return; }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  if (sig !== expected) { res.sendStatus(401); return; }

  const event = req.body as { event: string; data: { reference: string; amount: number; status: string } };

  if (event.event === "charge.success") {
    const { reference, amount } = event.data;
    const amountNaira = amount / 100;

    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.reference, reference));
    if (tx && tx.status !== "success") {
      await db.update(transactionsTable).set({ status: "success" }).where(eq(transactionsTable.id, tx.id));
      await db.update(walletsTable)
        .set({ balance: sql`balance + ${amountNaira}`, updatedAt: new Date() })
        .where(eq(walletsTable.userId, tx.userId));
      await db.insert(notificationsTable).values({
        userId: tx.userId,
        title: "Wallet Funded",
        message: `Your wallet has been credited with ₦${amountNaira.toLocaleString()} via bank transfer.`,
        type: "wallet",
      });
    }
  }

  res.sendStatus(200);
});

// POST /wallet/transfer
router.post("/wallet/transfer", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = WalletTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { recipientPhone, amount, note } = parsed.data;

  if (amount < 10) {
    res.status(400).json({ error: "Minimum transfer amount is ₦10" });
    return;
  }

  const [recipient] = await db.select().from(usersTable).where(eq(usersTable.phone, recipientPhone));
  if (!recipient) {
    res.status(404).json({ error: "Recipient not found" });
    return;
  }

  if (recipient.id === req.userId!) {
    res.status(400).json({ error: "Cannot transfer to yourself" });
    return;
  }

  const [senderWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (parseFloat(senderWallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  const reference = `TRF-${Date.now()}`;
  await db.update(walletsTable).set({ balance: sql`balance - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, req.userId!));
  await db.update(walletsTable).set({ balance: sql`balance + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, recipient.id));

  await db.insert(transactionsTable).values([
    { userId: req.userId!, type: "wallet_transfer", status: "success", amount: amount.toString(), description: `Transfer to ${recipient.phone}${note ? `: ${note}` : ""}`, reference, metadata: { to: recipient.phone } },
    { userId: recipient.id, type: "wallet_transfer", status: "success", amount: amount.toString(), description: `Transfer from ${(await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)))[0]?.phone}`, metadata: { from: req.userId } },
  ]);

  res.json({ message: "Transfer successful" });
});

export default router;
