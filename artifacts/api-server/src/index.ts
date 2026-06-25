import app from "./app";
import { logger } from "./lib/logger";
import { startJobs } from "./lib/jobs";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { setKybdataToken } from "./lib/providers/kybdata";
import { setHusmodataApiKey } from "./lib/providers/husmodata";
import { setGsubzApiKey } from "./lib/providers/gsubz";
import { setActiveProvider } from "./lib/providers/activeProvider";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  // Load all provider credentials + active provider from DB settings
  try {
    const rows = await db.select().from(settingsTable);
    for (const row of rows) {
      if (row.key === "kybdata_api_token"  && row.value) setKybdataToken(row.value);
      if (row.key === "husmodata_api_key"  && row.value) setHusmodataApiKey(row.value);
      if (row.key === "gsubz_api_key"      && row.value) setGsubzApiKey(row.value);
      if (row.key === "activeProvider"     && row.value) setActiveProvider(row.value);
    }
    logger.info("Provider credentials loaded from DB settings");
  } catch (e) {
    logger.warn({ err: e }, "Could not load provider settings from DB on startup");
  }

  logger.info({ port }, "Server listening");
  startJobs();
});
