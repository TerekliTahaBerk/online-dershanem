import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * ÖĞRETMEN DERS ÇALIŞMA ALANI yükleyicisi — web `app/panel/ogretmen/ders/[id]`
 * ve mobil `GET /api/panel/staff/teacher/lessons/[id]` AYNI sorguları kullanır.
 *
 * YATAY ERİŞİM: ders `teacherId` ile birlikte sorgulanır; başka öğretmenin
 * dersi veya tahmin edilen kimlik null döner (çağıran 404 verir). Öğrenci
 * listesi grubun AKTİF kayıtlarıdır (kapanış ucu da aynı kümeyi doğrular).
 */
export async function loadTeacherLessonWorkspaceData(teacherId: string, id: string, learningOutcomes: boolean) {
  const lesson = await prisma.lesson.findFirst({
    where: { id, teacherId: teacherId },
    include: {
      group: {
        include: {
          enrollments: {
            where: { endedAt: null },
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      fullName: true,
                      email: true,
                      accessibilityPreference: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      notes: true,
      attendances: true,
      outcomeLinks: true,
    },
  });
  if (!lesson) return null;

  const [previous, noteTemplates, outcomes] = await Promise.all([
    prisma.lesson.findFirst({
      where: {
        groupId: lesson.groupId,
        startsAt: { lt: lesson.startsAt },
        status: "COMPLETED",
      },
      orderBy: { startsAt: "desc" },
      include: { notes: { where: { studentId: null }, take: 1 } },
    }),
    prisma.teacherNoteTemplate.findMany({
      where: { teacherId: teacherId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        note: true,
        nextGoal: true,
        homework: true,
      },
    }),
    learningOutcomes
      ? prisma.learningOutcome.findMany({
          where: {
            isActive: true,
            unit: { subject: { version: { status: "ACTIVE" } } },
          },
          orderBy: [
            { favorites: { _count: "desc" } },
            { lessons: { _count: "desc" } },
            { updatedAt: "desc" },
            { code: "asc" },
          ],
          take: 15,
          include: {
            unit: { include: { subject: true } },
            skills: { include: { skill: { select: { name: true } } } },
            favorites: {
              where: { userId: teacherId },
              select: { userId: true },
            },
            lessons: {
              where: { linkedById: teacherId },
              take: 1,
              select: { lessonId: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return { lesson, previous, noteTemplates, outcomes };
}

export type TeacherLessonRange = "yaklasan" | "gecmis";

/**
 * Öğretmenin KENDİ dersleri (`teacherId`). Yaklaşan: bugünden itibaren 14 gün;
 * geçmiş: son 30 gün. Not içeriği seçilmez; yalnız ortak not var mı bilgisi.
 */
export async function loadTeacherLessons(teacherId: string, range: TeacherLessonRange, now = new Date()) {
  const dayMs = 86_400_000;
  const where = range === "yaklasan"
    ? { teacherId, endsAt: { gte: now }, startsAt: { lt: new Date(now.getTime() + 14 * dayMs) } }
    : { teacherId, endsAt: { lt: now }, startsAt: { gte: new Date(now.getTime() - 30 * dayMs) } };
  return prisma.lesson.findMany({
    where,
    orderBy: { startsAt: range === "yaklasan" ? "asc" : "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      group: { select: { name: true, subject: true, enrollments: { where: { endedAt: null }, select: { id: true } } } },
      attendances: { select: { id: true } },
      notes: { where: { studentId: null }, take: 1, select: { id: true } },
    },
  });
}
