/**
 * VTpass Integration Layer
 * Docs: https://vtpass.com/documentation
 * Auth: public-key + secret-key request headers (api-key not required)
 * Base URL (live): https://api-service.vtpass.com/api
 *
 * Confirmed working service IDs on this account:
 *   Airtime:     mtn, airtel, glo, etisalat  (flexible amount — no variation_code)
 *   Data:        mtn-data, airtel-data, glo-data, etisalat-data
 *   Electricity: ikeja-electric, eko-electric, abuja-electric, kano-electric,
 *                portharcourt-electric, jos-electric, kaduna-electric, enugu-electric,
 *                ibadan-electric, benin-electric, aba-electric, yola-electric
 *   Cable:       startimes  (dstv/gotv not available on this account)
 *   Exam:        waec (variation_code: waecdirect)
 */

import { customFetch } from "../custom-fetch";

const BASE_URL = "https://api-service.vtpass.com/api";

const NETWORK_AIRTIME: Record<string, string> = {
  MTN: "mtn", AIRTEL: "airtel", GLO: "glo", "9MOBILE": "etisalat",
};
const NETWORK_DATA: Record<string, string> = {
  MTN: "mtn-data", AIRTEL: "airtel-data", GLO: "glo-data", "9MOBILE": "etisalat-data",
};

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "public-key": process.env.VTPASS_PUBLIC_KEY ?? "",
    "secret-key": process.env.VTPASS_SECRET_KEY ?? "",
  };
}

/** Build a URL-encoded body for transactional POST requests.
 *  VTpass requires api_key in the form body for /pay and /merchant-verify. */
function formBody(fields: Record<string, string | number>): string {
  const apiKey = process.env.VTPASS_API_KEY ?? "";
  const params = new URLSearchParams();
  if (apiKey && apiKey !== "null") params.set("api_key", apiKey);
  for (const [k, v] of Object.entries(fields)) {
    params.set(k, String(v));
  }
  return params.toString();
}

function makeRequestId(): string {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    String(now.getMilliseconds()).padStart(3, "0") +
    String(Math.floor(Math.random() * 9000) + 1000)
  );
}

export function isVtpassConfigured(): boolean {
  return !!(process.env.VTPASS_PUBLIC_KEY && process.env.VTPASS_SECRET_KEY);
}

// ─── Airtime ─────────────────────────────────────────────────────────────────

export async function vtpassPurchaseAirtime(opts: {
  network: string; phone: string; amount: number;
}): Promise<{ code: string; content?: Record<string, unknown> }> {
  const serviceID = NETWORK_AIRTIME[opts.network.toUpperCase()] ?? opts.network.toLowerCase();
  const res = await customFetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: formBody({
      request_id: makeRequestId(),
      serviceID,
      billersCode: opts.phone,
      amount: opts.amount,
      phone: opts.phone,
    }),
  });
  return res.json() as Promise<{ code: string; content?: Record<string, unknown> }>;
}

// ─── Data ────────────────────────────────────────────────────────────────────

export async function vtpassPurchaseData(opts: {
  network: string; phone: string; variationCode: string; amount: number;
}): Promise<{ code: string; content?: Record<string, unknown> }> {
  const serviceID = NETWORK_DATA[opts.network.toUpperCase()] ?? (opts.network.toLowerCase() + "-data");
  const res = await customFetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: formBody({
      request_id: makeRequestId(),
      serviceID,
      billersCode: opts.phone,
      variation_code: opts.variationCode,
      amount: opts.amount,
      phone: opts.phone,
    }),
  });
  return res.json() as Promise<{ code: string; content?: Record<string, unknown> }>;
}

// ─── Electricity ─────────────────────────────────────────────────────────────

export async function vtpassVerifyMeter(opts: {
  serviceID: string; meterNumber: string; meterType: string;
}): Promise<{ code: string; content?: { Customer_Name?: string; Address?: string } }> {
  const res = await customFetch(`${BASE_URL}/merchant-verify`, {
    method: "POST",
    headers: headers(),
    body: formBody({
      billersCode: opts.meterNumber,
      serviceID: opts.serviceID,
      type: opts.meterType,
    }),
  });
  return res.json() as Promise<{ code: string; content?: { Customer_Name?: string; Address?: string } }>;
}

export async function vtpassPayElectricity(opts: {
  serviceID: string; meterNumber: string; meterType: string;
  amount: number; phone: string;
}): Promise<{ code: string; content?: Record<string, unknown> }> {
  const res = await customFetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: formBody({
      request_id: makeRequestId(),
      serviceID: opts.serviceID,
      billersCode: opts.meterNumber,
      variation_code: opts.meterType,
      amount: opts.amount,
      phone: opts.phone,
    }),
  });
  return res.json() as Promise<{ code: string; content?: Record<string, unknown> }>;
}

// ─── Cable TV ────────────────────────────────────────────────────────────────

export async function vtpassVerifySmartcard(opts: {
  serviceID: string; smartcardNumber: string;
}): Promise<{ code: string; content?: { Customer_Name?: string; Status?: string } }> {
  const res = await customFetch(`${BASE_URL}/merchant-verify`, {
    method: "POST",
    headers: headers(),
    body: formBody({
      billersCode: opts.smartcardNumber,
      serviceID: opts.serviceID,
    }),
  });
  return res.json() as Promise<{ code: string; content?: { Customer_Name?: string; Status?: string } }>;
}

export async function vtpassCableSubscribe(opts: {
  serviceID: string; smartcardNumber: string; variationCode: string;
  amount: number; phone: string;
}): Promise<{ code: string; content?: Record<string, unknown> }> {
  const res = await customFetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: formBody({
      request_id: makeRequestId(),
      serviceID: opts.serviceID,
      billersCode: opts.smartcardNumber,
      variation_code: opts.variationCode,
      amount: opts.amount,
      phone: opts.phone,
      subscription_type: "change",
    }),
  });
  return res.json() as Promise<{ code: string; content?: Record<string, unknown> }>;
}

// ─── Exam Tokens ─────────────────────────────────────────────────────────────

export async function vtpassPurchaseExam(opts: {
  examCode: string; phone: string; quantity: number; amount: number;
}): Promise<{ code: string; content?: Record<string, unknown> }> {
  const code = opts.examCode.toUpperCase();
  if (!code.includes("WAEC")) {
    throw new Error(`Exam type ${opts.examCode} not supported on this VTpass account`);
  }
  const res = await customFetch(`${BASE_URL}/pay`, {
    method: "POST",
    headers: headers(),
    body: formBody({
      request_id: makeRequestId(),
      serviceID: "waec",
      billersCode: "0000000000",
      variation_code: "waecdirect",
      amount: opts.amount,
      phone: opts.phone,
      quantity: opts.quantity,
    }),
  });
  return res.json() as Promise<{ code: string; content?: Record<string, unknown> }>;
}
