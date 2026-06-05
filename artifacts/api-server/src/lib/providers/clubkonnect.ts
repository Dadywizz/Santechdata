/**
 * Clubkonnect Integration Layer
 * Docs: https://www.clubkonnect.com/APIDocs.asp
 *
 * Auth rules (discovered via live testing):
 *   - Data bundle endpoint → Password auth (UserID=phone, Password=login password)
 *   - All other endpoints  → APIKey auth  (UserID=phone, APIKey=generated key)
 *
 * Error codes:
 *   INVALID_CREDENTIALS3 = IP not whitelisted
 *   INVALID_CREDENTIALS2 = wrong Password
 *   INVALID_CREDENTIALS  = wrong APIKey
 *
 * Network IDs: MTN=1, AIRTEL=2, GLO=3, 9MOBILE=4
 */

const BASE = "https://www.clubkonnect.com";

const authApiKey = () => ({
  UserID: process.env.CLUBKONNECT_PHONE ?? "",
  APIKey: process.env.CLUBKONNECT_APIKEY ?? "",
});

const authPassword = () => ({
  UserID: process.env.CLUBKONNECT_PHONE ?? "",
  Password: process.env.CLUBKONNECT_PASSWORD ?? "",
});

export function isClubkonnectConfigured(): boolean {
  return !!(process.env.CLUBKONNECT_PHONE && process.env.CLUBKONNECT_APIKEY);
}

// ─── Network helpers ────────────────────────────────────────────────────────

const NETWORK_ID: Record<string, string> = {
  MTN: "1",
  AIRTEL: "2",
  GLO: "3",
  "9MOBILE": "4",
};

// ─── Data Plans ──────────────────────────────────────────────────────────────

export interface CKDataPlan {
  DataPlanID: string;
  DataPlan: string;
  DataPlanName: string;
  DataPlanValidity: string;
  DataPlanPrice: string;
}

export async function clubkonnectGetDataPlans(network: string): Promise<CKDataPlan[]> {
  const networkId = NETWORK_ID[network.toUpperCase()] ?? network;
  const body = new URLSearchParams({ ...authPassword(), NetworkID: networkId });
  const res = await fetch(`${BASE}/APIGetDatabundlePlanV1.asp`, { method: "POST", body });
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { DataPlans?: CKDataPlan[] };
    return json.DataPlans ?? [];
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}

export async function clubkonnectPurchaseData(opts: {
  network: string; phone: string; planId: string; requestId: string;
}): Promise<{ status: string; message: string }> {
  const networkId = NETWORK_ID[opts.network.toUpperCase()] ?? opts.network;
  const body = new URLSearchParams({
    ...authPassword(),
    NetworkID: networkId,
    MobileNumber: opts.phone,
    DataPlan: opts.planId,
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APIEPINDatabundleV1.asp`, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}

// ─── Airtime ─────────────────────────────────────────────────────────────────

export async function clubkonnectPurchaseAirtime(opts: {
  network: string; phone: string; amount: number; requestId: string;
}): Promise<{ status: string; message: string }> {
  const networkId = NETWORK_ID[opts.network.toUpperCase()] ?? opts.network;
  const body = new URLSearchParams({
    ...authApiKey(),
    NetworkID: networkId,
    MobileNumber: opts.phone,
    Amount: opts.amount.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APIAirtimeV1.asp`, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}

// ─── Electricity ─────────────────────────────────────────────────────────────

export async function clubkonnectVerifyMeter(opts: {
  meterNumber: string; networkId: string; meterType: string;
}): Promise<{ status: string; message: string; CustomerName?: string; CustomerAddress?: string }> {
  const body = new URLSearchParams({
    ...authApiKey(),
    MeterNumber: opts.meterNumber,
    NetworkID: opts.networkId,
    MeterType: opts.meterType,
  });
  const res = await fetch(`${BASE}/APIVerifyMeterV1.asp`, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}

export async function clubkonnectPayElectricity(opts: {
  meterNumber: string; networkId: string; meterType: string;
  amount: number; phone: string; requestId: string;
}): Promise<{ status: string; message: string; token?: string }> {
  const body = new URLSearchParams({
    ...authApiKey(),
    MeterNumber: opts.meterNumber,
    NetworkID: opts.networkId,
    MeterType: opts.meterType,
    Amount: opts.amount.toString(),
    PhoneNumber: opts.phone,
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APIElectricityV1.asp`, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}

// ─── Cable TV ────────────────────────────────────────────────────────────────

export async function clubkonnectVerifySmartcard(opts: {
  smartcardNumber: string; networkId: string;
}): Promise<{ status: string; message: string; CustomerName?: string }> {
  const body = new URLSearchParams({
    ...authApiKey(),
    SmartCardNumber: opts.smartcardNumber,
    NetworkID: opts.networkId,
  });
  const res = await fetch(`${BASE}/APIVerifySmartCardV1.asp`, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}

export async function clubkonnectCableSubscribe(opts: {
  smartcardNumber: string; networkId: string; planId: string;
  amount: number; phone: string; requestId: string;
}): Promise<{ status: string; message: string }> {
  const body = new URLSearchParams({
    ...authApiKey(),
    SmartCardNumber: opts.smartcardNumber,
    NetworkID: opts.networkId,
    DataPlan: opts.planId,
    Amount: opts.amount.toString(),
    PhoneNumber: opts.phone,
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APICableV1.asp`, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}

// ─── Exam Pins ───────────────────────────────────────────────────────────────

export async function clubkonnectGetExamPins(opts: {
  examType: string; quantity: number; requestId: string;
}): Promise<{ status: string; message: string; Pins?: string[] }> {
  const type = opts.examType.toUpperCase();
  const endpoint = type.includes("JAMB")
    ? `${BASE}/APIJambV1.asp`
    : type.includes("NECO")
    ? `${BASE}/APINecoV1.asp`
    : type.includes("NABTEB")
    ? `${BASE}/APINabtebV1.asp`
    : `${BASE}/APIWaecV1.asp`;

  const body = new URLSearchParams({
    ...authApiKey(),
    Quantity: opts.quantity.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch(endpoint, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 300)}`);
  }
}
