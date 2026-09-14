import { appendFile } from "node:fs/promises";
import { findStuckPayments, DEFAULT_STUCK_PAYMENT_AGE_MINUTES } from "../lib/commerce/stuck-payments.ts";
import { prisma } from "../lib/prisma.ts";

const rawAge = process.env.STUCK_PAYMENT_MIN_AGE_MINUTES;
const olderThanMinutes = rawAge === undefined ? DEFAULT_STUCK_PAYMENT_AGE_MINUTES : Number(rawAge);
if (!Number.isInteger(olderThanMinutes) || olderThanMinutes < 0 || olderThanMinutes > 10_080) {
  throw new Error("STUCK_PAYMENT_MIN_AGE_MINUTES must be an integer between 0 and 10080");
}

try {
  const now = new Date();
  const stuck = await findStuckPayments({ olderThanMinutes, now });
  const report = {
    checkedAt: now.toISOString(),
    olderThanMinutes,
    count: stuck.length,
    payments: stuck.map((payment) => ({
      ...payment,
      paidAt: payment.paidAt.toISOString(),
    })),
  };
  console.log(JSON.stringify(report, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      "## Stuck payment reconciliation",
      "",
      `- Checked at: ${report.checkedAt}`,
      `- Minimum age: ${olderThanMinutes} minutes`,
      `- Stuck payments: ${stuck.length}`,
      "",
      ...stuck.map((payment) =>
        `- ${payment.service} order \`${payment.orderId}\`: ${payment.provisioningStatus} (paid ${payment.paidAt.toISOString()})`,
      ),
      "",
    ];
    await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
  }

  if (stuck.length > 0) process.exitCode = 2;
} finally {
  await prisma.$disconnect();
}
