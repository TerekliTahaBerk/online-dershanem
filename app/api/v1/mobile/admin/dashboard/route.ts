import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") return jsonError(403, "FORBIDDEN", "Yetkisiz.");

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    studentCount, teacherCount, parentCount,
    activeStudents, lessonsThisMonth, revenueAgg, pendingOrders,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count({ where: { status: "ACTIVE" } }),
    prisma.parent.count(),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.lesson.count({ where: { scheduledAt: { gte: monthAgo } } }),
    prisma.accountingEntry.aggregate({
      where: { type: "INCOME", occurredAt: { gte: monthAgo } },
      _sum: { amount: true },
    }),
    prisma.odkOrder.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({
    data: {
      counts: {
        students: studentCount,
        activeStudents,
        teachers: teacherCount,
        parents: parentCount,
      },
      kpis: {
        lessonsThisMonth,
        revenueCentsThisMonth: revenueAgg._sum.amount ?? 0,
        pendingOrders,
      },
    },
  });
}
