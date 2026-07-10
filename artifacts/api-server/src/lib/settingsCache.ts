import { db, settingsTable } from "@workspace/db";
import { logger } from "./logger";
import { setKybdataToken } from "./providers/kybdata";
import { setClubkonnectApiKey, setClubkonnectUserId } from "./providers/clubkonnect";
import { setGsubzApiKey } from "./providers/gsubz";
import { setBigisubToken, setBigisubBaseUrl } from "./providers/bigisub";
import { setEasyaccessToken } from "./providers/easyaccess";
import { setActiveProvider, setNetworkProvider, setExamProvider, setElectricityProvider } from "./providers/activeProvider";

const TTL_MS = 15_000;

let lastRefreshedAt = 0;
let inFlight: Promise<void> | null = null;

export function applySettingsRows(rows: { key: string; value: string }[]): void {
  for (const row of rows) {
    if (row.key === "bigisub_api_token"    && row.value) setBigisubToken(row.value);
    if (row.key === "bigisub_base_url"               ) setBigisubBaseUrl(row.value);
    if (row.key === "kybdata_api_token"    && row.value) setKybdataToken(row.value);
    if (row.key === "clubkonnect_api_key"  && row.value) setClubkonnectApiKey(row.value);
    if (row.key === "clubkonnect_user_id"  && row.value) setClubkonnectUserId(row.value);
    if (row.key === "gsubz_api_key"        && row.value) setGsubzApiKey(row.value);
    if (row.key === "easyaccess_api_token" && row.value) setEasyaccessToken(row.value);
    if (row.key === "activeProvider"       && row.value) setActiveProvider(row.value);
    if (row.key === "elec_provider"                    ) setElectricityProvider(row.value);
    if (row.key.startsWith("net_provider_"))  setNetworkProvider(row.key.replace("net_provider_", ""), row.value);
    if (row.key.startsWith("exam_provider_")) setExamProvider(row.key.replace("exam_provider_", ""), row.value);
  }
}

export async function refreshSettings(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const rows = await db.select().from(settingsTable);
      applySettingsRows(rows);
      lastRefreshedAt = Date.now();
      logger.info("Provider/routing settings refreshed from DB");
    } catch (e) {
      logger.warn({ err: e }, "Could not refresh provider settings from DB; keeping current in-memory values");
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function ensureFreshSettings(ttlMs: number = TTL_MS): Promise<void> {
  if (Date.now() - lastRefreshedAt < ttlMs) return;
  await refreshSettings();
}
