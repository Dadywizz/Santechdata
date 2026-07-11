import express, { type Express, type Request } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
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

export default app;
