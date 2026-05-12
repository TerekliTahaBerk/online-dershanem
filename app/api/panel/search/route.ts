import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requirePanelSession();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const limit = 6;
  const results: { type: string; id: string; label: string; href: string; meta?: string }[] = [];

  // Admins (and admin viewing as another role) can search everything
  const canSearchAll = ctx.actualRole === "ADMIN";

  if (canSearchAll) {
    const [students, teachers, classrooms] = await Promise.all([
      prisma.student.findMany({
        where: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] },
        take: limit,
        select: { id: true, fullName: true, classLevel: true, phone: true },
      }),
      prisma.teacher.findMany({
        where: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
        take: limit,
        select: { id: true, fullName: true, subjects: true },
      }),
      prisma.classroom.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: limit,
        select: { id: true, name: true, branch: true },
      }),
    ]);
    for (const s of students) results.push({ type: "Öğrenci", id: s.id, label: s.fullName, href: `/panel/admin/ogrenciler/${s.id}`, meta: `${s.classLevel ?? ""} · ${s.phone}`.trim() });
    for (const t of teachers) results.push({ type: "Öğretmen", id: t.id, label: t.fullName, href: `/panel/admin/ogretmenler`, meta: t.subjects });
    for (const c of classrooms) results.push({ type: "Sınıf", id: c.id, label: c.name, href: `/panel/admin/siniflar`, meta: c.branch ?? undefined });
  }

  return NextResponse.json({ results });
}
