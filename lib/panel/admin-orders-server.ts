import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { istanbulMonthStart } from "@/lib/istanbul-time";

export const ORDER_PAGE_SIZE = 30;
export async function loadAdminOrders(input: { filtre?: string; sayfa?: string; q?: string }) {
  const filtre = ["sorun", "ay"].includes(input.filtre ?? "") ? input.filtre! : "";
  const page = Math.min(100000, Math.max(1, Number.parseInt(input.sayfa ?? "1", 10) || 1));
  const q = (input.q ?? "").trim().slice(0, 80);
  const monthStart = istanbulMonthStart(new Date());

  const where: Prisma.OdOrderWhereInput = {
    ...(filtre === "sorun"
      ? { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } }
      : {}),
    ...(filtre === "ay" ? { createdAt: { gte: monthStart } } : {}),
    ...(q
      ? {
          OR: [
            { packageName: { contains: q, mode: "insensitive" as const } },
            { user: { fullName: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, orders, problemCount] = await Promise.all([
    prisma.odOrder.count({ where }),
    prisma.odOrder.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ORDER_PAGE_SIZE,
      take: ORDER_PAGE_SIZE,
      select: {
        id: true,
        packageName: true,
        status: true,
        provisioningStatus: true,
        totalCents: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
        lines: { select: { productName: true }, orderBy: { position: "asc" } },
      },
    }),
    prisma.odOrder.count({
      where: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
  return { filtre, page, q, total, orders, problemCount, pageCount };
}

export async function loadAdminOrder(id: string) {
  return await prisma.odOrder.findUnique({
    where: { id },
    select: {
      id: true,
      updatedAt: true,
      packageName: true,
      status: true,
      totalCents: true,
      createdAt: true,
      provisioningStatus: true,
      provisioningAttempts: true,
      provisioningError: true,
      provisionedAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          studentProfile: { select: { id: true } },
        },
      },
      onboarding: {
        select: {
          state: true,
          dueAt: true,
          owner: { select: { fullName: true, email: true } },
        },
      },
      payments: {
        select: {
          status: true,
          provider: true,
          amountCents: true,
          paidAt: true,
          failureReason: true,
        },
        orderBy: { createdAt: "desc" },
      },
      lines: {
        select: {
          id: true,
          productName: true,
          fulfillmentStatus: true,
          fulfillmentError: true,
          fulfillmentAttempts: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });

}
