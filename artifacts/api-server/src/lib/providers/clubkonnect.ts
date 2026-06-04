/**
 * Clubkonnect Integration Layer
 * Docs: https://www.clubkonnect.com/APIDocs.asp
 * Set env vars: CLUBKONNECT_USERID, CLUBKONNECT_APIKEY
 *
 * Verified working endpoints (POST form-encoded):
 *   Data purchase:  https://www.clubkonnect.com/APIEPINDatabundleV1.asp
 *   Airtime:        https://www.clubkonnect.com/APIAirtimeV1.asp
 *   Data plan list: https://www.clubkonnect.com/APIGetDatabundlePlanV1.asp
 *   Exam (WAEC):    https://www.clubkonnect.com/APIWaecV1.asp
 *   Exam (JAMB):    https://www.clubkonnect.com/APIJambV1.asp
 *
 * NOTE: Server IP must be whitelisted on Clubkonnect dashboard before API calls work.
 * Error "INVALID_CREDENTIALS3" = IP not whitelisted.
 */

const authParams = () => ({
  UserID: process.env.CLUBKONNECT_USERID ?? "",
  APIKey: process.env.CLUBKONNECT_APIKEY ?? "",
});

export async function clubkonnectGetDataPlans(network: string) {
  const body = new URLSearchParams({ ...authParams(), NetworkID: network });
  const res = await fetch("https://www.clubkonnect.com/APIGetDatabundlePlanV1.asp", {
    method: "POST",
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as { DataPlans: Array<{ DataPlanID: string; DataPlan: string; DataPlanName: string; DataPlanValidity: string; DataPlanPrice: string }> };
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 200)}`);
  }
}

export async function clubkonnectPurchaseData(opts: {
  network: string; phone: string; planId: string; requestId: string;
}) {
  const body = new URLSearchParams({
    ...authParams(),
    NetworkID: opts.network,
    MobileNumber: opts.phone,
    DataPlan: opts.planId,
    RequestID: opts.requestId,
  });
  const res = await fetch("https://www.clubkonnect.com/APIEPINDatabundleV1.asp", {
    method: "POST",
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as { status: string; message: string };
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 200)}`);
  }
}

export async function clubkonnectPurchaseAirtime(opts: {
  network: string; phone: string; amount: number; requestId: string;
}) {
  const body = new URLSearchParams({
    ...authParams(),
    NetworkID: opts.network,
    MobileNumber: opts.phone,
    Amount: opts.amount.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch("https://www.clubkonnect.com/APIAirtimeV1.asp", {
    method: "POST",
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as { status: string; message: string };
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 200)}`);
  }
}

export async function clubkonnectGetExamPins(opts: {
  examType: string; quantity: number; requestId: string;
}) {
  // WAEC and JAMB have separate endpoints
  const endpoint = opts.examType.toUpperCase().includes("JAMB")
    ? "https://www.clubkonnect.com/APIJambV1.asp"
    : "https://www.clubkonnect.com/APIWaecV1.asp";
  const body = new URLSearchParams({
    ...authParams(),
    Quantity: opts.quantity.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch(endpoint, { method: "POST", body });
  const text = await res.text();
  try {
    return JSON.parse(text) as { status: string; Pins: string[] };
  } catch {
    throw new Error(`Clubkonnect non-JSON response: ${text.slice(0, 200)}`);
  }
}
