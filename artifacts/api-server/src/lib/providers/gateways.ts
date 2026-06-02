/**
 * Payment Gateway Integration Layer
 * Supports: Paystack, Flutterwave, Monnify
 * Set env vars:
 *   PAYSTACK_SECRET_KEY
 *   FLUTTERWAVE_SECRET_KEY
 *   MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE
 */

// ── PAYSTACK ─────────────────────────────────────────────────────────────────

export async function paystackInitTransaction(opts: {
  email: string; amount: number; reference: string; callbackUrl?: string;
}) {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      amount: Math.round(opts.amount * 100),
      reference: opts.reference,
      callback_url: opts.callbackUrl,
    }),
  });
  const data = await res.json() as { status: boolean; data: { authorization_url: string; reference: string } };
  if (!data.status) throw new Error("Paystack initialization failed");
  return data.data;
}

export async function paystackVerifyTransaction(reference: string) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json() as { status: boolean; data: { status: string; amount: number } };
  return { success: data.status && data.data?.status === "success", amount: (data.data?.amount ?? 0) / 100 };
}

// ── FLUTTERWAVE ───────────────────────────────────────────────────────────────

export async function flutterwaveInitPayment(opts: {
  email: string; amount: number; reference: string; name: string; phone: string; redirectUrl: string;
}) {
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: opts.reference,
      amount: opts.amount,
      currency: "NGN",
      redirect_url: opts.redirectUrl,
      customer: { email: opts.email, name: opts.name, phone_number: opts.phone },
      customizations: { title: "SanTech Data", description: "Wallet funding", logo: "" },
    }),
  });
  const data = await res.json() as { status: string; data: { link: string } };
  if (data.status !== "success") throw new Error("Flutterwave initialization failed");
  return data.data;
}

export async function flutterwaveVerifyTransaction(transactionId: string) {
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
  });
  const data = await res.json() as { status: string; data: { status: string; amount: number } };
  return { success: data.status === "success" && data.data?.status === "successful", amount: data.data?.amount ?? 0 };
}

// ── MONNIFY ───────────────────────────────────────────────────────────────────

async function monnifyGetAccessToken(): Promise<string> {
  const creds = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64");
  const res = await fetch("https://api.monnify.com/api/v1/auth/login", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/json" },
  });
  const data = await res.json() as { responseBody: { accessToken: string } };
  return data.responseBody.accessToken;
}

export async function monnifyInitTransaction(opts: {
  email: string; amount: number; reference: string; name: string; redirectUrl: string;
}) {
  const token = await monnifyGetAccessToken();
  const res = await fetch("https://api.monnify.com/api/v1/merchant/transactions/init-transaction", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: opts.amount,
      customerName: opts.name,
      customerEmail: opts.email,
      paymentReference: opts.reference,
      paymentDescription: "SanTech Data Wallet Funding",
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: opts.redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
    }),
  });
  const data = await res.json() as { responseBody: { checkoutUrl: string } };
  return data.responseBody;
}

export async function monnifyVerifyTransaction(reference: string) {
  const token = await monnifyGetAccessToken();
  const encodedRef = encodeURIComponent(reference);
  const res = await fetch(`https://api.monnify.com/api/v2/transactions/${encodedRef}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json() as { responseBody: { paymentStatus: string; amountPaid: number } };
  return { success: data.responseBody?.paymentStatus === "PAID", amount: data.responseBody?.amountPaid ?? 0 };
}
