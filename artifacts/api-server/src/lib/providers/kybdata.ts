/**
 * KYB Data (kybdatassub.com.ng) Integration Layer
 * Docs: https://documenter.getpostman.com/view/19770942/2sBXVmg9QC
 *
 * Auth: POST /api/v2/create-api-key with {username, password} → returns {token}
 *       Then use: Authorization: Bearer <token> on all requests
 *
 * Base URL: https://api.kybdatassub.com.ng
 */

const BASE = "https://api.kybdatassub.com.ng";

let _token = process.env.KYBDATA_API_TOKEN ?? "";

export function setKybdataToken(token: string): void {
  if (token) _token = token;
}

export function isKybdataConfigured(): boolean {
  return !!_token;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${_token}`,
  };
}

async function kybFetch(url: string, opts: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { ...headers(), ...(opts.headers as Record<string, string> ?? {}) },
    });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error(`KYB Data non-JSON response: ${text.slice(0, 300)}`); }
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("KYB Data request timed out. Please try again.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function kybdataCreateApiKey(username: string, password: string): Promise<{ token?: string; message?: string }> {
  const res = await fetch(`${BASE}/api/v2/create-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`KYB non-JSON: ${text.slice(0, 200)}`); }
}

// ─── Account ─────────────────────────────────────────────────────────────────

export async function kybdataGetBalance(): Promise<{ balance?: number; message?: string }> {
  return kybFetch(`${BASE}/api/v2/balance`);
}

// ─── Plans (for admin sync) ───────────────────────────────────────────────────

export async function kybdataGetDataPlans(): Promise<Array<{ id: number; name: string; network: string; price: number; validity?: string; size?: string }>> {
  const data = await kybFetch(`${BASE}/api/v2/services/data`);
  return Array.isArray(data) ? data : (data.data ?? data.services ?? []);
}

export async function kybdataGetAirtimeNetworks(): Promise<Array<{ id: number; name: string }>> {
  const data = await kybFetch(`${BASE}/api/v2services/airtime`);
  return Array.isArray(data) ? data : (data.data ?? data.services ?? []);
}

export async function kybdataGetCablePlans(): Promise<Array<{ id: number; name: string; provider?: string; price?: number }>> {
  const data = await kybFetch(`${BASE}/api/v2/services/cable`);
  return Array.isArray(data) ? data : (data.data ?? data.services ?? []);
}

export async function kybdataGetElectricityDiscos(): Promise<Array<{ id: number; name: string }>> {
  const data = await kybFetch(`${BASE}/api/v2/services/electricity`);
  return Array.isArray(data) ? data : (data.data ?? data.services ?? []);
}

export async function kybdataGetExamTypes(): Promise<Array<{ id: number; name: string; price?: number }>> {
  const data = await kybFetch(`${BASE}/api/v2/services/resultcheck`);
  return Array.isArray(data) ? data : (data.data ?? data.services ?? []);
}

// ─── Validation ───────────────────────────────────────────────────────────────

export async function kybdataVerifyMeter(opts: {
  meter_number: string; discoid: number | string; meter_type: string;
}): Promise<{ customer_name?: string; address?: string; message?: string; status?: string }> {
  return kybFetch(
    `${BASE}/api/v2/validation/electricity?meter_number=${encodeURIComponent(opts.meter_number)}&discoid=${opts.discoid}&meter_type=${encodeURIComponent(opts.meter_type.toUpperCase())}`
  );
}

export async function kybdataVerifySmartcard(opts: {
  smart_card_number: string; cable_name: string;
}): Promise<{ customer_name?: string; current_plan?: string; message?: string; status?: string }> {
  return kybFetch(
    `${BASE}/api/v2/validation/cable?smart_card_number=${encodeURIComponent(opts.smart_card_number)}&cable_name=${encodeURIComponent(opts.cable_name.toUpperCase())}`
  );
}

// ─── Purchases ───────────────────────────────────────────────────────────────

// KYB Data airtime uses numeric network IDs, NOT text names
const KYB_AIRTIME_NETWORK_ID: Record<string, string> = {
  mtn: "1", glo: "2", airtel: "3", "9mobile": "4", etisalat: "4",
};

export async function kybdataPurchaseAirtime(opts: {
  network: string; amount: number; mobile_number: string;
}): Promise<{ status?: string; message?: string; transaction_id?: string }> {
  const networkId = KYB_AIRTIME_NETWORK_ID[opts.network.toLowerCase()] ?? "1";
  return kybFetch(`${BASE}/api/v2/purchase/airtime`, {
    method: "POST",
    body: JSON.stringify({ network: networkId, amount: opts.amount, mobile_number: opts.mobile_number }),
  });
}

export async function kybdataPurchaseData(opts: {
  plan: number | string; mobile_number: string;
}): Promise<{ status?: string; message?: string; transaction_id?: string }> {
  return kybFetch(`${BASE}/api/v2/purchase/data`, {
    method: "POST",
    body: JSON.stringify({ plan: opts.plan, mobile_number: opts.mobile_number }),
  });
}

export async function kybdataPurchaseCable(opts: {
  plan_id: number | string; smart_card_number: string;
}): Promise<{ status?: string; message?: string; transaction_id?: string }> {
  return kybFetch(`${BASE}/api/v2/purchase/cable`, {
    method: "POST",
    body: JSON.stringify({ plan_id: opts.plan_id, smart_card_number: opts.smart_card_number }),
  });
}

export async function kybdataPurchaseElectricity(opts: {
  discoid: number | string; MeterType: string; meter_number: string; amount: number;
}): Promise<{ status?: string; message?: string; token?: string; transaction_id?: string }> {
  return kybFetch(`${BASE}/api/v2/purchase/electricity`, {
    method: "POST",
    body: JSON.stringify({ discoid: opts.discoid, MeterType: opts.MeterType.toUpperCase(), meter_number: opts.meter_number, amount: opts.amount }),
  });
}

export async function kybdataPurchaseExam(opts: {
  examid: number | string; quantity: number;
}): Promise<{ status?: string; message?: string; pins?: Array<{ pin: string; serial: string }> }> {
  return kybFetch(`${BASE}/api/v2/purchase/resultcheck`, {
    method: "POST",
    body: JSON.stringify({ examid: opts.examid, quantity: opts.quantity }),
  });
}
