/**
 * Gsubz (gsubz.com) VTU Provider — Stub
 * Integration will be completed once API documentation is provided.
 */

let _apiKey = process.env.GSUBZ_API_KEY ?? "";

export function setGsubzApiKey(key: string): void {
  if (key) _apiKey = key;
}

export function isGsubzConfigured(): boolean {
  return !!_apiKey;
}

function notReady(): Promise<never> {
  return Promise.reject(new Error("Gsubz integration is not yet fully set up. Please contact support on 09026329296."));
}

export const gsubzPurchaseData = (_opts: unknown) => notReady();
export const gsubzPurchaseAirtime = (_opts: unknown) => notReady();
export const gsubzPurchaseElectricity = (_opts: unknown) => notReady();
export const gsubzPurchaseCable = (_opts: unknown) => notReady();
export const gsubzPurchaseExam = (_opts: unknown) => notReady();
export const gsubzVerifyMeter = (_opts: unknown) => notReady();
export const gsubzVerifySmartcard = (_opts: unknown) => notReady();
export const gsubzGetDataPlans = () => notReady();
