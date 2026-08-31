import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const limit = 20;

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, capacity: true, isActive: true, enrollments: { where: { endedAt: null }, select: { studentId: true } } },
  });
  if (!group) return NextResponse.json({ error: "Grup bulunamadı." }, { status: 404 });

  const activeStudentIds = new Set(group.enrollments.map((item) => item.studentId));
  const candidates = await prisma.studentProfile.findMany({
    where: {
      user: {
        status: "ACTIVE",
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      id: { notIn: [...activeStudentIds] },
    },
    orderBy: { user: { fullName: "asc" } },
    take: limit,
    select: {
      id: true,
      user: { select: { fullName: true, email: true } },
      enrollments: {
        where: { endedAt: null },
        select: { group: { select: { name: true, id: true } } },
      },
    },
  });

  return NextResponse.json({
    seats: { capacity: group.capacity, active: group.enrollments.length, available: Math.max(0, group.capacity - group.enrollments.length), isActive: group.isActive },
    students: candidates.map((student) => ({
      id: student.id,
      name: student.user.fullName || student.user.email,
      email: student.user.email,
      activeGroups: student.enrollments.map((item) => ({ id: item.group.id, name: item.group.name })),
    })),
  });
}
