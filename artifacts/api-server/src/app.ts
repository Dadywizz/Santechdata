import express, { type Express, type Request } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { existsSync } from "fs";
import { ensureFreshSettings } from "./lib/settingsCache";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({
  verify: (req: Request, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

// Health endpoint registered BEFORE ensureFreshSettings so deployment
// healthchecks pass immediately during cold start without waiting for DB.
app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/api", (_req, res) => res.json({ status: "ok" }));

app.use("/api", async (_req, _res, next) => {
  await ensureFreshSettings();
  next();
});
app.use("/api", router);

// Serve frontend static files when running outside Replit's deployment proxy
// (e.g. Railway). Only activates when the frontend has been built.
const frontendDist = path.resolve("artifacts/santech-data/dist/public");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: false }));
  // SPA fallback — use app.use (not app.get) to avoid path-to-regexp wildcard issues
  app.use((_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
