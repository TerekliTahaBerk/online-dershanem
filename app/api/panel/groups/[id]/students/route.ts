import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

const querySchema = z.object({ q: z.string().trim().max(120).default("") });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;

  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return invalidApiInput("Geçersiz öğrenci araması.");
  const query = parsed.data.q;
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
