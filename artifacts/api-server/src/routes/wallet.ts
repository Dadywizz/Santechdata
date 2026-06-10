import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";
import { InitiateFundingBody, VerifyFundingBody, WalletTransferBody } from "@workspace/api-zod";
import { flutterwaveCreateVirtualAccount, flutterwaveInitPayment, flutterwaveVerifyTransaction, monnifyCreateReservedAccount, monnifyInitTransaction, monnifyVerifyTransaction, paystackCreateDedicatedAccount, paystackInitTransaction, paystackVerifyTransaction } from "../lib/providers/gateways";

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
    virtualAccountNumber: wallet.virtualAccountNumber ?? null,
    virtualAccountBank: wallet.virtualAccountBank ?? null,
    updatedAt: wallet.updatedAt,
  });
});

// POST /wallet/generate-account — request/retry dedicated virtual account generation
router.post("/wallet/generate-account", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  if (wallet.virtualAccountNumber) {
    res.json({ virtualAccountNumber: wallet.virtualAccountNumber, virtualAccountBank: wallet.virtualAccountBank });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let acct: { accountNumber: string; bankName: string };
  try {
    if (process.env.PAYSTACK_SECRET_KEY) {
      // Paystack DVA — no merchant KYC needed, works immediately
      const nameParts = (user.fullName || "").trim().split(/\s+/);
      acct = await paystackCreateDedicatedAccount({
        userId: user.id,
        email: user.email,
        firstName: nameParts[0] || user.email,
        lastName: nameParts.slice(1).join(" ") || nameParts[0] || "",
        phone: user.phone ?? undefined,
      });
    } else {
      // Fall back to Monnify if Paystack not configured
      acct = await monnifyCreateReservedAccount({
        accountReference: user.id,
        accountName: user.fullName || user.email,
        customerEmail: user.email,
        customerName: user.fullName || user.email,
      });
    }
  } catch (err: any) {
    req.log?.error({ err }, "DVA generation failed");
    res.status(503).json({ error: err?.message ?? "Could not generate account at this time. Please try again shortly or contact support." });
    return;
  }

  await db.update(walletsTable)
    .set({ virtualAccountNumber: acct.accountNumber, virtualAccountBank: acct.bankName })
    .where(eq(walletsTable.id, wallet.id));

  res.json({ virtualAccountNumber: acct.accountNumber, virtualAccountBank: acct.bankName });
});

// POST /wallet/fund/flutterwave-va — generate a temporary Flutterwave virtual account for a specific amount
router.post("/wallet/fund/flutterwave-va", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const amount = Number(req.body?.amount);
  if (!amount || amount < 100) { res.status(400).json({ error: "Minimum funding amount is ₦100" }); return; }
  if (!process.env.FLUTTERWAVE_SECRET_KEY) { res.status(503).json({ error: "Bank transfer not available right now" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const reference = `FLW-VA-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const nameParts = (user.fullName || "SanTech User").trim().split(/\s+/);

  try {
    const va = await flutterwaveCreateVirtualAccount({
      email: user.email,
      amount,
      reference,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || nameParts[0],
      phone: user.phone ?? undefined,
      narration: `SanTech wallet funding - ${user.email}`,
    });

    // Save a pending transaction so webhook can match by reference
    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "wallet_fund",
      status: "pending",
      amount: amount.toString(),
      description: `Wallet funding via bank transfer (Flutterwave)`,
      reference,
      metadata: { gateway: "flutterwave_va", amount, orderRef: va.orderRef },
    });

    res.json({
      accountNumber: va.accountNumber,
      bankName: va.bankName,
      amount,
      expiresAt: va.expiresAt,
      reference,
    });
  } catch (err: any) {
    req.log?.error({ err }, "Flutterwave VA creation failed");
    res.status(503).json({ error: err?.message ?? "Could not generate bank account. Please try again." });
  }
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

// POST /wallet/webhook/monnify-dva — Monnify reserved account payment notification
router.post("/wallet/webhook/monnify-dva", async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.MONNIFY_SECRET_KEY;
  if (!secret) { res.sendStatus(200); return; }

  const sig = req.headers["monnify-signature"] as string | undefined;
  const rawBody = (req as AuthRequest & { rawBody?: Buffer }).rawBody;
  if (sig && rawBody) {
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    if (sig !== expected) { res.sendStatus(401); return; }
  }

  const event = req.body as {
    eventType?: string;
    eventData?: {
      product?: { reference: string; type: string };
      amountPaid?: number;
      paymentStatus?: string;
      transactionReference?: string;
    };
  };

  if (
    event.eventType === "SUCCESSFUL_TRANSACTION" &&
    event.eventData?.product?.type === "RESERVED_ACCOUNT" &&
    event.eventData?.paymentStatus === "PAID" &&
    event.eventData?.amountPaid
  ) {
    const userId = event.eventData.product.reference;
    const amountPaid = event.eventData.amountPaid;
    const txRef = event.eventData.transactionReference ?? `DVA-${Date.now()}`;

    const existing = await db.select().from(transactionsTable).where(eq(transactionsTable.reference, txRef));
    if (!existing.length) {
      await db.update(walletsTable)
        .set({ balance: sql`balance + ${amountPaid}`, updatedAt: new Date() })
        .where(eq(walletsTable.userId, userId));

      await db.insert(transactionsTable).values({
        userId,
        type: "wallet_fund",
        status: "success",
        amount: amountPaid.toString(),
        description: "Wallet funded via dedicated bank account",
        reference: txRef,
        metadata: { gateway: "monnify_dva", amount: amountPaid },
      });

      await db.insert(notificationsTable).values({
        userId,
        title: "Wallet Funded",
        message: `Your wallet has been credited with ₦${amountPaid.toLocaleString()} via bank transfer.`,
        type: "wallet",
      });
    }
  }

  res.sendStatus(200);
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

  const event = req.body as {
    event: string;
    data: {
      reference: string;
      amount: number;
      status: string;
      channel?: string;
      customer?: { email: string };
    };
  };

  if (event.event === "charge.success") {
    const { reference, amount, channel } = event.data;
    const amountNaira = amount / 100;

    if (channel === "dedicated_nuban") {
      // Paystack DVA payment — credit wallet by customer email
      const email = event.data.customer?.email;
      if (email) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (user) {
          const dvaRef = `DVA-PS-${reference}`;
          const existing = await db.select().from(transactionsTable).where(eq(transactionsTable.reference, dvaRef));
          if (!existing.length) {
            await db.update(walletsTable)
              .set({ balance: sql`balance + ${amountNaira}`, updatedAt: new Date() })
              .where(eq(walletsTable.userId, user.id));
            await db.insert(transactionsTable).values({
              userId: user.id,
              type: "wallet_fund",
              status: "success",
              amount: amountNaira.toString(),
              description: "Wallet funded via dedicated bank account",
              reference: dvaRef,
              metadata: { gateway: "paystack_dva", amount: amountNaira },
            });
            await db.insert(notificationsTable).values({
              userId: user.id,
              title: "Wallet Funded",
              message: `Your wallet has been credited with ₦${amountNaira.toLocaleString()} via bank transfer.`,
              type: "wallet",
            });
          }
        }
      }
    } else {
      // Regular Paystack checkout payment — look up by reference
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
  }

  res.sendStatus(200);
});

// POST /wallet/webhook/flutterwave — Flutterwave VA payment notification
router.post("/wallet/webhook/flutterwave", async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) { res.sendStatus(200); return; }

  // Verify hash
  const hash = req.headers["verif-hash"] as string | undefined;
  const webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (webhookSecret && hash !== webhookSecret) { res.sendStatus(401); return; }

  const event = req.body as {
    event?: string;
    data?: {
      tx_ref?: string;
      flw_ref?: string;
      status?: string;
      amount?: number;
      customer?: { email?: string };
      payment_type?: string;
    };
  };

  if (event.event === "charge.completed" && event.data?.status === "successful") {
    const txRef = event.data.tx_ref;
    const amountPaid = event.data.amount ?? 0;

    if (txRef && amountPaid > 0) {
      const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.reference, txRef));
      if (tx && tx.status !== "success") {
        await db.update(transactionsTable).set({ status: "success" }).where(eq(transactionsTable.id, tx.id));
        await db.update(walletsTable)
          .set({ balance: sql`balance + ${amountPaid}`, updatedAt: new Date() })
          .where(eq(walletsTable.userId, tx.userId));
        await db.insert(notificationsTable).values({
          userId: tx.userId,
          title: "Wallet Funded",
          message: `Your wallet has been credited with ₦${amountPaid.toLocaleString()} via bank transfer.`,
          type: "wallet",
        });
      }
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
