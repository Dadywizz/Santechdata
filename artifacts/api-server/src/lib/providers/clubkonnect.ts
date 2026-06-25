/**
 * Clubkonnect (clubkonnect.com) VTU Provider
 * API Base: https://www.clubkonnect.com/api/v2/
 * Auth: UserID (phone) + APIKey in every request body
 */

const BASE = "https://www.clubkonnect.com/api/v2";

// UserID is the registered phone number — loaded from env
let _userId  = process.env.CLUBKONNECT_PHONE ?? "";
let _apiKey  = process.env.CLUBKONNECT_APIKEY ?? "";

export function setClubkonnectApiKey(key: string): void { if (key) _apiKey = key; }
export function setClubkonnectUserId(id: string): void  { if (id) _userId  = id; }

export function isClubkonnectConfigured(): boolean {
  return !!_apiKey && !!_userId;
}

function auth() {
  return { UserID: _userId, APIKey: _apiKey };
}

async function ckFetch(path: string, body: Record<string, unknown>): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...auth(), ...body }),
      signal: controller.signal,
    });
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

async function ckGet(path: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${BASE}${path}&UserID=${encodeURIComponent(_userId)}&APIKey=${encodeURIComponent(_apiKey)}`, {
      signal: controller.signal,
    });
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

// ── Balance (used to test connection) ─────────────────────────────────────────
export async function clubkonnectGetBalance(): Promise<{ balance?: number; message?: string }> {
  const r = await ckGet("/balance/?");
  const bal = parseFloat(r.Balance ?? r.balance ?? r.data?.balance ?? "NaN");
  return { balance: isNaN(bal) ? undefined : bal, message: r.message };
}

// ── Data ──────────────────────────────────────────────────────────────────────
export async function clubkonnectPurchaseData(opts: { plan: number | string; mobile_number: string; network?: string }) {
  return ckFetch("/data/", {
    MobileNumber: opts.mobile_number,
    DataPlan:     String(opts.plan),
    Network:      (opts.network ?? "").toUpperCase(),
  });
}

// ── Airtime ───────────────────────────────────────────────────────────────────
export async function clubkonnectPurchaseAirtime(opts: { network: string; amount: number; mobile_number: string }) {
  return ckFetch("/airtime/", {
    MobileNumber: opts.mobile_number,
    Amount:       String(opts.amount),
    Network:      opts.network.toUpperCase(),
    AirtimeType:  "VTU",
  });
}

// ── Electricity ───────────────────────────────────────────────────────────────
export async function clubkonnectVerifyMeter(opts: { meter_number: string; discoid: number | string; meter_type: string }) {
  return ckGet(`/meterverify/?MeterNo=${encodeURIComponent(opts.meter_number)}&DiscoID=${encodeURIComponent(opts.discoid)}&MeterType=${encodeURIComponent(opts.meter_type)}`);
}

export async function clubkonnectPurchaseElectricity(opts: { discoid: number | string; MeterType: string; meter_number: string; amount: number }) {
  return ckFetch("/electricity/", {
    MeterNo:  opts.meter_number,
    Amount:   String(opts.amount),
    DiscoID:  String(opts.discoid),
    MeterType: opts.MeterType,
  });
}

// ── Cable TV ──────────────────────────────────────────────────────────────────
export async function clubkonnectVerifySmartcard(opts: { smart_card_number: string; cable_name: string }) {
  return ckGet(`/smartcardverify/?SmartCardNo=${encodeURIComponent(opts.smart_card_number)}&CableType=${encodeURIComponent(opts.cable_name)}`);
}

export async function clubkonnectPurchaseCable(opts: { plan_id: number | string; smart_card_number: string; cable_name?: string }) {
  return ckFetch("/cabletv/", {
    SmartCardNo: opts.smart_card_number,
    CableType:   (opts.cable_name ?? "DSTV").toUpperCase(),
    CablePlan:   String(opts.plan_id),
  });
}

// ── Exam Pins ─────────────────────────────────────────────────────────────────
export async function clubkonnectPurchaseExam(opts: { examCode: string; quantity: number }) {
  const code = opts.examCode.toUpperCase();
  const path = code === "WAEC" ? "/waec/" : code === "NECO" ? "/neco/" : code === "JAMB" ? "/jamb/" : "/nabteb/";
  return ckFetch(path, { Quantity: String(opts.quantity) });
}
