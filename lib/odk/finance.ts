import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderPaidAdminEmail, sendOrderPaidUserEmail } from "@/lib/email";

export async function markOdkOrderPaid(
  orderId: string,
  options: { transaction?: Prisma.TransactionClient; afterCommit?: Array<() => Promise<void>> } = {},
): Promise<void> {
  const execute = async (tx: Prisma.TransactionClient) => {
    const order = await tx.odkOrder.findUnique({
      where: { id: orderId },
      include: { package: { select: { title: true } } },
    });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status !== "PAID") {
      await tx.odkOrder.update({ where: { id: order.id }, data: { status: "PAID" } });
    }
    return {
      packageName: order.package.title,
      totalCents: order.totalCents,
      buyer: (order.buyerInfo ?? {}) as Record<string, string | null | undefined>,
    };
  };
  const result = options.transaction ? await execute(options.transaction) : await prisma.$transaction(execute);
  const notify = async () => {
    const email = result.buyer.email;
    const deliveries: Promise<void>[] = [];
    if (email) deliveries.push(sendOrderPaidUserEmail({ to: email, name: result.buyer.fullName, service: "ODK", orderId, packageName: result.packageName, totalCents: result.totalCents }));
    deliveries.push(sendOrderPaidAdminEmail({ service: "ODK", orderId, packageName: result.packageName, totalCents: result.totalCents, buyer: result.buyer }));
    await Promise.all(deliveries);
  };
  if (options.afterCommit) options.afterCommit.push(notify);
  else await notify();
}
