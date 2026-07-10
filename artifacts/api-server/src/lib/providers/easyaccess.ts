/**
 * EasyAccess (easyaccess.com.ng) Integration Layer
 *
 * Base URL: https://easyaccess.com.ng/api/live/v1
 * Auth: Bearer token in Authorization header
 *
 * Token is loaded from the `easyaccess_api_token` DB setting (set via Admin → Settings)
 * or falls back to the EASYACCESS_API_TOKEN environment variable.
 *
 * Only electricity is wired through this provider for now (verify + purchase).
 */

const BASE = "https://easyaccess.com.ng/api/live/v1";

let _token = process.env.EASYACCESS_API_TOKEN ?? "";

export function setEasyaccessToken(token: string): void {
  if (token) _token = token;
}

export function isEasyaccessConfigured(): boolean {
  return !!_token;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${_token}`,
    "Cache-Control": "no-cache",
  };
}

async function easyaccessFetch(path: string, opts: RequestInit = {}) {
  const url = `${BASE}${path}`;
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
    catch { throw new Error(`EasyAccess non-JSON response: ${text.slice(0, 300)}`); }
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("EasyAccess request timed out. Please try again.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Account ─────────────────────────────────────────────────────────────────

export async function easyaccessGetBalance(): Promise<{ balance?: number; message?: string }> {
  const res = await easyaccessFetch("/wallet-balance");
  return { balance: res?.balance, message: res?.message };
}

// ─── Electricity company codes ────────────────────────────────────────────────
// Keyed by our canonical providerCode (see ELECTRICITY_PROVIDERS in services.ts)
export const EASYACCESS_ELEC_COMPANY_ID: Record<string, number> = {
  "ikeja-electric":        1,
  "abuja-electric":        3,
  "kaduna-electric":       4,
  "portharcourt-electric": 5,
  "ibadan-electric":       6,
  "jos-electric":          8,
  "kano-electric":         10,
};

function meterTypeCode(meterType: string): number {
  return meterType.toLowerCase() === "postpaid" ? 2 : 1;
}

function isSuccess(res: any): boolean {
  const status = String(res?.status ?? "").toLowerCase();
  return res?.code === 200 && (status === "success" || status === "successful");
}

// ─── Validation ───────────────────────────────────────────────────────────────

export async function easyaccessVerifyMeter(opts: {
  meter_number: string; providerCode: string; meter_type: string;
}): Promise<{ customer_name?: string; address?: string; message?: string; status?: string }> {
  const company = EASYACCESS_ELEC_COMPANY_ID[opts.providerCode.toLowerCase()];
  if (!company) {
    return { message: "This electricity provider is not supported by EasyAccess.", status: "failed" };
  }
  const res = await easyaccessFetch("/verify-electricity", {
    method: "POST",
    body: JSON.stringify({
      company,
      metertype: meterTypeCode(opts.meter_type),
      meterno: opts.meter_number,
      amount: 1000,
    }),
  });
  const ok = isSuccess(res);
  return {
    customer_name: ok ? (res?.data?.customer_name ?? res?.customer_name) : undefined,
    address: res?.data?.address ?? res?.address,
    message: res?.message,
    status: ok ? "success" : "failed",
  };
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export async function easyaccessPurchaseElectricity(opts: {
  meter_number: string; providerCode: string; MeterType: string; amount: number;
}): Promise<{ status?: string; message?: string; token?: string; transaction_id?: string }> {
  const company = EASYACCESS_ELEC_COMPANY_ID[opts.providerCode.toLowerCase()];
  if (!company) {
    return { status: "failed", message: "This electricity provider is not supported by EasyAccess." };
  }
  const res = await easyaccessFetch("/pay-electricity", {
    method: "POST",
    body: JSON.stringify({
      company,
      metertype: meterTypeCode(opts.MeterType),
      meterno: opts.meter_number,
      amount: opts.amount,
    }),
  });
  const ok = isSuccess(res);
  return {
    status: ok ? "success" : "failed",
    message: res?.message,
    token: res?.data?.token ?? res?.token,
    transaction_id: res?.data?.reference ?? res?.reference,
  };
}
