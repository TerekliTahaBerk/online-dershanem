import { PrismaClient } from "@prisma/client";
import { upsertOrderLedger } from "../lib/business/finance";
const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
async function main() {
  const [od, odk] = await Promise.all([
    prisma.odOrder.findMany({ where: { status: "PAID" }, select: { id: true, packageName: true, totalCents: true, discountCents: true, payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "desc" }, take: 1 } } }),
    prisma.odkOrder.findMany({ where: { status: "PAID" }, select: { id: true, totalCents: true, discountCents: true, package: { select: { title: true } }, payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "desc" }, take: 1 } } }),
  ]);
  const failures: Array<{ id: string; error: string }> = []; let processed = 0;
  for (const order of od) try { if (!dryRun) await prisma.$transaction((tx) => upsertOrderLedger(tx, { source: "ONLINE_DERSHANEM", orderId: order.id, totalCents: order.totalCents, discountCents: order.discountCents, description: order.packageName, paidAt: order.payments[0]?.paidAt ?? new Date(), paymentMethod: "PAYTR" })); processed++; } catch (error) { failures.push({ id: order.id, error: error instanceof Error ? error.message : "unknown" }); }
  for (const order of odk) try { if (!dryRun) await prisma.$transaction((tx) => upsertOrderLedger(tx, { source: "ONLINE_DENEME_KULUBU", orderId: order.id, totalCents: order.totalCents, discountCents: order.discountCents, description: order.package.title, paidAt: order.payments[0]?.paidAt ?? new Date(), paymentMethod: "PAYTR" })); processed++; } catch (error) { failures.push({ id: order.id, error: error instanceof Error ? error.message : "unknown" }); }
  console.log(JSON.stringify({ dryRun, discovered: od.length + odk.length, processed, failed: failures.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}
main().finally(() => prisma.$disconnect());

