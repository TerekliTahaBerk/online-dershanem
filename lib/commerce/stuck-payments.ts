import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_STUCK_PAYMENT_AGE_MINUTES = 30;

type PaymentQueryClient = PrismaClient | Prisma.TransactionClient;

export type StuckPayment = {
  service: "OD" | "ODK";
  paymentId: string;
  orderId: string;
  paidAt: Date;
  provisioningStatus: string;
  provisioningError: string | null;
};

/**
 * Salt okunur reconciliation sorgusu. Kimlik/iletişim veya para tutarı döndürmez;
 * yalnız ödeme alınmış fakat provisioning tamamlanmamış siparişleri görünür kılar.
 */
export async function findStuckPayments(options: {
  olderThanMinutes?: number;
  now?: Date;
  client?: PaymentQueryClient;
} = {}): Promise<StuckPayment[]> {
  const client = options.client ?? prisma;
  const olderThanMinutes = options.olderThanMinutes ?? DEFAULT_STUCK_PAYMENT_AGE_MINUTES;
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - olderThanMinutes * 60_000);

  const [od, odk] = await Promise.all([
    client.odPayment.findMany({
      where: {
        status: "SUCCEEDED",
        paidAt: { lte: cutoff },
        order: {
          status: "PAID",
          provisionedAt: null,
          provisioningStatus: { not: "SUCCEEDED" },
        },
      },
      select: {
        id: true,
        orderId: true,
        paidAt: true,
        order: { select: { provisioningStatus: true, provisioningError: true } },
      },
      orderBy: { paidAt: "asc" },
    }),
    client.odkPayment.findMany({
      where: {
        status: "SUCCEEDED",
        paidAt: { lte: cutoff },
        order: {
          status: "PAID",
          provisionedAt: null,
          provisioningStatus: { not: "SUCCEEDED" },
        },
      },
      select: {
        id: true,
        orderId: true,
        paidAt: true,
        order: { select: { provisioningStatus: true, provisioningError: true } },
      },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  return [
    ...od.flatMap((payment) => payment.paidAt ? [{
      service: "OD" as const,
      paymentId: payment.id,
      orderId: payment.orderId,
      paidAt: payment.paidAt,
      provisioningStatus: payment.order.provisioningStatus,
      provisioningError: payment.order.provisioningError,
    }] : []),
    ...odk.flatMap((payment) => payment.paidAt ? [{
      service: "ODK" as const,
      paymentId: payment.id,
      orderId: payment.orderId,
      paidAt: payment.paidAt,
      provisioningStatus: payment.order.provisioningStatus,
      provisioningError: payment.order.provisioningError,
    }] : []),
  ].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
}
