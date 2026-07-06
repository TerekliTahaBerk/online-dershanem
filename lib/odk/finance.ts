import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderPaidAdminEmail, sendOrderPaidUserEmail } from "@/lib/email";

export async function markOdkOrderPaid(
  orderId: string,
  options: { transaction?: Prisma.TransactionClient; afterCommit?: Array<() => void> } = {},
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
  const notify = () => {
    const email = result.buyer.email;
    if (email) void sendOrderPaidUserEmail({ to: email, name: result.buyer.fullName, service: "ODK", orderId, packageName: result.packageName, totalCents: result.totalCents });
    void sendOrderPaidAdminEmail({ service: "ODK", orderId, packageName: result.packageName, totalCents: result.totalCents, buyer: result.buyer });
  };
  options.afterCommit ? options.afterCommit.push(notify) : notify();
}
