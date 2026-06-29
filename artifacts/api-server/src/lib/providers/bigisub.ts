/**
 * BigISub (bigisub.ng) Integration Layer
 *
 * Base URL: https://api.bigisub.ng
 * Auth: Bearer token in Authorization header
 *
 * Token is loaded from the `bigisub_api_token` DB setting (set via Admin → Settings)
 * or falls back to the BIGISUB_API_TOKEN environment variable.
 */

let _base = process.env.BIGISUB_BASE_URL ?? "https://api.bigisub.ng";
let _token = process.env.BIGISUB_API_TOKEN ?? "";

export function setBigisubToken(token: string): void {
  if (token) _token = token;
}

export function setBigisubBaseUrl(url: string): void {
  if (url) _base = url.replace(/\/$/, "");
}

export function getBigisubBaseUrl(): string {
  return _base;
}

export function isBigisubConfigured(): boolean {
  return !!_token;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Authorization": `Bearer ${_token}`,
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    "Referer": "https://bigisub.ng/",
    "Origin": "https://bigisub.ng",
  };
}

async function bigisubFetch(path: string, opts: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${_base}${path}`;
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
    catch {
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error(`BigISub API returned an HTML page — the base URL may be incorrect, or the server is blocked by Cloudflare. Check Admin → Settings → BigISub Base URL. Current URL: ${url}`);
      }
      throw new Error(`BigISub non-JSON response: ${text.slice(0, 200)}`);
    }
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("BigISub request timed out. Please try again.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Account ─────────────────────────────────────────────────────────────────

export async function bigisubGetBalance(): Promise<{ balance?: number; message?: string }> {
  const res = await bigisubFetch("/balance");
  return { balance: res?.data?.balance ?? res?.balance, message: res?.message };
}

// ─── Data Plans ───────────────────────────────────────────────────────────────

export async function bigisubGetDataVariations(network: string): Promise<Array<{ id: string; name: string; price: number; validity?: string }>> {
  const res = await bigisubFetch(`/variations/data?service_id=${encodeURIComponent(network.toLowerCase())}`);
  return Array.isArray(res) ? res : (res?.data ?? res?.variations ?? []);
}

// ─── Validation ───────────────────────────────────────────────────────────────

export async function bigisubVerifyMeter(opts: {
  meter_number: string;
  disco: string;
  meter_type: string;
}): Promise<{ customer_name?: string; address?: string; message?: string; status?: string }> {
  const res = await bigisubFetch("/verify-customer", {
    method: "POST",
    body: JSON.stringify({
      service_id: opts.disco.toLowerCase(),
      meter_number: opts.meter_number,
      variation_id: opts.meter_type.toLowerCase(),
    }),
  });
  return {
    customer_name: res?.data?.customer_name ?? res?.customer_name,
    address: res?.data?.address ?? res?.address,
    message: res?.message,
    status: res?.code ?? res?.status,
  };
}

export async function bigisubVerifySmartcard(opts: {
  smart_card_number: string;
  cable_name: string;
}): Promise<{ customer_name?: string; current_plan?: string; message?: string; status?: string }> {
  const res = await bigisubFetch("/verify-customer", {
    method: "POST",
    body: JSON.stringify({
      service_id: opts.cable_name.toLowerCase(),
      smartcard_number: opts.smart_card_number,
    }),
  });
  return {
    customer_name: res?.data?.customer_name ?? res?.customer_name,
    current_plan: res?.data?.current_bouquet_description ?? res?.current_plan,
    message: res?.message,
    status: res?.code ?? res?.status,
  };
}

// ─── Purchases ───────────────────────────────────────────────────────────────

function requestId(): string {
  return `stdata-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const BIGISUB_NETWORK_MAP: Record<string, string> = {
  mtn: "mtn", glo: "glo", airtel: "airtel", "9mobile": "9mobile", etisalat: "9mobile",
  MTN: "mtn", GLO: "glo", AIRTEL: "airtel", "9MOBILE": "9mobile",
};

const BIGISUB_DISCO_MAP: Record<string, string> = {
  "ikeja-electric":        "ikedc",
  "abuja-electric":        "aedc",
  "kaduna-electric":       "kedco",
  "portharcourt-electric": "phed",
  "ibadan-electric":       "ibedc",
  "jos-electric":          "jos",
  "kano-electric":         "kedco",
  "enugu-electric":        "enugu",
  "benin-electric":        "bedc",
};

const BIGISUB_CABLE_MAP: Record<string, string> = {
  dstv: "dstv", gotv: "gotv", startimes: "startimes",
  DSTV: "dstv", GOTV: "gotv", STARTIMES: "startimes",
};

export async function bigisubPurchaseAirtime(opts: {
  network: string; amount: number; mobile_number: string;
}): Promise<{ status?: string; message?: string; transaction_id?: string }> {
  const network = BIGISUB_NETWORK_MAP[opts.network] ?? opts.network.toLowerCase();
  const res = await bigisubFetch("/airtime", {
    method: "POST",
    body: JSON.stringify({
      request_id: requestId(),
      phone: opts.mobile_number,
      service_id: network,
      amount: opts.amount,
    }),
  });
  return normaliseResponse(res);
}

export async function bigisubPurchaseData(opts: {
  plan: number | string; mobile_number: string; network?: string;
}): Promise<{ status?: string; message?: string; transaction_id?: string }> {
  const network = BIGISUB_NETWORK_MAP[opts.network ?? ""] ?? (opts.network ?? "mtn").toLowerCase();
  const res = await bigisubFetch("/data", {
    method: "POST",
    body: JSON.stringify({
      request_id: requestId(),
      phone: opts.mobile_number,
      service_id: network,
      variation_id: String(opts.plan),
    }),
  });
  return normaliseResponse(res);
}

export async function bigisubPurchaseElectricity(opts: {
  discoid: number | string; MeterType: string; meter_number: string; amount: number;
}): Promise<{ status?: string; message?: string; token?: string; transaction_id?: string }> {
  const disco = BIGISUB_DISCO_MAP[String(opts.discoid)] ?? String(opts.discoid).toLowerCase();
  const res = await bigisubFetch("/electricity", {
    method: "POST",
    body: JSON.stringify({
      request_id: requestId(),
      service_id: disco,
      meter_number: opts.meter_number,
      variation_id: opts.MeterType.toLowerCase(),
      amount: opts.amount,
    }),
  });
  const norm = normaliseResponse(res);
  return { ...norm, token: res?.data?.token ?? res?.token };
}

export async function bigisubPurchaseCable(opts: {
  plan_id: number | string; smart_card_number: string; cable_name?: string;
}): Promise<{ status?: string; message?: string; transaction_id?: string }> {
  const cable = BIGISUB_CABLE_MAP[opts.cable_name ?? ""] ?? (opts.cable_name ?? "dstv").toLowerCase();
  const res = await bigisubFetch("/cable-tv", {
    method: "POST",
    body: JSON.stringify({
      request_id: requestId(),
      service_id: cable,
      smartcard_number: opts.smart_card_number,
      variation_id: String(opts.plan_id),
    }),
  });
  return normaliseResponse(res);
}

export async function bigisubPurchaseExam(opts: {
  examid: number | string; quantity: number; examCode?: string;
}): Promise<{ status?: string; message?: string; pins?: Array<{ pin: string; serial: string }> }> {
  const examMap: Record<string, string> = {
    WAEC: "waec", NECO: "neco", JAMB: "jamb", NABTEB: "nabteb",
  };
  const service = examMap[opts.examCode?.toUpperCase() ?? ""] ?? String(opts.examid);
  const res = await bigisubFetch("/exam", {
    method: "POST",
    body: JSON.stringify({
      request_id: requestId(),
      service_id: service,
      quantity: opts.quantity,
    }),
  });
  const norm = normaliseResponse(res);
  return { ...norm, pins: res?.data?.pins ?? res?.pins };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normaliseResponse(res: any): { status?: string; message?: string; transaction_id?: string } {
  return {
    status: res?.code ?? res?.status,
    message: res?.message,
    transaction_id: res?.data?.transaction_id ?? res?.transaction_id,
  };
}
