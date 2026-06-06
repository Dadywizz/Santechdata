/**
 * EasyAccess VTU Integration
 * Docs: https://easyaccess.com.ng
 * Auth: Authorization: Bearer {token} + Cache-Control: no-cache
 * Base URL (live): https://easyaccess.com.ng/api/live/v1
 *
 * Supported services:
 *   Data:        POST /purchase-data  {network: 1-4, dataplan: planId, mobileno}
 *   Electricity: POST /pay-electricity {company: 1-12, metertype: 1/2, meterno, amount}
 *   Cable TV:    POST /pay-tv         {company: 1-3, package: planId, iucno}
 *   Exam Pins:   POST /exam-pins      {exam_board: "waec/neco/nabteb", no_of_pins}
 *   Verify Elec: POST /verify-electricity {company, metertype, meterno, amount}
 *   Plans:       GET  /get-plans?product_type=mtn_sme|glo_gifting|airtel_gifting|9mobile_sme|dstv|gotv|startimes|waec|neco|nabteb
 *
 * Network codes: 1=MTN, 2=GLO, 3=AIRTEL, 4=9MOBILE
 * Electricity company codes: 1=Ikeja 2=Eko 3=Abuja 4=Kaduna 5=PHC 6=Ibadan 7=Enugu 8=Jos 9=Benin 10=Kano 11=Yola 12=Aba
 * Cable company codes: 1=DSTV, 2=GOTV, 3=StarTimes
 * Meter type codes: 1=prepaid, 2=postpaid
 *
 * NOTE: Airtime is NOT supported by EasyAccess API.
 */

import { customFetch } from "../custom-fetch";

const BASE_URL = "https://easyaccess.com.ng/api/live/v1";

const NETWORK_CODES: Record<string, number> = {
  MTN: 1, GLO: 2, AIRTEL: 3, "9MOBILE": 4,
};

const ELEC_COMPANY_CODES: Record<string, number> = {
  "ikeja-electric": 1,
  "eko-electric": 2,
  "abuja-electric": 3,
  "kaduna-electric": 4,
  "portharcourt-electric": 5,
  "ibadan-electric": 6,
  "enugu-electric": 7,
  "jos-electric": 8,
  "benin-electric": 9,
  "kano-electric": 10,
  "yola-electric": 11,
  "aba-electric": 12,
};

const CABLE_COMPANY_CODES: Record<string, number> = {
  dstv: 1,
  gotv: 2,
  startimes: 3,
};

function headers(): Record<string, string> {
  return {
    "Authorization": `Bearer ${process.env.EASYACCESS_API_TOKEN ?? ""}`,
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
  };
}

export function isEasyAccessConfigured(): boolean {
  return !!(process.env.EASYACCESS_API_TOKEN);
}

type EaResponse = Record<string, unknown>;

async function post(endpoint: string, body: Record<string, unknown>): Promise<EaResponse> {
  const res = await customFetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 400) {
    throw new Error(`EasyAccess ${endpoint} HTTP ${res.status}`);
  }
  return res.json() as Promise<EaResponse>;
}

async function get(endpoint: string): Promise<EaResponse> {
  const res = await customFetch(`${BASE_URL}/${endpoint}`, {
    method: "GET",
    headers: headers(),
  });
  return res.json() as Promise<EaResponse>;
}

function isSuccess(res: EaResponse): boolean {
  return res.code === 200 && (res.status === "success" || res.status === "successful");
}

// ── DATA ──────────────────────────────────────────────────────────────────────

export async function eaGetDataPlans(network: string): Promise<EaResponse | undefined> {
  const types: Record<string, string> = {
    MTN: "mtn_sme",
    GLO: "glo_gifting",
    AIRTEL: "airtel_gifting",
    "9MOBILE": "9mobile_sme",
  };
  const productType = types[network];
  if (!productType) return undefined;
  return get(`get-plans?product_type=${productType}`);
}

export interface EaPurchaseDataResult {
  success: boolean;
  message?: string;
  raw?: EaResponse;
}

export async function eaPurchaseData({
  network,
  planId,
  phone,
}: {
  network: string;
  planId: string;
  phone: string;
}): Promise<EaPurchaseDataResult> {
  const networkCode = NETWORK_CODES[network];
  if (!networkCode) {
    return { success: false, message: `Unknown network: ${network}` };
  }
  const raw = await post("purchase-data", {
    network: networkCode,
    dataplan: parseInt(planId, 10),
    mobileno: phone,
  });
  return {
    success: isSuccess(raw),
    message: String(raw.message ?? ""),
    raw,
  };
}

// ── ELECTRICITY ───────────────────────────────────────────────────────────────

export interface EaVerifyMeterResult {
  name: string;
  address: string;
  success: boolean;
}

export async function eaVerifyMeter({
  companyCode,
  meterType,
  meterNo,
}: {
  companyCode: string;
  meterType: string;
  meterNo: string;
}): Promise<EaVerifyMeterResult> {
  const company = ELEC_COMPANY_CODES[companyCode];
  if (!company) {
    return { success: false, name: "Customer", address: "" };
  }
  const meterTypeCode = meterType.toLowerCase() === "postpaid" ? 2 : 1;
  try {
    const raw = await post("verify-electricity", {
      company,
      metertype: meterTypeCode,
      meterno: meterNo,
      amount: 500,
    });
    const success = isSuccess(raw);
    return {
      success,
      name: String(raw.name ?? raw.customer_name ?? raw.Customer_Name ?? "Customer"),
      address: String(raw.address ?? raw.Address ?? ""),
    };
  } catch {
    return { success: false, name: "Customer", address: "" };
  }
}

export interface EaElectricityResult {
  success: boolean;
  token: string;
  message?: string;
  raw?: EaResponse;
}

export async function eaPayElectricity({
  companyCode,
  meterType,
  meterNo,
  amount,
}: {
  companyCode: string;
  meterType: string;
  meterNo: string;
  amount: number;
}): Promise<EaElectricityResult> {
  const company = ELEC_COMPANY_CODES[companyCode];
  if (!company) {
    return { success: false, token: "", message: `Unknown electricity provider: ${companyCode}` };
  }
  const meterTypeCode = meterType.toLowerCase() === "postpaid" ? 2 : 1;
  const raw = await post("pay-electricity", {
    company,
    metertype: meterTypeCode,
    meterno: meterNo,
    amount,
  });
  const success = isSuccess(raw);
  const token =
    String(raw.token ?? raw.Token ?? raw.electricity_token ?? "");
  return { success, token, message: String(raw.message ?? ""), raw };
}

// ── CABLE TV ──────────────────────────────────────────────────────────────────

export interface EaCableResult {
  success: boolean;
  message?: string;
  raw?: EaResponse;
}

export async function eaPayTV({
  provider,
  packageId,
  iucNo,
}: {
  provider: string;
  packageId: number;
  iucNo: string;
}): Promise<EaCableResult> {
  const company = CABLE_COMPANY_CODES[provider.toLowerCase()];
  if (!company) {
    return { success: false, message: `Unknown cable provider: ${provider}` };
  }
  const raw = await post("pay-tv", {
    company,
    package: packageId,
    iucno: iucNo,
  });
  return { success: isSuccess(raw), message: String(raw.message ?? ""), raw };
}

// ── EXAM PINS ─────────────────────────────────────────────────────────────────

export interface EaExamPin {
  pin: string;
  serial: string;
}

export interface EaExamResult {
  success: boolean;
  pins: EaExamPin[];
  message?: string;
  raw?: EaResponse;
}

export async function eaPurchaseExam({
  examBoard,
  count,
}: {
  examBoard: string;
  count: number;
}): Promise<EaExamResult> {
  const raw = await post("exam-pins", {
    exam_board: examBoard.toLowerCase(),
    no_of_pins: count,
  });
  const success = isSuccess(raw);

  let pins: EaExamPin[] = [];
  if (success && Array.isArray(raw.pins)) {
    pins = (raw.pins as Array<Record<string, unknown>>).map((p) => ({
      pin: String(p.pin ?? p.Pin ?? ""),
      serial: String(p.serial ?? p.Serial ?? p.serial_number ?? ""),
    }));
  } else if (success && raw.pin) {
    pins = [{ pin: String(raw.pin), serial: String(raw.serial ?? "") }];
  }

  return { success, pins, message: String(raw.message ?? ""), raw };
}
