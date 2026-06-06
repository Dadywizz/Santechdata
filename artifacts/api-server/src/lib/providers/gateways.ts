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
  const rawStatus = data.data?.status ?? "unknown";
  return {
    success: data.status && rawStatus === "success",
    pending: rawStatus === "pending",
    amount: (data.data?.amount ?? 0) / 100,
    rawStatus,
  };
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
  const data = await res.json() as { status: string; message?: string; data: { link: string } };
  if (data.status !== "success") {
    throw new Error(`Flutterwave initialization failed: ${data.message ?? JSON.stringify(data)}`);
  }
  return data.data;
}

export async function flutterwaveVerifyTransaction(transactionId: string) {
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
  });
  const data = await res.json() as { status: string; message?: string; data: { status: string; amount: number } };
  if (data.status !== "success") {
    throw new Error(`Flutterwave verify failed: ${data.message ?? JSON.stringify(data)}`);
  }
  return { success: data.data?.status === "successful", amount: data.data?.amount ?? 0 };
}

// ── MONNIFY ───────────────────────────────────────────────────────────────────

// Use sandbox for test keys (MK_TEST_...), live URL for production keys
function monnifyBaseUrl(): string {
  return process.env.MONNIFY_API_KEY?.startsWith("MK_TEST_")
    ? "https://sandbox.monnify.com"
    : "https://api.monnify.com";
}

async function monnifyGetAccessToken(): Promise<string> {
  const creds = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64");
  const res = await fetch(`${monnifyBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/json" },
  });
  const data = await res.json() as { requestSuccessful: boolean; responseBody: { accessToken: string } };
  if (!data.requestSuccessful) throw new Error("Monnify auth failed");
  return data.responseBody.accessToken;
}

export async function monnifyInitTransaction(opts: {
  email: string; amount: number; reference: string; name: string; redirectUrl: string;
}) {
  const token = await monnifyGetAccessToken();
  const res = await fetch(`${monnifyBaseUrl()}/api/v1/merchant/transactions/init-transaction`, {
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
  const data = await res.json() as { requestSuccessful: boolean; responseMessage?: string; responseBody: { checkoutUrl: string } };
  if (!data.requestSuccessful) throw new Error(`Monnify init failed: ${data.responseMessage ?? JSON.stringify(data)}`);
  return data.responseBody;
}

export async function monnifyCreateReservedAccount(opts: {
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName: string;
}): Promise<{ accountNumber: string; bankName: string } | null> {
  if (!process.env.MONNIFY_API_KEY || !process.env.MONNIFY_SECRET_KEY || !process.env.MONNIFY_CONTRACT_CODE) return null;
  try {
    const token = await monnifyGetAccessToken();
    const res = await fetch(`${monnifyBaseUrl()}/api/v2/bank-transfer/reserved-accounts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        accountReference: opts.accountReference,
        accountName: opts.accountName,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        customerEmail: opts.customerEmail,
        customerName: opts.customerName,
        getAllAvailableBanks: false,
      }),
    });
    const data = await res.json() as {
      requestSuccessful: boolean;
      responseBody: { accounts: Array<{ bankName: string; accountNumber: string }> };
    };
    if (!data.requestSuccessful || !data.responseBody?.accounts?.length) return null;
    const acct = data.responseBody.accounts[0];
    return { accountNumber: acct.accountNumber, bankName: acct.bankName };
  } catch {
    return null;
  }
}

export async function monnifyVerifyTransaction(reference: string) {
  const token = await monnifyGetAccessToken();
  const encodedRef = encodeURIComponent(reference);
  const res = await fetch(`${monnifyBaseUrl()}/api/v2/transactions/${encodedRef}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json() as { requestSuccessful: boolean; responseBody: { paymentStatus: string; amountPaid: number } };
  if (!data.requestSuccessful) throw new Error("Monnify verify failed");
  return { success: data.responseBody?.paymentStatus === "PAID", amount: data.responseBody?.amountPaid ?? 0 };
}
