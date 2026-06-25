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

export type ProviderName = "kyb" | "clubkonnect" | "gsubz";
export type NetworkName  = "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
export type ExamName     = "WAEC" | "NECO" | "JAMB" | "NABTEB";

export const PROVIDER_INFO: Record<ProviderName, {
  label: string; description: string; credentialKey: string; credentialLabel: string;
}> = {
  kyb:          { label: "KYB Data",    description: "kybdatassub.com.ng",   credentialKey: "kybdata_api_token",   credentialLabel: "API Token" },
  clubkonnect:  { label: "Clubkonnect", description: "clubkonnect.com",       credentialKey: "clubkonnect_api_key", credentialLabel: "API Key"   },
  gsubz:        { label: "Gsubz",       description: "gsubz.com",             credentialKey: "gsubz_api_key",       credentialLabel: "API Key"   },
};

export const NETWORKS: NetworkName[] = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
export const EXAM_TYPES: ExamName[]  = ["WAEC", "NECO", "JAMB", "NABTEB"];

// Default fallback provider
let _default: ProviderName = "kyb";

// Per-network overrides
const _networkProviders: Partial<Record<NetworkName, ProviderName>> = {};
// Per-exam overrides
const _examProviders: Partial<Record<ExamName, ProviderName>> = {};

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

export function getDefaultProviderName(): ProviderName { return _default; }
export function getNetworkProviderName(network: string): ProviderName {
  return _networkProviders[network.toUpperCase() as NetworkName] ?? _default;
}
export function getExamProviderName(exam: string): ProviderName {
  return _examProviders[exam.toUpperCase() as ExamName] ?? _default;
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
export function isProviderConfigured(name: ProviderName): boolean {
  if (name === "kyb")         return isKybdataConfigured();
  if (name === "clubkonnect") return isClubkonnectConfigured();
  if (name === "gsubz")       return isGsubzConfigured();
  return false;
}

export function getAllProviderStatuses(): Record<ProviderName, boolean> {
  return {
    kyb:         isKybdataConfigured(),
    clubkonnect: isClubkonnectConfigured(),
    gsubz:       isGsubzConfigured(),
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
    if (name === "clubkonnect") {
      if (!isClubkonnectConfigured()) return { ok: false, message: "API key not set" };
      const r = await clubkonnectGetBalance();
      const ok = r.balance !== undefined;
      return { ok, message: ok ? "Connected successfully" : (r.message ?? "Could not verify — check your API key and account verification"), balance: r.balance };
    }
    if (name === "gsubz" && isGsubzConfigured()) return { ok: true, message: "Credentials saved. Full integration pending." };
    return { ok: false, message: "No credentials saved" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Connection test failed" };
  }
}

// ── Route to correct provider ─────────────────────────────────────────────────
function byNetwork(network: string): ProviderName { return getNetworkProviderName(network); }
function byExam(exam: string): ProviderName        { return getExamProviderName(exam); }

// KYB Data is the primary production provider.
// Non-KYB providers are wrapped with automatic KYB fallback so a mis-routing
// or unconfigured secondary provider never blocks a customer purchase.

export async function activePurchaseData(opts: { plan: number | string; mobile_number: string; network?: string }) {
  const p = byNetwork(opts.network ?? "");
  if (p === "kyb") return kybdataPurchaseData(opts);
  try {
    if (p === "clubkonnect") return await clubkonnectPurchaseData(opts);
    if (p === "gsubz")       return await gsubzPurchaseData(opts);
  } catch {
    return kybdataPurchaseData(opts);
  }
  return kybdataPurchaseData(opts);
}

export async function activePurchaseAirtime(opts: { network: string; amount: number; mobile_number: string }) {
  const p = byNetwork(opts.network);
  if (p === "kyb") return kybdataPurchaseAirtime(opts);
  try {
    if (p === "clubkonnect") return await clubkonnectPurchaseAirtime(opts);
    if (p === "gsubz")       return await gsubzPurchaseAirtime(opts);
  } catch {
    return kybdataPurchaseAirtime(opts);
  }
  return kybdataPurchaseAirtime(opts);
}

export async function activePurchaseExam(opts: { examid: number | string; quantity: number; examCode?: string }) {
  const p = byExam(opts.examCode ?? "");
  if (p === "kyb") return kybdataPurchaseExam(opts);
  try {
    if (p === "clubkonnect") return await clubkonnectPurchaseExam({ examCode: opts.examCode ?? "", quantity: opts.quantity });
    if (p === "gsubz")       return await gsubzPurchaseExam(opts);
  } catch {
    return kybdataPurchaseExam(opts);
  }
  return kybdataPurchaseExam(opts);
}

export async function activePurchaseElectricity(opts: { discoid: number | string; MeterType: string; meter_number: string; amount: number }) {
  if (_default === "kyb") return kybdataPurchaseElectricity(opts);
  try {
    if (_default === "clubkonnect") return await clubkonnectPurchaseElectricity(opts);
    if (_default === "gsubz")       return await gsubzPurchaseElectricity(opts);
  } catch {
    return kybdataPurchaseElectricity(opts);
  }
  return kybdataPurchaseElectricity(opts);
}

export async function activePurchaseCable(opts: { plan_id: number | string; smart_card_number: string; cable_name?: string }) {
  if (_default === "kyb") return kybdataPurchaseCable(opts);
  try {
    if (_default === "clubkonnect") return await clubkonnectPurchaseCable(opts);
    if (_default === "gsubz")       return await gsubzPurchaseCable(opts);
  } catch {
    return kybdataPurchaseCable(opts);
  }
  return kybdataPurchaseCable(opts);
}

export async function activeVerifyMeter(opts: { meter_number: string; discoid: number | string; meter_type: string }) {
  if (_default === "kyb") return kybdataVerifyMeter(opts);
  try {
    if (_default === "clubkonnect") return await clubkonnectVerifyMeter(opts);
    if (_default === "gsubz")       return await gsubzVerifyMeter(opts);
  } catch {
    return kybdataVerifyMeter(opts);
  }
  return kybdataVerifyMeter(opts);
}

export async function activeVerifySmartcard(opts: { smart_card_number: string; cable_name: string }) {
  if (_default === "kyb") return kybdataVerifySmartcard(opts);
  try {
    if (_default === "clubkonnect") return await clubkonnectVerifySmartcard(opts);
    if (_default === "gsubz")       return await gsubzVerifySmartcard(opts);
  } catch {
    return kybdataVerifySmartcard(opts);
  }
  return kybdataVerifySmartcard(opts);
}

export function activeGetDataPlans() {
  if (_default === "gsubz") return gsubzGetDataPlans();
  return kybdataGetDataPlans();
}
