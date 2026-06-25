/**
 * Husmodata (husmodata.com) VTU Provider — Stub
 * Integration will be completed once API documentation is provided.
 */

let _apiKey = process.env.HUSMODATA_API_KEY ?? "";

export function setHusmodataApiKey(key: string): void {
  if (key) _apiKey = key;
}

export function isHusmodataConfigured(): boolean {
  return !!_apiKey;
}

function notReady(): Promise<never> {
  return Promise.reject(new Error("Husmodata integration is not yet fully set up. Please contact support on 09026329296."));
}

export const husmodataPurchaseData = (_opts: unknown) => notReady();
export const husmodataPurchaseAirtime = (_opts: unknown) => notReady();
export const husmodataPurchaseElectricity = (_opts: unknown) => notReady();
export const husmodataPurchaseCable = (_opts: unknown) => notReady();
export const husmodataPurchaseExam = (_opts: unknown) => notReady();
export const husmodataVerifyMeter = (_opts: unknown) => notReady();
export const husmodataVerifySmartcard = (_opts: unknown) => notReady();
export const husmodataGetDataPlans = () => notReady();
