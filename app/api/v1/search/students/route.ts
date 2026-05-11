import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Async select için öğrenci arama. AutoForm ve diğer seçicilerden çağrılır.
 * Yetki: ADMIN herkesi, TEACHER kendi öğrencilerini, PARENT çocuklarını,
 * STUDENT yalnız kendini görür.
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ items: [] }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const ids = req.nextUrl.searchParams.get("ids");
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 20), 50);

  const role = session.user.role;
  const baseWhere: any = ids
    ? { id: { in: ids.split(",") } }
    : q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {};

  // Scope filter
  let where = baseWhere;
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!teacher) return NextResponse.json({ items: [] });
    where = {
      AND: [
        baseWhere,
        {
          OR: [
            { lessons: { some: { teacherId: teacher.id } } },
            { classrooms: { some: { classroom: { teachers: { some: { teacherId: teacher.id } } } } } },
          ],
        },
      ],
    };
  } else if (role === "PARENT") {
    const parent = await prisma.parent.findUnique({
      where: { userId: session.user.id },
      select: { students: { select: { studentId: true } } },
    });
    if (!parent) return NextResponse.json({ items: [] });
    where = { AND: [baseWhere, { id: { in: parent.students.map((s) => s.studentId) } }] };
  } else if (role === "STUDENT") {
    where = { AND: [baseWhere, { userId: session.user.id }] };
  }

  const items = await prisma.student.findMany({
    where,
    select: { id: true, fullName: true, classLevel: true, phone: true },
    orderBy: { fullName: "asc" },
    take,
  });

  return NextResponse.json({
    items: items.map((s) => ({
      value: s.id,
      label: s.fullName,
      hint: [s.classLevel, s.phone].filter(Boolean).join(" · "),
    })),
  });
}
