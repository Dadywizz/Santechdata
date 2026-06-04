/**
 * Flutterwave VTU Integration — Bills Payment API
 * Covers: Nigerian airtime (MTN/Airtel/Glo/9Mobile) + data bundles
 * Docs: https://developer.flutterwave.com/docs/collecting-payments/bills-payment
 *
 * Airtime biller names (NG):
 *   MTN     → "MTN VTU"        (BIL099 / AT099)
 *   AIRTEL  → "AIRTEL NIGERIA" (BIL100 / AT100)
 *   GLO     → "GLO NIGERIA"    (BIL102 / AT102)
 *   9MOBILE → "9MOBILE NIGERIA"(BIL103 / AT103)
 *
 * Data biller names (NG) — item_code stored as providerCode on each plan:
 *   MTN     → "MTN DATA BUNDLE"    (BIL104, MD104–MD109)
 *   AIRTEL  → "AIRTEL DATA BUNDLE" (BIL106, MD116–MD126)
 *   GLO     → "GLO DATA BUNDLE"    (BIL105, MD110–MD115)
 *   9MOBILE → "9MOBILE DATA BUNDLE"(BIL107, MD127–MD136)
 *
 * Common MTN data item codes (for reference when seeding plans):
 *   MD104=50MB(₦100)  MD105=150MB(₦200)  MD106=750MB(₦500)
 *   MD107=1.5GB(₦1000) MD108=3.5GB(₦2000) MD109=5GB(₦3500)
 *
 * Env var required: FLUTTERWAVE_SECRET_KEY
 * IP must be whitelisted: Flutterwave Dashboard → Settings → API → Whitelisted IPs
 */

const FLW_API = "https://api.flutterwave.com/v3";

function authHeader() {
  return { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY ?? ""}` };
}

const AIRTIME_BILLER: Record<string, string> = {
  MTN: "MTN VTU",
  AIRTEL: "AIRTEL NIGERIA",
  GLO: "GLO NIGERIA",
  "9MOBILE": "9MOBILE NIGERIA",
};

const DATA_BILLER: Record<string, string> = {
  MTN: "MTN DATA BUNDLE",
  AIRTEL: "AIRTEL DATA BUNDLE",
  GLO: "GLO DATA BUNDLE",
  "9MOBILE": "9MOBILE DATA BUNDLE",
};

function formatPhone(phone: string): string {
  return phone.replace(/^\+234/, "0").replace(/^234/, "0");
}

export interface FlwBillResponse {
  status: string;
  message: string;
  data?: {
    tx_ref?: string;
    amount?: number;
    phone_number?: string;
    network?: string;
    flw_ref?: string;
    reference?: string;
  };
}

export async function flutterwavePurchaseAirtime(opts: {
  network: string; phone: string; amount: number; reference: string;
}): Promise<FlwBillResponse> {
  const billerName = AIRTIME_BILLER[opts.network.toUpperCase()] ?? "MTN VTU";
  const res = await fetch(`${FLW_API}/bills`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      country: "NG",
      customer: formatPhone(opts.phone),
      amount: opts.amount,
      recurrence: "ONCE",
      type: "AIRTIME",
      reference: opts.reference,
      biller_name: billerName,
    }),
    signal: AbortSignal.timeout(30000),
  });
  return res.json() as Promise<FlwBillResponse>;
}

export async function flutterwavePurchaseData(opts: {
  network: string; phone: string; itemCode: string; amount: number; reference: string;
}): Promise<FlwBillResponse> {
  const billerName = DATA_BILLER[opts.network.toUpperCase()] ?? "MTN DATA BUNDLE";
  const res = await fetch(`${FLW_API}/bills`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      country: "NG",
      customer: formatPhone(opts.phone),
      amount: opts.amount,
      recurrence: "ONCE",
      type: "DATA_BUNDLE",
      reference: opts.reference,
      biller_name: billerName,
      item_code: opts.itemCode,
    }),
    signal: AbortSignal.timeout(30000),
  });
  return res.json() as Promise<FlwBillResponse>;
}

export async function flutterwaveGetDataPlans(network: string): Promise<Array<{
  id: number; biller_code: string; name: string; biller_name: string;
  item_code: string; amount: number; short_name: string;
}>> {
  const res = await fetch(`${FLW_API}/bill-categories`, {
    headers: authHeader(),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json() as { status: string; data?: Array<Record<string, unknown>> };
  if (data.status !== "success" || !data.data) return [];
  const net = network.toUpperCase();
  const billerName = DATA_BILLER[net] ?? "";
  return (data.data as Array<{
    id: number; biller_code: string; name: string; biller_name: string;
    item_code: string; amount: number; short_name: string; country: string; is_airtime: boolean;
  }>).filter(b => b.country === "NG" && !b.is_airtime && b.name === billerName);
}

export function isFlutterwaveVtuConfigured(): boolean {
  return !!process.env.FLUTTERWAVE_SECRET_KEY;
}
