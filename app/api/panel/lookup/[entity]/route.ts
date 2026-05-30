/**
 * Generic entity lookup endpoint for the EntitySearchCombobox.
 *
 *   GET /api/panel/lookup/students?q=ali
 *   GET /api/panel/lookup/parents?q=055
 *   GET /api/panel/lookup/teachers?q=mat
 *   GET /api/panel/lookup/classrooms?q=12
 *
 * Permission policy:
 * - ADMIN: sees everything.
 * - TEACHER: only entities in their own classrooms (students & classrooms).
 * - STUDENT/PARENT: not allowed (returns 403).
 *
 * Each row is shaped uniformly so the UI can render it without per-entity
 * branches:
 *   { id, label, sub?, badge?, meta? }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-access";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Entity = "students" | "parents" | "teachers" | "classrooms";

type LookupRow = {
  id: string;
  label: string;
  sub?: string | null;
  badge?: string | null;
  meta?: string | null;
};

const ALLOWED: Entity[] = ["students", "parents", "teachers", "classrooms"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const ctx = await requirePanelSession();
  const { entity } = await params;
  if (!ALLOWED.includes(entity as Entity)) {
    return NextResponse.json({ error: "unknown_entity" }, { status: 400 });
  }
  // Only ADMIN/TEACHER can lookup
  if (ctx.actualRole !== "ADMIN" && ctx.actualRole !== "TEACHER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  // Allow empty q for the initial popover open ("recent / first 10").
  const take = 10;
  const ci = "insensitive" as const;

  let rows: LookupRow[] = [];

  if (entity === "students") {
    const where: Prisma.StudentWhereInput = q
      ? {
          OR: [
            { fullName: { contains: q, mode: ci } },
            { email: { contains: q, mode: ci } },
            { phone: { contains: q } },
          ],
        }
      : {};
    if (ctx.actualRole === "TEACHER") {
      // Limit to students in any of the teacher's classrooms.
      const teacher = await prisma.teacher.findUnique({
        where: { userId: ctx.userId },
        select: {
          classrooms: { select: { classroomId: true } },
        },
      });
      const classroomIds = teacher?.classrooms.map((c) => c.classroomId) ?? [];
      where.classrooms = { some: { classroomId: { in: classroomIds } } };
    }
    const list = await prisma.student.findMany({
      where,
      orderBy: q ? { fullName: "asc" } : { updatedAt: "desc" },
      take,
      select: {
        id: true, fullName: true, classLevel: true, status: true,
        phone: true, email: true,
      },
    });
    rows = list.map((s) => ({
      id: s.id,
      label: s.fullName,
      sub: [s.classLevel, s.email ?? s.phone].filter(Boolean).join(" · ") || null,
      badge: s.classLevel ?? null,
      meta: s.status,
    }));
  }

  else if (entity === "parents") {
    if (ctx.actualRole !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const where: Prisma.ParentWhereInput = q
      ? {
          OR: [
            { fullName: { contains: q, mode: ci } },
            { email: { contains: q, mode: ci } },
            { phone: { contains: q } },
            { phoneKey: { contains: q.replace(/\D/g, "") } },
          ],
        }
      : {};
    const list = await prisma.parent.findMany({
      where,
      orderBy: q ? { fullName: "asc" } : { updatedAt: "desc" },
      take,
      select: {
        id: true, fullName: true, email: true, phone: true,
        _count: { select: { students: true } },
      },
    });
    rows = list.map((p) => ({
      id: p.id,
      label: p.fullName,
      sub: [p.email, p.phone].filter(Boolean).join(" · ") || null,
      badge: p._count.students > 0 ? `${p._count.students} çocuk` : null,
    }));
  }

  else if (entity === "teachers") {
    if (ctx.actualRole !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const where: Prisma.TeacherWhereInput = q
      ? {
          OR: [
            { fullName: { contains: q, mode: ci } },
            { email: { contains: q, mode: ci } },
          ],
        }
      : {};
    const list = await prisma.teacher.findMany({
      where, orderBy: { fullName: "asc" }, take,
      select: { id: true, fullName: true, email: true, subjects: true },
    });
    rows = list.map((t) => ({
      id: t.id,
      label: t.fullName,
      sub: t.subjects ?? t.email ?? null,
    }));
  }

  else if (entity === "classrooms") {
    const where: Prisma.ClassroomWhereInput = q
      ? { name: { contains: q, mode: ci } }
      : {};
    if (ctx.actualRole === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: ctx.userId },
        select: { classrooms: { select: { classroomId: true } } },
      });
      where.id = { in: teacher?.classrooms.map((c) => c.classroomId) ?? [] };
    }
    const list = await prisma.classroom.findMany({
      where, orderBy: { name: "asc" }, take,
      select: { id: true, name: true, branch: true, level: true,
                _count: { select: { students: true } } },
    });
    rows = list.map((c) => ({
      id: c.id,
      label: c.name,
      sub: c.branch ?? null,
      badge: c.level,
      meta: `${c._count.students} öğr.`,
    }));
  }

  return NextResponse.json({ rows });
}
