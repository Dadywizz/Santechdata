import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ticketsTable, ticketMessagesTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/auth";
import {
  GetTicketParams,
  ReplyTicketParams,
  CreateTicketBody,
  ReplyTicketBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getTicketWithMessages(ticketId: string) {
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId));
  if (!ticket) return null;
  const messages = await db.select().from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, ticketId))
    .orderBy(ticketMessagesTable.createdAt);
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    userId: ticket.userId,
    createdAt: ticket.createdAt,
    messages: messages.map((m) => ({
      id: m.id,
      message: m.message,
      senderRole: m.senderRole,
      createdAt: m.createdAt,
    })),
  };
}

// GET /support/tickets
router.get("/support/tickets", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const tickets = await db.select().from(ticketsTable)
    .where(eq(ticketsTable.userId, req.userId!))
    .orderBy(desc(ticketsTable.createdAt));

  const result = await Promise.all(tickets.map((t) => getTicketWithMessages(t.id)));
  res.json(result.filter(Boolean));
});

// POST /support/tickets
router.post("/support/tickets", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { subject, message, priority } = parsed.data;

  const [ticket] = await db.insert(ticketsTable).values({
    userId: req.userId!,
    subject,
    priority,
  }).returning();

  await db.insert(ticketMessagesTable).values({
    ticketId: ticket.id,
    senderId: req.userId!,
    senderRole: "customer",
    message,
  });

  const full = await getTicketWithMessages(ticket.id);
  res.status(201).json(full);
});

// GET /support/tickets/:id
router.get("/support/tickets/:id", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ticket = await getTicketWithMessages(raw);
  if (!ticket || ticket.userId !== req.userId!) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(ticket);
});

// POST /support/tickets/:id/messages
router.post("/support/tickets/:id/messages", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ReplyTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(and(eq(ticketsTable.id, rawId), eq(ticketsTable.userId, req.userId!)));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const [msg] = await db.insert(ticketMessagesTable).values({
    ticketId: rawId,
    senderId: req.userId!,
    senderRole: "customer",
    message: parsed.data.message,
  }).returning();

  res.status(201).json({
    id: msg.id,
    message: msg.message,
    senderRole: msg.senderRole,
    createdAt: msg.createdAt,
  });
});

// ── ADMIN SUPPORT ─────────────────────────────────────────────────────────────
// GET /admin/tickets
router.get("/admin/tickets", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const all = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));
  const filtered = status ? all.filter((t) => t.status === status) : all;
  const result = await Promise.all(filtered.map((t) => getTicketWithMessages(t.id)));
  res.json(result.filter(Boolean));
});

// POST /admin/tickets/:id/reply
router.post("/admin/tickets/:id/reply", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = ReplyTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, rawId));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const [msg] = await db.insert(ticketMessagesTable).values({
    ticketId: rawId,
    senderId: req.userId!,
    senderRole: "admin",
    message: parsed.data.message,
  }).returning();

  // Update ticket status to in_progress if still open
  if (ticket.status === "open") {
    await db.update(ticketsTable).set({ status: "in_progress" }).where(eq(ticketsTable.id, rawId));
  }

  res.status(201).json({ id: msg.id, message: msg.message, senderRole: msg.senderRole, createdAt: msg.createdAt });
});

// PATCH /admin/tickets/:id/status
router.patch("/admin/tickets/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body as { status: string };

  const [updated] = await db.update(ticketsTable)
    .set({ status: status as "open" | "in_progress" | "resolved" | "closed", updatedAt: new Date() })
    .where(eq(ticketsTable.id, rawId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const full = await getTicketWithMessages(updated.id);
  res.json(full);
});

export default router;
