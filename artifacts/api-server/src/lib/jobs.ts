import { db } from "@workspace/db";
import { transactionsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, lt, inArray, sql } from "drizzle-orm";
import { logger } from "./logger";

const EXPIRY_MINUTES = 30;
const STALE_PENDING_MINUTES = 10;
const RESOLVABLE_TYPES = ["data", "airtime", "electricity", "cable", "exam"] as const;

async function expirePendingPayments(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

    const expired = await db
      .select({ id: transactionsTable.id, userId: transactionsTable.userId, amount: transactionsTable.amount })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.type, "wallet_fund"),
          eq(transactionsTable.status, "pending"),
          lt(transactionsTable.createdAt, cutoff)
        )
      );

    if (expired.length === 0) return;

    const ids = expired.map((t) => t.id);

    await db
      .update(transactionsTable)
      .set({ status: "failed" })
      .where(inArray(transactionsTable.id, ids));

    const notifications = expired.map((t) => ({
      userId: t.userId,
      title: "Payment Not Completed",
      message: `Your wallet funding of ₦${Number(t.amount).toLocaleString()} was not completed and has been marked as failed. If money was deducted from your account, go to Transactions, find the failed payment and tap "Report Issue" to file a complaint — we will resolve it within 24 hours.`,
      type: "wallet" as const,
    }));

    await db.insert(notificationsTable).values(notifications);

    logger.info({ count: expired.length }, "Expired pending wallet_fund transactions");
  } catch (err) {
    logger.error({ err }, "Failed to expire pending payments");
  }
}

// Flags stale "awaiting review" service purchases (provider call timed out,
// wallet still debited, outcome unknown) for admin attention. Deliberately
// does NOT auto-refund or auto-resolve — a provider-call timeout does not
// mean the provider failed, so only a human checking the provider's portal
// can safely decide the outcome (see admin resolve endpoint).
async function notifyStalePendingPurchases(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000);

    const stale = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          inArray(transactionsTable.type, RESOLVABLE_TYPES),
          eq(transactionsTable.status, "pending"),
          lt(transactionsTable.createdAt, cutoff)
        )
      );

    const unnotified = stale.filter((t) => {
      const meta = (t.metadata as Record<string, any>) ?? {};
      return meta.awaitingReview && !meta.adminNotifiedAt;
    });

    if (unnotified.length === 0) return;

    const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
    if (admins.length === 0) {
      logger.warn({ count: unnotified.length }, "Stale pending purchases found but no admin users to notify");
      return;
    }

    const notifiedAt = new Date().toISOString();

    for (const tx of unnotified) {
      const meta = (tx.metadata as Record<string, any>) ?? {};
      await db
        .update(transactionsTable)
        .set({ metadata: { ...meta, adminNotifiedAt: notifiedAt } })
        .where(eq(transactionsTable.id, tx.id));

      await db.insert(notificationsTable).values(
        admins.map((admin) => ({
          userId: admin.id,
          title: "Purchase Awaiting Review",
          message: `A ₦${Number(tx.amount).toLocaleString()} ${tx.type} purchase (ref: ${tx.reference ?? tx.id}) has been pending for over ${STALE_PENDING_MINUTES} minutes — the provider call timed out and the outcome is unknown. Check the provider's portal, then resolve it from Admin → Transactions.`,
          type: tx.type as any,
        }))
      );
    }

    logger.info({ count: unnotified.length, admins: admins.length }, "Notified admins of stale pending purchases");
  } catch (err) {
    logger.error({ err }, "Failed to notify admins of stale pending purchases");
  }
}

export function startJobs(): void {
  expirePendingPayments();
  setInterval(expirePendingPayments, 5 * 60 * 1000);
  notifyStalePendingPurchases();
  setInterval(notifyStalePendingPurchases, 5 * 60 * 1000);
  logger.info("Background jobs started (payment expiry + stale-pending-purchase review, every 5 min)");
}
