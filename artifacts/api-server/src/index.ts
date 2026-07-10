import app from "./app";
import { logger } from "./lib/logger";
import { startJobs } from "./lib/jobs";
import { refreshSettings } from "./lib/settingsCache";

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
  await refreshSettings();

  logger.info({ port }, "Server listening");
  startJobs();
});
