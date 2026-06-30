import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface ApiKeyRequest extends Request {
  apiUserId?: string;
  apiKeyId?: string;
}

export async function requireApiKey(req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const rawKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-api-key"] as string;

  if (!rawKey) {
    res.status(401).json({ error: "Missing API key. Pass via Authorization: Bearer <key> or X-Api-Key header." });
    return;
  }

  const [apiKey] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.key, rawKey)).limit(1);
  if (!apiKey) {
    res.status(401).json({ error: "Invalid API key." });
    return;
  }
  if (!apiKey.isActive) {
    res.status(403).json({ error: "This API key has been disabled. Contact support." });
    return;
  }

  await db.update(apiKeysTable)
    .set({ lastUsedAt: new Date(), totalRequests: sql`${apiKeysTable.totalRequests} + 1` })
    .where(eq(apiKeysTable.id, apiKey.id));

  req.apiUserId = apiKey.userId;
  req.apiKeyId = apiKey.id;
  next();
}
