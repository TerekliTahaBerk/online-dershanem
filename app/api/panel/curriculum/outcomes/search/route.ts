import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

function normalizeQuery(value: string | null) {
  return value?.trim().toLocaleLowerCase("tr-TR") || "";
}

export async function GET(request: Request) {
  const session = await requireRole("TEACHER");
  const url = new URL(request.url);
  const lessonId = url.searchParams.get("lessonId");
  const groupId = url.searchParams.get("groupId");
  const subject = url.searchParams.get("subject");
  const level = url.searchParams.get("level");
  const query = normalizeQuery(url.searchParams.get("query"));
  const limit = Math.min(Number(url.searchParams.get("limit") || 10) || 10, 20);

  const lesson = lessonId
    ? await prisma.lesson.findFirst({
        where: { id: lessonId, teacherId: session.userId },
        select: { id: true, groupId: true, group: { select: { subject: true, level: true } } },
      })
    : null;
  if (groupId) {
    const group = await prisma.group.findFirst({ where: { id: groupId, teacherId: session.userId }, select: { subject: true, level: true } });
    if (!group && !lesson) return NextResponse.json({ outcomes: [] });
  }
  const effectiveSubject = subject || lesson?.group.subject || null;
  const effectiveLevel = level || lesson?.group.level || null;

  const outcomes = await prisma.learningOutcome.findMany({
    where: {
      isActive: true,
      unit: {
        subject: {
          version: { status: "ACTIVE", ...(effectiveLevel ? { level: effectiveLevel } : {}) },
          ...(effectiveSubject ? { name: effectiveSubject } : {}),
        },
      },
      OR: query
        ? [
            { code: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { unit: { name: { contains: query, mode: "insensitive" } } },
            { unit: { subject: { name: { contains: query, mode: "insensitive" } } } },
            { skills: { some: { skill: { name: { contains: query, mode: "insensitive" } } } } },
          ]
        : undefined,
    },
    orderBy: [{ favorites: { _count: "desc" } }, { lessons: { _count: "desc" } }, { updatedAt: "desc" }, { code: "asc" }],
    take: limit,
    include: {
      unit: { include: { subject: true } },
      skills: { include: { skill: { select: { name: true } } } },
      favorites: { where: { userId: session.userId }, select: { userId: true } },
      lessons: { where: { linkedById: session.userId }, take: 1, select: { lessonId: true } },
    },
  });

  return NextResponse.json({
    outcomes: outcomes.map((outcome) => ({
      id: outcome.id,
      code: outcome.code,
      title: outcome.title,
      subject: outcome.unit.subject.name,
      unit: outcome.unit.name,
      skills: outcome.skills.map((item) => item.skill.name),
      favorite: outcome.favorites.length > 0,
      recent: outcome.lessons.length > 0,
    })),
  });
}
