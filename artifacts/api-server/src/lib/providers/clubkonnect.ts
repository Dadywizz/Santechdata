/**
 * Clubkonnect VTU Provider
 * Balance check: https://www.clubkonnect.com/APIWalletBalance.asp (GET)
 * All other endpoints: https://www.nellobytesystems.com/ (GET)
 * Auth: UserID (e.g. CK101280559) + APIKey as query params on every request
 */

const BALANCE_URL = "https://www.clubkonnect.com/APIWalletBalance.asp";
const BASE        = "https://www.nellobytesystems.com";

let _userId = process.env.CLUBKONNECT_PHONE ?? "";   // env var name kept for backwards compat
let _apiKey = process.env.CLUBKONNECT_APIKEY ?? "";

export function setClubkonnectApiKey(key: string): void { if (key) _apiKey = key; }
export function setClubkonnectUserId(id: string): void  { if (id) _userId  = id; }

export function isClubkonnectConfigured(): boolean {
  return !!_apiKey && !!_userId;
}

function authQs(): string {
  return `UserID=${encodeURIComponent(_userId)}&APIKey=${encodeURIComponent(_apiKey)}`;
}

async function ckGet(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}${authQs()}`, { signal: controller.signal });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error(`Clubkonnect non-JSON: ${text.slice(0, 300)}`); }
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("Clubkonnect request timed out");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function networkCode(network: string): string {
  switch (network.toUpperCase()) {
    case "MTN":      return "1";
    case "GLO":      return "2";
    case "9MOBILE":
    case "ETISALAT": return "3";
    case "AIRTEL":   return "4";
    default:         return network;
  }
}

const DISCO_CODES: Record<string, string> = {
  EKEDC: "1", EKO: "1",
  IKEDC: "2", IKEJA: "2",
  AEDC:  "3", ABUJA: "3",
  PHEDC: "4", "PORT HARCOURT": "4",
  EEDC:  "5", ENUGU: "5",
  IBEDC: "6", IBADAN: "6",
  KAEDCO:"7", KADUNA: "7",
  JEDC:  "8", JOS: "8",
};

function discoCode(name: string): string {
  return DISCO_CODES[name.toUpperCase()] ?? name;
}

const CABLE_CODES: Record<string, string> = {
  DSTV: "1",
  GOTV: "2",
  STARTIMES: "3",
};

function cableCode(name: string): string {
  return CABLE_CODES[name.toUpperCase()] ?? "1";
}

// ── Balance (used to test connection) ─────────────────────────────────────────
export async function clubkonnectGetBalance(): Promise<{ balance?: number; message?: string }> {
  const r = await ckGet(BALANCE_URL);
  const bal = parseFloat(r.balance ?? r.Balance ?? "NaN");
  return { balance: isNaN(bal) ? undefined : bal, message: r.status };
}

// ── Data ──────────────────────────────────────────────────────────────────────
export async function clubkonnectGetDataPlans(network: string): Promise<any> {
  return ckGet(`${BASE}/APIDataPlansV2.asp?MobileNetwork=${networkCode(network)}`);
}

export async function clubkonnectPurchaseData(opts: {
  plan: number | string;
  mobile_number: string;
  network?: string;
  requestId?: string;
}) {
  return ckGet(
    `${BASE}/APIDataV2.asp?MobileNetwork=${networkCode(opts.network ?? "")}&DataPlan=${encodeURIComponent(String(opts.plan))}&MobileNumber=${encodeURIComponent(opts.mobile_number)}&RequestID=${encodeURIComponent(opts.requestId ?? Date.now().toString())}`
  );
}

// ── Airtime ───────────────────────────────────────────────────────────────────
export async function clubkonnectPurchaseAirtime(opts: {
  network: string;
  amount: number;
  mobile_number: string;
  requestId?: string;
}) {
  return ckGet(
    `${BASE}/APIAirtimeVTU.asp?MobileNetwork=${networkCode(opts.network)}&AirtimeType=VTU&AirtimeAmount=${opts.amount}&MobileNumber=${encodeURIComponent(opts.mobile_number)}&RequestID=${encodeURIComponent(opts.requestId ?? Date.now().toString())}`
  );
}

// ── Electricity ───────────────────────────────────────────────────────────────
export async function clubkonnectVerifyMeter(opts: {
  meter_number: string;
  discoid: number | string;
  meter_type: string;
}) {
  const meterType = String(opts.meter_type).toLowerCase() === "prepaid" || String(opts.meter_type) === "1" ? "1" : "2";
  return ckGet(
    `${BASE}/APIElectricityVerify.asp?ElectricCompany=${discoCode(String(opts.discoid))}&MeterType=${meterType}&MeterNumber=${encodeURIComponent(opts.meter_number)}`
  );
}

export async function clubkonnectPurchaseElectricity(opts: {
  discoid: number | string;
  MeterType: string;
  meter_number: string;
  amount: number;
  requestId?: string;
}) {
  const meterType = String(opts.MeterType).toLowerCase() === "prepaid" || String(opts.MeterType) === "1" ? "1" : "2";
  return ckGet(
    `${BASE}/APIElectricity.asp?ElectricCompany=${discoCode(String(opts.discoid))}&MeterType=${meterType}&MeterNumber=${encodeURIComponent(opts.meter_number)}&Amount=${opts.amount}&RequestID=${encodeURIComponent(opts.requestId ?? Date.now().toString())}`
  );
}

// ── Cable TV ──────────────────────────────────────────────────────────────────
export async function clubkonnectGetCablePlans(cableName: string): Promise<any> {
  return ckGet(`${BASE}/APICableTVPlansV2.asp?CableTV=${cableCode(cableName)}`);
}

export async function clubkonnectVerifySmartcard(opts: {
  smart_card_number: string;
  cable_name: string;
}) {
  return ckGet(
    `${BASE}/APICableTVVerify.asp?CableTV=${cableCode(opts.cable_name)}&SmartCardNo=${encodeURIComponent(opts.smart_card_number)}`
  );
}

export async function clubkonnectPurchaseCable(opts: {
  plan_id: number | string;
  smart_card_number: string;
  cable_name?: string;
  requestId?: string;
}) {
  return ckGet(
    `${BASE}/APICableTVV2.asp?CableTV=${cableCode(opts.cable_name ?? "DSTV")}&Package=${encodeURIComponent(String(opts.plan_id))}&SmartCardNo=${encodeURIComponent(opts.smart_card_number)}&RequestID=${encodeURIComponent(opts.requestId ?? Date.now().toString())}`
  );
}

// ── Exam Pins ─────────────────────────────────────────────────────────────────
export async function clubkonnectPurchaseExam(opts: {
  examCode: string;
  quantity: number;
  requestId?: string;
}) {
  const code = opts.examCode.toUpperCase();
  const endpoint = code === "JAMB"
    ? `${BASE}/APIBuyJAMBV1.asp`
    : `${BASE}/APIBuyWAECV1.asp`;  // WAEC, NECO, NABTEB
  return ckGet(
    `${endpoint}?Quantity=${opts.quantity}&RequestID=${encodeURIComponent(opts.requestId ?? Date.now().toString())}`
  );
}

// ── Query Transaction ─────────────────────────────────────────────────────────
export async function clubkonnectQueryOrder(orderId: string): Promise<any> {
  return ckGet(`${BASE}/APIQuery.asp?OrderID=${encodeURIComponent(orderId)}`);
}
