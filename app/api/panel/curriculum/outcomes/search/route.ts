import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";

const querySchema = z.object({
  lessonId: z.string().trim().min(1).max(191).optional(),
  groupId: z.string().trim().min(1).max(191).optional(),
  subject: z.string().trim().max(100).optional(),
  level: z.string().trim().max(40).optional(),
  query: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

function normalizeQuery(value: string | null) {
  return value?.trim().toLocaleLowerCase("tr-TR") || "";
}

export async function GET(request: Request) {
  // Sayfa guard'ı (`requireRole`) bir API route'unda YANLIŞ: oturum yoksa
  // `redirect(LOGIN_PATH)` atıyordu ve çağıran `fetch` JSON yerine 200 + giriş
  // HTML'i alıyordu. `requireApiOdRole` aynı rol + OD ürün kapısını uygular,
  // ama JSON 401/403 döner.
  const auth = await requireApiOdRole("TEACHER");
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz arama filtreleri." }, { status: 400 });
  const { lessonId, groupId, subject, level, limit } = parsed.data;
  const query = normalizeQuery(parsed.data.query ?? null);

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
