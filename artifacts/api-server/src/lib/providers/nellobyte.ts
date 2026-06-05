/**
 * Nellobytesystems Integration Layer
 * Docs: https://nellobytesystems.com/APIDocs.asp
 * Env vars: NELLOBYTE_USERID, NELLOBYTE_APIKEY
 *
 * Covers: Airtime, Cable TV (DStv/GOtv/StarTimes), WAEC, JAMB
 * NOTE: Server IP must be whitelisted on Nellobytesystems dashboard.
 *
 * Network IDs: MTN=1 (or "01"), AIRTEL=2, GLO=3, 9MOBILE=4
 * Cable IDs:   DSTV=1, GOTV=2, STARTIMES=3
 */

const BASE = "https://nellobytesystems.com";

const authParams = () => ({
  UserID: process.env.NELLOBYTE_USERID ?? "",
  APIKey: process.env.NELLOBYTE_APIKEY ?? "",
});

export function isNellobyteconfigured(): boolean {
  return !!(process.env.NELLOBYTE_USERID && process.env.NELLOBYTE_APIKEY);
}

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

// ─── Exam Pins (fallback for WAEC/JAMB if Clubkonnect fails) ─────────────────

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
