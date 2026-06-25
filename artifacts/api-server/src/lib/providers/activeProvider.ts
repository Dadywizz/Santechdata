/**
 * Active Provider Router
 * Supports per-network provider routing.
 * e.g. MTN → KYB Data, Airtel → Husmodata
 * All settings hot-reload from Admin → Settings without server restart.
 */

import {
  isKybdataConfigured, kybdataPurchaseData, kybdataPurchaseAirtime,
  kybdataPurchaseElectricity, kybdataPurchaseCable, kybdataPurchaseExam,
  kybdataVerifyMeter, kybdataVerifySmartcard, kybdataGetDataPlans, kybdataGetBalance,
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
export type NetworkName  = "MTN" | "AIRTEL" | "GLO" | "9MOBILE";

export const PROVIDER_INFO: Record<ProviderName, {
  label: string; description: string; credentialKey: string; credentialLabel: string;
}> = {
  kyb:       { label: "KYB Data",  description: "kybdatassub.com.ng",  credentialKey: "kybdata_api_token",  credentialLabel: "API Token" },
  husmodata: { label: "Husmodata", description: "husmodata.com",        credentialKey: "husmodata_api_key",  credentialLabel: "API Key"   },
  gsubz:     { label: "Gsubz",     description: "gsubz.com",            credentialKey: "gsubz_api_key",      credentialLabel: "API Key"   },
};

export const NETWORKS: NetworkName[] = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

// Default fallback provider
let _default: ProviderName = "kyb";

// Per-network overrides — if not set, falls back to _default
const _networkProviders: Partial<Record<NetworkName, ProviderName>> = {};

export function setDefaultProvider(name: string): void {
  if (name in PROVIDER_INFO) _default = name as ProviderName;
}

export function setNetworkProvider(network: string, provider: string): void {
  const net = network.toUpperCase() as NetworkName;
  if (NETWORKS.includes(net) && provider in PROVIDER_INFO) {
    _networkProviders[net] = provider as ProviderName;
  } else if (NETWORKS.includes(net) && provider === "") {
    delete _networkProviders[net];
  }
}

export function getDefaultProviderName(): ProviderName { return _default; }
export function getNetworkProviderName(network: string): ProviderName {
  return _networkProviders[network.toUpperCase() as NetworkName] ?? _default;
}
export function getAllNetworkMappings(): Record<NetworkName, ProviderName> {
  const result = {} as Record<NetworkName, ProviderName>;
  for (const net of NETWORKS) result[net] = _networkProviders[net] ?? _default;
  return result;
}

// Keep legacy export for backward compat
export function setActiveProvider(name: string): void { setDefaultProvider(name); }
export function getActiveProviderName(): ProviderName { return _default; }

export function isActiveProviderConfigured(): boolean {
  return isProviderConfigured(_default);
}

export function isProviderConfigured(name: ProviderName): boolean {
  if (name === "kyb")       return isKybdataConfigured();
  if (name === "husmodata") return isHusmodataConfigured();
  if (name === "gsubz")     return isGsubzConfigured();
  return false;
}

export function getAllProviderStatuses(): Record<ProviderName, boolean> {
  return {
    kyb:       isKybdataConfigured(),
    husmodata: isHusmodataConfigured(),
    gsubz:     isGsubzConfigured(),
  };
}

// ── Test connection ───────────────────────────────────────────────────────────
export async function testProviderConnection(name: ProviderName): Promise<{ ok: boolean; message: string; balance?: number }> {
  try {
    if (name === "kyb") {
      const r = await kybdataGetBalance();
      const ok = r.balance !== undefined;
      return { ok, message: ok ? "Connected successfully" : (r.message ?? "Connection failed"), balance: r.balance };
    }
    // For stubs, just confirm credentials are stored
    if (name === "husmodata" && isHusmodataConfigured()) return { ok: true, message: "Credentials saved. Full integration pending." };
    if (name === "gsubz"     && isGsubzConfigured())     return { ok: true, message: "Credentials saved. Full integration pending." };
    return { ok: false, message: "No credentials saved" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Connection test failed" };
  }
}

// ── Route to correct provider ─────────────────────────────────────────────────
function pick(network: string) {
  return getNetworkProviderName(network);
}

export function activePurchaseData(opts: { plan: number | string; mobile_number: string; network?: string }) {
  const p = pick(opts.network ?? "");
  if (p === "husmodata") return husmodataPurchaseData(opts);
  if (p === "gsubz")     return gsubzPurchaseData(opts);
  return kybdataPurchaseData(opts);
}

export function activePurchaseAirtime(opts: { network: string; amount: number; mobile_number: string }) {
  const p = pick(opts.network);
  if (p === "husmodata") return husmodataPurchaseAirtime(opts);
  if (p === "gsubz")     return gsubzPurchaseAirtime(opts);
  return kybdataPurchaseAirtime(opts);
}

export function activePurchaseElectricity(opts: { discoid: number | string; MeterType: string; meter_number: string; amount: number }) {
  if (_default === "husmodata") return husmodataPurchaseElectricity(opts);
  if (_default === "gsubz")     return gsubzPurchaseElectricity(opts);
  return kybdataPurchaseElectricity(opts);
}

export function activePurchaseCable(opts: { plan_id: number | string; smart_card_number: string }) {
  if (_default === "husmodata") return husmodataPurchaseCable(opts);
  if (_default === "gsubz")     return gsubzPurchaseCable(opts);
  return kybdataPurchaseCable(opts);
}

export function activePurchaseExam(opts: { examid: number | string; quantity: number }) {
  if (_default === "husmodata") return husmodataPurchaseExam(opts);
  if (_default === "gsubz")     return gsubzPurchaseExam(opts);
  return kybdataPurchaseExam(opts);
}

export function activeVerifyMeter(opts: { meter_number: string; discoid: number | string; meter_type: string }) {
  if (_default === "husmodata") return husmodataVerifyMeter(opts);
  if (_default === "gsubz")     return gsubzVerifyMeter(opts);
  return kybdataVerifyMeter(opts);
}

export function activeVerifySmartcard(opts: { smart_card_number: string; cable_name: string }) {
  if (_default === "husmodata") return husmodataVerifySmartcard(opts);
  if (_default === "gsubz")     return gsubzVerifySmartcard(opts);
  return kybdataVerifySmartcard(opts);
}

export function activeGetDataPlans() {
  if (_default === "husmodata") return husmodataGetDataPlans();
  if (_default === "gsubz")     return gsubzGetDataPlans();
  return kybdataGetDataPlans();
}
