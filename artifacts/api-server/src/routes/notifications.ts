import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/auth";
import { GetNotificationsQueryParams, MarkNotificationReadParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /notifications
router.get("/notifications", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const params = GetNotificationsQueryParams.safeParse(req.query);
  const all = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(desc(notificationsTable.createdAt));

  const filtered = params.success && params.data.unread === true
    ? all.filter((n) => !n.isRead)
    : all;

  res.json(filtered.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt,
  })));
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, raw), eq(notificationsTable.userId, req.userId!)));
  res.json({ message: "Notification marked as read" });
});

// PATCH /notifications/read-all
router.patch("/notifications/read-all", authenticate, async (req: AuthRequest, res): Promise<void> => {
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.userId!));
  res.json({ message: "All notifications marked as read" });
});

export default router;
