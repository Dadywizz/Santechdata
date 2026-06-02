/**
 * Clubkonnect Integration Layer
 * Docs: https://www.clubkonnect.com/api-documentation
 * Set env vars: CLUBKONNECT_USERID, CLUBKONNECT_APIKEY
 */

const BASE_URL = "https://www.clubkonnect.com/api/v1";

const authParams = () => ({
  UserID: process.env.CLUBKONNECT_USERID ?? "",
  APIKey: process.env.CLUBKONNECT_APIKEY ?? "",
});

export async function clubkonnectGetDataPlans(network: string) {
  const params = new URLSearchParams({ ...authParams(), NetworkID: network });
  const res = await fetch(`${BASE_URL}/getDataPlanList?${params}`);
  return res.json() as Promise<{ DataPlans: Array<{ DataPlanID: string; DataPlan: string; DataPlanName: string; DataPlanValidity: string; DataPlanPrice: string }> }>;
}

export async function clubkonnectPurchaseData(opts: {
  network: string; phone: string; planId: string; requestId: string;
}) {
  const body = new URLSearchParams({
    ...authParams(),
    MobileNetwork: opts.network,
    PhoneNumber: opts.phone,
    DataPlan: opts.planId,
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE_URL}/dataTopup`, { method: "POST", body });
  return res.json() as Promise<{ status: string; message: string }>;
}

export async function clubkonnectPurchaseAirtime(opts: {
  network: string; phone: string; amount: number; requestId: string;
}) {
  const body = new URLSearchParams({
    ...authParams(),
    MobileNetwork: opts.network,
    PhoneNumber: opts.phone,
    Amount: opts.amount.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE_URL}/airtime`, { method: "POST", body });
  return res.json() as Promise<{ status: string; message: string }>;
}

export async function clubkonnectGetExamPins(opts: {
  examType: string; quantity: number; requestId: string;
}) {
  const body = new URLSearchParams({
    ...authParams(),
    ExamType: opts.examType,
    Quantity: opts.quantity.toString(),
    RequestID: opts.requestId,
  });
  const res = await fetch(`${BASE_URL}/examPins`, { method: "POST", body });
  return res.json() as Promise<{ status: string; Pins: string[] }>;
}
