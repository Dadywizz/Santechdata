import { db } from "@workspace/db";
import { transactionsTable, notificationsTable } from "@workspace/db";
import { eq, and, lt, inArray } from "drizzle-orm";
import { logger } from "./logger";

const EXPIRY_MINUTES = 30;

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

export function startJobs(): void {
  expirePendingPayments();
  setInterval(expirePendingPayments, 5 * 60 * 1000);
  logger.info("Background jobs started (payment expiry every 5 min)");
}
