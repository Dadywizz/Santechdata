/**
 * Nellobytesystems Integration Layer
 * Docs: https://nellobytesystems.com/APIDocs.asp
 * Env vars: NELLOBYTE_USERID, NELLOBYTE_APIKEY
 *
 * Covers: Airtime, Data, Cable TV (DStv/GOtv/StarTimes), Electricity, WAEC, JAMB
 * NOTE: Server IP must be whitelisted on Nellobytesystems dashboard.
 *
 * Network IDs: MTN=1 (or "01"), AIRTEL=2, GLO=3, 9MOBILE=4
 * Cable IDs:   DSTV=1, GOTV=2, STARTIMES=3
 */

const BASE = "https://nellobytesystems.com";

// In-memory credentials — loaded from env at startup, overrideable from DB via admin settings
let _userId = process.env.NELLOBYTE_USERID ?? "";
let _apiKey = process.env.NELLOBYTE_APIKEY ?? "";

export function setNellobytecredentials(apiKey: string, userId: string): void {
  if (apiKey) _apiKey = apiKey;
  if (userId) _userId = userId;
}

export function isNellobyteconfigured(): boolean {
  return !!(_userId && _apiKey);
}

const authParams = () => ({
  UserID: _userId,
  APIKey: _apiKey,
});

const NETWORK_ID: Record<string, string> = {
  MTN: "01",
  AIRTEL: "02",
  GLO: "03",
  "9MOBILE": "04",
};

const CABLE_ID: Record<string, string> = {
  dstv: "01",
  gotv: "02",
  startimes: "03",
};

// ─── Airtime ─────────────────────────────────────────────────────────────────

export async function nellobytePurchaseAirtime(opts: {
  network: string; phone: string; amount: number; requestId: string;
}): Promise<{ status: string; message?: string }> {
  const networkId = NETWORK_ID[opts.network.toUpperCase()] ?? opts.network;
  const body = new URLSearchParams({
    ...authParams(),
    NetworkID: networkId,
    MobileNumber: opts.phone,
    Amount: opts.amount.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APIAirtimeV1.asp`, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Nellobyte non-JSON: ${text.slice(0, 200)}`); }
}

// ─── Data ────────────────────────────────────────────────────────────────────

export async function nellobytePurchaseData(opts: {
  network: string; phone: string; planId: string; amount: number; requestId: string;
}): Promise<{ status: string; message?: string }> {
  const networkId = NETWORK_ID[opts.network.toUpperCase()] ?? opts.network;
  const body = new URLSearchParams({
    ...authParams(),
    NetworkID: networkId,
    MobileNumber: opts.phone,
    DataPlan: opts.planId,
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APIDataV1.asp`, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Nellobyte non-JSON: ${text.slice(0, 200)}`); }
}

// ─── Electricity ─────────────────────────────────────────────────────────────

export async function nellobyteVerifyMeter(opts: {
  meterNumber: string; networkId: string; meterType: string;
}): Promise<{ status: string; message?: string; CustomerName?: string; CustomerAddress?: string }> {
  const body = new URLSearchParams({
    ...authParams(),
    NetworkID: opts.networkId,
    MeterNumber: opts.meterNumber,
    MeterType: opts.meterType,
  });
  const res = await fetch(`${BASE}/APIElectricityVerify.asp`, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Nellobyte non-JSON: ${text.slice(0, 200)}`); }
}

export async function nellobytePayElectricity(opts: {
  meterNumber: string; networkId: string; meterType: string;
  amount: number; phone: string; requestId: string;
}): Promise<{ status: string; message?: string; token?: string; Token?: string }> {
  const body = new URLSearchParams({
    ...authParams(),
    NetworkID: opts.networkId,
    MeterNumber: opts.meterNumber,
    MeterType: opts.meterType,
    Amount: opts.amount.toString(),
    PhoneNumber: opts.phone,
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APIElectricityV1.asp`, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Nellobyte non-JSON: ${text.slice(0, 200)}`); }
}

// ─── Cable TV ────────────────────────────────────────────────────────────────

export async function nellobyteVerifySmartcard(opts: {
  smartcardNumber: string; cableId: string;
}): Promise<{ status: string; message?: string; CustomerName?: string; CustomerDue?: string; CustomerPackage?: string }> {
  const body = new URLSearchParams({
    ...authParams(),
    CableID: opts.cableId,
    SmartCardNumber: opts.smartcardNumber,
  });
  const res = await fetch(`${BASE}/APIVerifySmartCardV1.asp`, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Nellobyte non-JSON: ${text.slice(0, 200)}`); }
}

export async function nellobyteCableSubscribe(opts: {
  cableId: string; smartcardNumber: string; planId: string;
  amount: number; phone: string; requestId: string;
}): Promise<{ status: string; message?: string }> {
  const body = new URLSearchParams({
    ...authParams(),
    CableID: opts.cableId,
    SmartCardNumber: opts.smartcardNumber,
    CablePlan: opts.planId,
    Amount: opts.amount.toString(),
    PhoneNumber: opts.phone,
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE}/APICableTVV1.asp`, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Nellobyte non-JSON: ${text.slice(0, 200)}`); }
}

// ─── Exam Pins ────────────────────────────────────────────────────────────────

export async function nellobyteGetExamPins(opts: {
  examType: string; quantity: number; requestId: string;
}): Promise<{ status: string; message?: string; Pins?: string[] }> {
  const type = opts.examType.toUpperCase();
  const endpoint = type.includes("JAMB")
    ? `${BASE}/APIJambV1.asp`
    : `${BASE}/APIWaecV1.asp`;
  const body = new URLSearchParams({
    ...authParams(),
    Quantity: opts.quantity.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch(endpoint, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Nellobyte non-JSON: ${text.slice(0, 200)}`); }
}

export { CABLE_ID as NELLOBYTE_CABLE_ID };
