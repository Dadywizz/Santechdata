/**
 * Active Provider Router
 * - Per-network routing: MTN/Airtel/Glo/9Mobile can each use a different provider
 * - Per-exam routing: WAEC/NECO/JAMB/NABTEB can each use a different provider
 * All settings hot-reload from Admin → Settings without server restart.
 */

import {
  isKybdataConfigured, kybdataPurchaseData, kybdataPurchaseAirtime,
  kybdataPurchaseElectricity, kybdataPurchaseCable, kybdataPurchaseExam,
  kybdataVerifyMeter, kybdataVerifySmartcard, kybdataGetDataPlans, kybdataGetBalance,
} from "./kybdata";
import {
  isClubkonnectConfigured, clubkonnectPurchaseData, clubkonnectPurchaseAirtime,
  clubkonnectPurchaseElectricity, clubkonnectPurchaseCable, clubkonnectPurchaseExam,
  clubkonnectVerifyMeter, clubkonnectVerifySmartcard, clubkonnectGetBalance,
} from "./clubkonnect";
import {
  isGsubzConfigured, gsubzPurchaseData, gsubzPurchaseAirtime,
  gsubzPurchaseElectricity, gsubzPurchaseCable, gsubzPurchaseExam,
  gsubzVerifyMeter, gsubzVerifySmartcard, gsubzGetDataPlans,
} from "./gsubz";
import {
  isBigisubConfigured, bigisubPurchaseData, bigisubPurchaseAirtime,
  bigisubPurchaseElectricity, bigisubPurchaseCable, bigisubPurchaseExam,
  bigisubVerifyMeter, bigisubVerifySmartcard, bigisubGetBalance,
} from "./bigisub";
import {
  isEasyaccessConfigured, easyaccessVerifyMeter, easyaccessPurchaseElectricity, easyaccessGetBalance,
  easyaccessPurchaseData, easyaccessPurchaseExam, isEasyaccessExamSupported, EASYACCESS_ELEC_COMPANY_ID,
} from "./easyaccess";

// Only discos with a company code confirmed against the live EasyAccess API
// (see the comment above EASYACCESS_ELEC_COMPANY_ID) should be routed to
// EasyAccess. Anything else falls back to KYB Data so an unverified/guessed
// code can't silently misroute a customer's verification or purchase to the
// wrong utility company.
function isEasyaccessDiscoConfirmed(providerCode?: string): boolean {
  return !!providerCode && providerCode.toLowerCase() in EASYACCESS_ELEC_COMPANY_ID;
}

export type ProviderName = "kyb" | "bigisub" | "clubkonnect" | "gsubz" | "easyaccess";
export type NetworkName  = "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
export type ExamName     = "WAEC" | "NECO" | "JAMB" | "NABTEB";

export const PROVIDER_INFO: Record<ProviderName, {
  label: string; description: string; credentialKey: string; credentialLabel: string;
}> = {
  kyb:          { label: "KYB Data",    description: "kybdatassub.com.ng",   credentialKey: "kybdata_api_token",   credentialLabel: "API Token" },
  bigisub:      { label: "BigISub",     description: "bigisub.ng",            credentialKey: "bigisub_api_token",   credentialLabel: "API Token" },
  clubkonnect:  { label: "Clubkonnect", description: "clubkonnect.com",       credentialKey: "clubkonnect_api_key", credentialLabel: "API Key"   },
  gsubz:        { label: "Gsubz",       description: "gsubz.com",             credentialKey: "gsubz_api_key",       credentialLabel: "API Key"   },
  easyaccess:   { label: "EasyAccess",  description: "easyaccess.com.ng",     credentialKey: "easyaccess_api_token", credentialLabel: "API Token" },
};

export const NETWORKS: NetworkName[] = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
export const EXAM_TYPES: ExamName[]  = ["WAEC", "NECO", "JAMB", "NABTEB"];

// Default fallback provider
let _default: ProviderName = "kyb";

// Per-network overrides
const _networkProviders: Partial<Record<NetworkName, ProviderName>> = {};
// Per-exam overrides
const _examProviders: Partial<Record<ExamName, ProviderName>> = {};
// Electricity service override (single toggle — not per-disco)
let _electricityProvider: ProviderName | null = null;

export function setDefaultProvider(name: string): void {
  if (name in PROVIDER_INFO) _default = name as ProviderName;
}

export function setNetworkProvider(network: string, provider: string): void {
  const net = network.toUpperCase() as NetworkName;
  if (NETWORKS.includes(net) && provider in PROVIDER_INFO) _networkProviders[net] = provider as ProviderName;
  else if (NETWORKS.includes(net) && provider === "")      delete _networkProviders[net];
}

export function setExamProvider(exam: string, provider: string): void {
  const ex = exam.toUpperCase() as ExamName;
  if (EXAM_TYPES.includes(ex) && provider in PROVIDER_INFO) _examProviders[ex] = provider as ProviderName;
  else if (EXAM_TYPES.includes(ex) && provider === "")       delete _examProviders[ex];
}

export function setElectricityProvider(provider: string): void {
  if (provider in PROVIDER_INFO) _electricityProvider = provider as ProviderName;
  else if (provider === "") _electricityProvider = null;
}

export function getDefaultProviderName(): ProviderName { return _default; }
export function getNetworkProviderName(network: string): ProviderName {
  return _networkProviders[network.toUpperCase() as NetworkName] ?? _default;
}
export function getExamProviderName(exam: string): ProviderName {
  return _examProviders[exam.toUpperCase() as ExamName] ?? _default;
}
export function getElectricityProviderName(): ProviderName {
  return _electricityProvider ?? _default;
}

export function getAllNetworkMappings(): Record<NetworkName, ProviderName> {
  const r = {} as Record<NetworkName, ProviderName>;
  for (const net of NETWORKS) r[net] = _networkProviders[net] ?? _default;
  return r;
}
export function getAllExamMappings(): Record<ExamName, ProviderName> {
  const r = {} as Record<ExamName, ProviderName>;
  for (const ex of EXAM_TYPES) r[ex] = _examProviders[ex] ?? _default;
  return r;
}

// Legacy compat
export function setActiveProvider(name: string): void { setDefaultProvider(name); }
export function getActiveProviderName(): ProviderName { return _default; }

export function isActiveProviderConfigured(): boolean { return isProviderConfigured(_default); }
export function isElectricityProviderConfigured(): boolean { return isProviderConfigured(getElectricityProviderName()); }
export function isProviderConfigured(name: ProviderName): boolean {
  if (name === "kyb")         return isKybdataConfigured();
  if (name === "bigisub")     return isBigisubConfigured();
  if (name === "clubkonnect") return isClubkonnectConfigured();
  if (name === "gsubz")       return isGsubzConfigured();
  if (name === "easyaccess")  return isEasyaccessConfigured();
  return false;
}

export function getAllProviderStatuses(): Record<ProviderName, boolean> {
  return {
    kyb:         isKybdataConfigured(),
    bigisub:     isBigisubConfigured(),
    clubkonnect: isClubkonnectConfigured(),
    gsubz:       isGsubzConfigured(),
    easyaccess:  isEasyaccessConfigured(),
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
    if (name === "bigisub") {
      if (!isBigisubConfigured()) return { ok: false, message: "API token not set" };
      try {
        const r = await bigisubGetBalance();
        const ok = r.balance !== undefined;
        return { ok, message: ok ? "Connected successfully" : (r.message ?? "Connection failed"), balance: r.balance };
      } catch (e: any) {
        if (e?.message === "BIGISUB_IP_BLOCKED") {
          return { ok: true, message: "Credentials saved — BigISub configured. (Server IP not whitelisted yet; ask BigISub support to whitelist your IP for API access.)" };
        }
        throw e;
      }
    }
    if (name === "clubkonnect") {
      if (!isClubkonnectConfigured()) return { ok: false, message: "API key not set" };
      const r = await clubkonnectGetBalance();
      const ok = r.balance !== undefined;
      return { ok, message: ok ? "Connected successfully" : (r.message ?? "Could not verify — check your API key and account verification"), balance: r.balance };
    }
    if (name === "gsubz" && isGsubzConfigured()) return { ok: true, message: "Credentials saved. Full integration pending." };
    if (name === "easyaccess") {
      if (!isEasyaccessConfigured()) return { ok: false, message: "API token not set" };
      const r = await easyaccessGetBalance();
      const ok = r.balance !== undefined;
      return { ok, message: ok ? "Connected successfully" : (r.message ?? "Connection failed"), balance: r.balance };
    }
    return { ok: false, message: "No credentials saved" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Connection test failed" };
  }
}

// ── Route to correct provider ─────────────────────────────────────────────────
function byNetwork(network: string): ProviderName { return getNetworkProviderName(network); }
function byExam(exam: string): ProviderName        { return getExamProviderName(exam); }

// KYB Data and BigISub are the primary production providers.
// Non-primary providers are wrapped with automatic KYB fallback so a mis-routing
// or unconfigured secondary provider never blocks a customer purchase.

function primaryFallback(): ProviderName {
  if (_default === "kyb" || _default === "bigisub") return _default;
  return isKybdataConfigured() ? "kyb" : "bigisub";
}

async function fallback<T>(fn: () => Promise<T>): Promise<T> {
  const fb = primaryFallback();
  if (fb === "bigisub") return bigisubPurchaseData as any;
  return kybdataPurchaseData as any;
}

export async function activePurchaseData(opts: { plan: number | string; mobile_number: string; network?: string }) {
  const p = byNetwork(opts.network ?? "");
  if (p === "kyb")        return kybdataPurchaseData(opts);
  if (p === "bigisub")    return bigisubPurchaseData(opts);
  if (p === "easyaccess") return easyaccessPurchaseData(opts);
  try {
    if (p === "clubkonnect") return await clubkonnectPurchaseData(opts);
    if (p === "gsubz")       return await gsubzPurchaseData(opts);
  } catch {
    if (_default === "bigisub") return bigisubPurchaseData(opts);
    return kybdataPurchaseData(opts);
  }
  if (_default === "bigisub") return bigisubPurchaseData(opts);
  return kybdataPurchaseData(opts);
}

// EasyAccess has no airtime endpoint, so a network routed to "easyaccess" for
// airtime automatically falls back to the primary provider (KYB/BigISub).
export async function activePurchaseAirtime(opts: { network: string; amount: number; mobile_number: string }) {
  const p = byNetwork(opts.network);
  if (p === "kyb")     return kybdataPurchaseAirtime(opts);
  if (p === "bigisub") return bigisubPurchaseAirtime(opts);
  if (p === "easyaccess") {
    return primaryFallback() === "bigisub" ? bigisubPurchaseAirtime(opts) : kybdataPurchaseAirtime(opts);
  }
  try {
    if (p === "clubkonnect") return await clubkonnectPurchaseAirtime(opts);
    if (p === "gsubz")       return await gsubzPurchaseAirtime(opts);
  } catch {
    if (_default === "bigisub") return bigisubPurchaseAirtime(opts);
    return kybdataPurchaseAirtime(opts);
  }
  if (_default === "bigisub") return bigisubPurchaseAirtime(opts);
  return kybdataPurchaseAirtime(opts);
}

// EasyAccess only supports WAEC/NECO/NABTEB; a JAMB purchase routed to
// "easyaccess" automatically falls back to the primary provider.
export async function activePurchaseExam(opts: { examid: number | string; quantity: number; examCode?: string }) {
  const p = byExam(opts.examCode ?? "");
  if (p === "kyb")     return kybdataPurchaseExam(opts);
  if (p === "bigisub") return bigisubPurchaseExam(opts);
  if (p === "easyaccess") {
    if (isEasyaccessExamSupported(opts.examCode ?? "")) return easyaccessPurchaseExam(opts);
    return primaryFallback() === "bigisub" ? bigisubPurchaseExam(opts) : kybdataPurchaseExam(opts);
  }
  try {
    if (p === "clubkonnect") return await clubkonnectPurchaseExam({ examCode: opts.examCode ?? "", quantity: opts.quantity });
    if (p === "gsubz")       return await gsubzPurchaseExam(opts);
  } catch {
    if (_default === "bigisub") return bigisubPurchaseExam(opts);
    return kybdataPurchaseExam(opts);
  }
  if (_default === "bigisub") return bigisubPurchaseExam(opts);
  return kybdataPurchaseExam(opts);
}

export async function activePurchaseElectricity(opts: { discoid: number | string; MeterType: string; meter_number: string; amount: number; providerCode?: string }) {
  const p = getElectricityProviderName();
  if (p === "kyb")         return kybdataPurchaseElectricity(opts);
  if (p === "bigisub")     return bigisubPurchaseElectricity({ ...opts, discoid: opts.providerCode ?? opts.discoid });
  if (p === "easyaccess") {
    if (!isEasyaccessDiscoConfirmed(opts.providerCode)) return kybdataPurchaseElectricity(opts);
    return easyaccessPurchaseElectricity({ meter_number: opts.meter_number, providerCode: opts.providerCode ?? "", MeterType: opts.MeterType, amount: opts.amount });
  }
  try {
    if (p === "clubkonnect") return await clubkonnectPurchaseElectricity(opts);
    if (p === "gsubz")       return await gsubzPurchaseElectricity(opts);
  } catch {
    if (isKybdataConfigured()) return kybdataPurchaseElectricity(opts);
    return bigisubPurchaseElectricity(opts);
  }
  return kybdataPurchaseElectricity(opts);
}

export async function activePurchaseCable(opts: { plan_id: number | string; smart_card_number: string; cable_name?: string }) {
  if (_default === "kyb")     return kybdataPurchaseCable(opts);
  if (_default === "bigisub") return bigisubPurchaseCable(opts);
  try {
    if (_default === "clubkonnect") return await clubkonnectPurchaseCable(opts);
    if (_default === "gsubz")       return await gsubzPurchaseCable(opts);
  } catch {
    if (isKybdataConfigured()) return kybdataPurchaseCable(opts);
    return bigisubPurchaseCable(opts);
  }
  return kybdataPurchaseCable(opts);
}

export async function activeVerifyMeter(opts: { meter_number: string; discoid: number | string; meter_type: string; providerCode?: string }) {
  const p = getElectricityProviderName();
  if (p === "kyb")         return kybdataVerifyMeter(opts);
  if (p === "bigisub")     return bigisubVerifyMeter({ meter_number: opts.meter_number, disco: opts.providerCode ?? String(opts.discoid), meter_type: opts.meter_type });
  if (p === "easyaccess") {
    if (!isEasyaccessDiscoConfirmed(opts.providerCode)) return kybdataVerifyMeter(opts);
    return easyaccessVerifyMeter({ meter_number: opts.meter_number, providerCode: opts.providerCode ?? "", meter_type: opts.meter_type });
  }
  try {
    if (p === "clubkonnect") return await clubkonnectVerifyMeter(opts);
    if (p === "gsubz")       return await gsubzVerifyMeter(opts);
  } catch {
    if (isKybdataConfigured()) return kybdataVerifyMeter(opts);
    return bigisubVerifyMeter({ meter_number: opts.meter_number, disco: String(opts.discoid), meter_type: opts.meter_type });
  }
  return kybdataVerifyMeter(opts);
}

export async function activeVerifySmartcard(opts: { smart_card_number: string; cable_name: string }) {
  if (_default === "kyb")     return kybdataVerifySmartcard(opts);
  if (_default === "bigisub") return bigisubVerifySmartcard(opts);
  try {
    if (_default === "clubkonnect") return await clubkonnectVerifySmartcard(opts);
    if (_default === "gsubz")       return await gsubzVerifySmartcard(opts);
  } catch {
    if (isKybdataConfigured()) return kybdataVerifySmartcard(opts);
    return bigisubVerifySmartcard(opts);
  }
  return kybdataVerifySmartcard(opts);
}

export function activeGetDataPlans() {
  if (_default === "gsubz") return gsubzGetDataPlans();
  return kybdataGetDataPlans();
}
