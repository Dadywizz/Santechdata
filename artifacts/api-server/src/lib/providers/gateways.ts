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

export async function paystackCreateDedicatedAccount(opts: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ accountNumber: string; bankName: string }> {
  const isTest = process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_");

  // Step 1: Create customer on Paystack
  const custRes = await fetch("https://api.paystack.co/customer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      first_name: opts.firstName,
      last_name: opts.lastName || opts.firstName,
      phone: opts.phone,
      metadata: { userId: opts.userId },
    }),
  });
  const custData = await custRes.json() as { status: boolean; data?: { customer_code: string }; message?: string };
  const customerCode = custData.data?.customer_code;
  if (!customerCode) throw new Error(`Paystack customer creation failed: ${custData.message ?? JSON.stringify(custData)}`);

  // Step 2: Assign dedicated virtual account
  const acctRes = await fetch("https://api.paystack.co/dedicated_account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: isTest ? "test-bank" : "wema-bank",
    }),
  });
  const acctData = await acctRes.json() as {
    status: boolean;
    message?: string;
    data?: { dedicated_account?: { account_number: string; bank?: { name: string } } };
  };

  if (!acctData.status) throw new Error(`Paystack DVA failed: ${acctData.message ?? JSON.stringify(acctData)}`);
  const account = acctData.data?.dedicated_account;
  if (!account?.account_number) throw new Error("Paystack DVA: no account number in response");

  return { accountNumber: account.account_number, bankName: account.bank?.name ?? "Paystack" };
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

export async function flutterwaveCreatePermanentVA(opts: {
  email: string; firstName: string; lastName: string; phone?: string; narration: string;
}): Promise<{ accountNumber: string; bankName: string; orderRef: string }> {
  const res = await fetch("https://api.flutterwave.com/v3/virtual-account-numbers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      is_permanent: true,
      phonenumber: opts.phone || "09000000000",
      firstname: opts.firstName,
      lastname: opts.lastName,
      narration: opts.narration,
    }),
  });
  const data = await res.json() as {
    status: string; message?: string;
    data?: { account_number: string; bank_name: string; order_ref: string };
  };
  if (data.status !== "success" || !data.data?.account_number) {
    throw new Error(`Flutterwave permanent VA failed: ${data.message ?? JSON.stringify(data)}`);
  }
  return {
    accountNumber: data.data.account_number,
    bankName: data.data.bank_name,
    orderRef: data.data.order_ref,
  };
}

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

export async function monnifyCreateOneTimeVA(opts: {
  amount: number;
  reference: string;
  customerName: string;
  customerEmail: string;
}): Promise<{ accountNumber: string; bankName: string; transactionReference: string; expiresOn: string; ussd?: string }> {
  const token = await monnifyGetAccessToken();
  const base = monnifyBaseUrl();

  // Step 1: init transaction (account transfer only)
  const initRes = await fetch(`${base}/api/v1/merchant/transactions/init-transaction`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: opts.amount,
      customerName: opts.customerName,
      customerEmail: opts.customerEmail,
      paymentReference: opts.reference,
      paymentDescription: "SanTech Data Wallet Funding",
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: "https://santechdata.com.ng/payment/callback",
      paymentMethods: ["ACCOUNT_TRANSFER"],
    }),
  });
  const initData = await initRes.json() as {
    requestSuccessful: boolean; responseMessage?: string;
    responseBody: { transactionReference: string };
  };
  if (!initData.requestSuccessful) throw new Error(`Monnify init failed: ${initData.responseMessage}`);
  const txRef = initData.responseBody.transactionReference;

  // Step 2: request a bank account number for this transaction (Sterling Bank = 232)
  const vaRes = await fetch(`${base}/api/v1/merchant/bank-transfer/init-payment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ transactionReference: txRef, bankCode: "232" }),
  });
  const vaData = await vaRes.json() as {
    requestSuccessful: boolean; responseMessage?: string;
    responseBody: {
      accountNumber: string; accountName: string; bankName: string;
      expiresOn: string; transactionReference: string; ussdPayment?: string;
    };
  };
  if (!vaData.requestSuccessful) throw new Error(`Monnify VA failed: ${vaData.responseMessage}`);
  const b = vaData.responseBody;
  return {
    accountNumber: b.accountNumber,
    bankName: b.bankName,
    transactionReference: b.transactionReference,
    expiresOn: b.expiresOn,
    ussd: b.ussdPayment,
  };
}

export async function monnifyVerifyOneTimeVA(transactionReference: string): Promise<{ success: boolean; amount: number }> {
  const token = await monnifyGetAccessToken();
  const base = monnifyBaseUrl();
  const encoded = encodeURIComponent(transactionReference);
  const res = await fetch(`${base}/api/v2/transactions/${encoded}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json() as {
    requestSuccessful: boolean;
    responseBody: { paymentStatus: string; amountPaid: number };
  };
  if (!data.requestSuccessful) throw new Error("Monnify verify failed");
  return {
    success: data.responseBody?.paymentStatus === "PAID",
    amount: data.responseBody?.amountPaid ?? 0,
  };
}

export async function monnifyCreateReservedAccount(opts: {
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName: string;
}): Promise<{ accountNumber: string; bankName: string }> {
  if (!process.env.MONNIFY_API_KEY || !process.env.MONNIFY_SECRET_KEY || !process.env.MONNIFY_CONTRACT_CODE) {
    throw new Error("Monnify credentials not configured (MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE must all be set)");
  }

  const token = await monnifyGetAccessToken();

  // Try to fetch an existing reserved account first (handles retry after a previous attempt saved to Monnify but not DB)
  try {
    const existing = await fetch(
      `${monnifyBaseUrl()}/api/v2/bank-transfer/reserved-accounts/${encodeURIComponent(opts.accountReference)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (existing.ok) {
      const eData = await existing.json() as {
        requestSuccessful: boolean;
        responseBody: { accounts?: Array<{ bankName: string; accountNumber: string }>; accountNumber?: string; bankName?: string };
      };
      if (eData.requestSuccessful) {
        const accounts = eData.responseBody?.accounts;
        if (accounts?.length) return { accountNumber: accounts[0].accountNumber, bankName: accounts[0].bankName };
        if (eData.responseBody?.accountNumber) return { accountNumber: eData.responseBody.accountNumber, bankName: eData.responseBody.bankName ?? "Monnify" };
      }
    }
  } catch { /* fall through to create */ }

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
      getAllAvailableBanks: true,
    }),
  });
  const data = await res.json() as {
    requestSuccessful: boolean;
    responseMessage?: string;
    responseCode?: string;
    responseBody: { accounts?: Array<{ bankName: string; accountNumber: string }>; accountNumber?: string; bankName?: string };
  };
  if (!data.requestSuccessful) {
    throw new Error(`Monnify DVA creation failed [${data.responseCode ?? "?"}]: ${data.responseMessage ?? JSON.stringify(data)}`);
  }
  const accounts = data.responseBody?.accounts;
  if (accounts?.length) return { accountNumber: accounts[0].accountNumber, bankName: accounts[0].bankName };
  if (data.responseBody?.accountNumber) return { accountNumber: data.responseBody.accountNumber, bankName: data.responseBody.bankName ?? "Monnify" };
  throw new Error("Monnify DVA creation returned success but no account number in response");
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
