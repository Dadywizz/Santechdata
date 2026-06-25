/**
 * Active Provider Router
 * Routes all VTU purchase calls to whichever provider the admin has selected.
 * Switch providers from Admin → Settings without restarting the server.
 */

import {
  isKybdataConfigured, kybdataPurchaseData, kybdataPurchaseAirtime,
  kybdataPurchaseElectricity, kybdataPurchaseCable, kybdataPurchaseExam,
  kybdataVerifyMeter, kybdataVerifySmartcard, kybdataGetDataPlans,
} from "./kybdata";
import {
  isHusmodataConfigured, husmodataPurchaseData, husmodataPurchaseAirtime,
  husmodataPurchaseElectricity, husmodataPurchaseCable, husmodataPurchaseExam,
  husmodataVerifyMeter, husmodataVerifySmartcard, husmodataGetDataPlans,
} from "./husmodata";
import {
  isGsubzConfigured, gsubzPurchaseData, gsubzPurchaseAirtime,
  gsubzPurchaseElectricity, gsubzPurchaseCable, gsubzPurchaseExam,
  gsubzVerifyMeter, gsubzVerifySmartcard, gsubzGetDataPlans,
} from "./gsubz";

export type ProviderName = "kyb" | "husmodata" | "gsubz";

export const PROVIDER_INFO: Record<ProviderName, { label: string; description: string; credentialKey: string; credentialLabel: string }> = {
  kyb:       { label: "KYB Data",  description: "kybdatassub.com.ng — current default",  credentialKey: "kybdata_api_token",  credentialLabel: "API Token"  },
  husmodata: { label: "Husmodata", description: "husmodata.com — wholesale VTU provider", credentialKey: "husmodata_api_key", credentialLabel: "API Key"    },
  gsubz:     { label: "Gsubz",     description: "gsubz.com — wholesale VTU provider",     credentialKey: "gsubz_api_key",     credentialLabel: "API Key"    },
};

let _active: ProviderName = "kyb";

export function setActiveProvider(name: string): void {
  if (name in PROVIDER_INFO) _active = name as ProviderName;
}

export function getActiveProviderName(): ProviderName {
  return _active;
}

export function isActiveProviderConfigured(): boolean {
  if (_active === "kyb")       return isKybdataConfigured();
  if (_active === "husmodata") return isHusmodataConfigured();
  if (_active === "gsubz")     return isGsubzConfigured();
  return false;
}

export function getAllProviderStatuses(): Record<ProviderName, boolean> {
  return {
    kyb:       isKybdataConfigured(),
    husmodata: isHusmodataConfigured(),
    gsubz:     isGsubzConfigured(),
  };
}

// ── Delegate purchase calls ───────────────────────────────────────────────────

export function activePurchaseData(opts: { plan: number | string; mobile_number: string }) {
  if (_active === "husmodata") return husmodataPurchaseData(opts);
  if (_active === "gsubz")     return gsubzPurchaseData(opts);
  return kybdataPurchaseData(opts);
}

export function activePurchaseAirtime(opts: { network: string; amount: number; mobile_number: string }) {
  if (_active === "husmodata") return husmodataPurchaseAirtime(opts);
  if (_active === "gsubz")     return gsubzPurchaseAirtime(opts);
  return kybdataPurchaseAirtime(opts);
}

export function activePurchaseElectricity(opts: { discoid: number | string; MeterType: string; meter_number: string; amount: number }) {
  if (_active === "husmodata") return husmodataPurchaseElectricity(opts);
  if (_active === "gsubz")     return gsubzPurchaseElectricity(opts);
  return kybdataPurchaseElectricity(opts);
}

export function activePurchaseCable(opts: { plan_id: number | string; smart_card_number: string }) {
  if (_active === "husmodata") return husmodataPurchaseCable(opts);
  if (_active === "gsubz")     return gsubzPurchaseCable(opts);
  return kybdataPurchaseCable(opts);
}

export function activePurchaseExam(opts: { examid: number | string; quantity: number }) {
  if (_active === "husmodata") return husmodataPurchaseExam(opts);
  if (_active === "gsubz")     return gsubzPurchaseExam(opts);
  return kybdataPurchaseExam(opts);
}

export function activeVerifyMeter(opts: { meter_number: string; discoid: number | string; meter_type: string }) {
  if (_active === "husmodata") return husmodataVerifyMeter(opts);
  if (_active === "gsubz")     return gsubzVerifyMeter(opts);
  return kybdataVerifyMeter(opts);
}

export function activeVerifySmartcard(opts: { smart_card_number: string; cable_name: string }) {
  if (_active === "husmodata") return husmodataVerifySmartcard(opts);
  if (_active === "gsubz")     return gsubzVerifySmartcard(opts);
  return kybdataVerifySmartcard(opts);
}

export function activeGetDataPlans() {
  if (_active === "husmodata") return husmodataGetDataPlans();
  if (_active === "gsubz")     return gsubzGetDataPlans();
  return kybdataGetDataPlans();
}
