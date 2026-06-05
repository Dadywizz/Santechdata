/**
 * VTpass Integration Layer
 * Docs: https://vtpass.com.ng/documentation
 * Set env vars: VTPASS_API_KEY, VTPASS_PUBLIC_KEY, VTPASS_SECRET_KEY
 * Base URL (sandbox): https://sandbox.vtpass.com.ng
 * Base URL (live):    https://vtpass.com.ng
 */

const BASE_URL = process.env.VTPASS_SANDBOX === "true"
  ? "https://sandbox.vtpass.com.ng/api"
  : "https://vtpass.com.ng/api";

const headers = () => ({
  "Content-Type": "application/json",
  "api-key": process.env.VTPASS_API_KEY ?? "",
  "public-key": process.env.VTPASS_PUBLIC_KEY ?? "",
  "secret-key": process.env.VTPASS_SECRET_KEY ?? "",
});

export async function vtpassVerifyMeter(providerCode: string, meterNumber: string, meterType: "prepaid" | "postpaid") {
  const res = await fetch(`${BASE_URL}/merchant-verify`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ serviceID: providerCode.toLowerCase(), billersCode: meterNumber, type: meterType }),
  });
  return res.json() as Promise<{ code: string; content: { Customer_Name: string; Address: string } }>;
}

export async function vtpassPayElectricity(opts: {
  requestId: string; providerCode: string; meterNumber: string;
  meterType: "prepaid" | "postpaid"; amount: number; phone: string;
}) {
  const res = await fetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      request_id: opts.requestId,
      serviceID: opts.providerCode.toLowerCase(),
      billersCode: opts.meterNumber,
      variation_code: opts.meterType,
      amount: opts.amount,
      phone: opts.phone,
    }),
  });
  return res.json() as Promise<{ code: string; content: { transactions: { token: string; status: string } } }>;
}

export async function vtpassVerifySmartcard(providerCode: string, smartcardNumber: string) {
  const res = await fetch(`${BASE_URL}/merchant-verify`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ serviceID: providerCode.toLowerCase(), billersCode: smartcardNumber }),
  });
  return res.json() as Promise<{ code: string; content: { Customer_Name: string } }>;
}

export async function vtpassCableSubscribe(opts: {
  requestId: string; providerCode: string; smartcardNumber: string; variationCode: string; amount: number; phone: string;
}) {
  const res = await fetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      request_id: opts.requestId,
      serviceID: opts.providerCode.toLowerCase(),
      billersCode: opts.smartcardNumber,
      variation_code: opts.variationCode,
      amount: opts.amount,
      phone: opts.phone,
    }),
  });
  return res.json() as Promise<{ code: string; content: { transactions: { status: string } } }>;
}

export async function vtpassPurchaseData(opts: {
  requestId: string; network: string; phone: string; variationCode: string; amount: number;
}) {
  const NETWORK_MAP: Record<string, string> = { MTN: "mtn-data", AIRTEL: "airtel-data", GLO: "glo-data", "9MOBILE": "etisalat-data" };
  const res = await fetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      request_id: opts.requestId,
      serviceID: NETWORK_MAP[opts.network] ?? opts.network.toLowerCase(),
      billersCode: opts.phone,
      variation_code: opts.variationCode,
      amount: opts.amount,
      phone: opts.phone,
    }),
  });
  return res.json() as Promise<{ code: string; content: { transactions: { status: string } } }>;
}

export async function vtpassPurchaseAirtime(opts: {
  requestId: string; network: string; phone: string; amount: number;
}) {
  const NETWORK_MAP: Record<string, string> = { MTN: "mtn", AIRTEL: "airtel", GLO: "glo", "9MOBILE": "etisalat" };
  const res = await fetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      request_id: opts.requestId,
      serviceID: NETWORK_MAP[opts.network.toUpperCase()] ?? opts.network.toLowerCase(),
      billersCode: opts.phone,
      amount: opts.amount,
      phone: opts.phone,
    }),
    signal: AbortSignal.timeout(30000),
  });
  return res.json() as Promise<{ code: string; content: { transactions: { status: string } } }>;
}

// Exam token purchase
// VTpass serviceID mapping: WAEC→waec, NECO→neco, JAMB→jamb-utme, NABTEB→nabteb
const EXAM_VTPASS_MAP: Record<string, { serviceID: string; variationCode: string }> = {
  WAEC: { serviceID: "waec", variationCode: "waec-registration-card" },
  NECO: { serviceID: "neco", variationCode: "neco-result-checker-pin" },
  JAMB: { serviceID: "jamb-utme", variationCode: "utme-registration" },
  NABTEB: { serviceID: "nabteb", variationCode: "nabteb-pin" },
};

export async function vtpassPurchaseExam(opts: {
  requestId: string; examCode: string; phone: string; quantity: number; amount: number;
}) {
  const mapping = EXAM_VTPASS_MAP[opts.examCode.toUpperCase()] ?? {
    serviceID: opts.examCode.toLowerCase(),
    variationCode: opts.examCode.toLowerCase(),
  };
  const res = await fetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      request_id: opts.requestId,
      serviceID: mapping.serviceID,
      billersCode: opts.phone,
      variation_code: mapping.variationCode,
      amount: opts.amount,
      phone: opts.phone,
      quantity: opts.quantity,
    }),
    signal: AbortSignal.timeout(30000),
  });
  return res.json() as Promise<{
    code: string;
    content: {
      transactions: { status: string; token?: string; tokens?: string[] };
      rawOutput?: string;
    };
  }>;
}

export function isVtpassConfigured(): boolean {
  return !!(process.env.VTPASS_API_KEY && process.env.VTPASS_SECRET_KEY);
}
