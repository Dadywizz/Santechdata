import app from "./app";
import { logger } from "./lib/logger";
import { startJobs } from "./lib/jobs";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { setKybdataToken } from "./lib/providers/kybdata";

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

  // Load KYB Data token from DB settings (overrides env var if set)
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "kybdata_api_token"));
    if (row?.value) {
      setKybdataToken(row.value);
      logger.info("KYB Data token loaded from DB settings");
    }
  } catch (e) {
    logger.warn({ err: e }, "Could not load KYB Data token from DB on startup");
  }

  logger.info({ port }, "Server listening");
  startJobs();
});
