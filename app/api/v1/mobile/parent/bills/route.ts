import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, jsonError } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARENT" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const orders = await prisma.odkOrder.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      package: { select: { id: true, title: true } },
      payments: { select: { id: true, status: true, amountCents: true, paidAt: true } },
    },
  });

  return NextResponse.json({
    data: orders.map((o) => ({
      id: o.id,
      package: o.package,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt.toISOString(),
      payments: o.payments.map((p) => ({
        id: p.id,
        status: p.status,
        amountCents: p.amountCents,
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
    })),
  });
}
