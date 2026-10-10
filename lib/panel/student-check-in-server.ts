import "server-only";

import { prisma } from "@/lib/prisma";
import { STUDENT_CHECK_IN_WEEKLY_LIMIT, studentCheckInWeekEnd, studentCheckInWeekStart } from "@/lib/student-check-in";

/**
 * Öğrenci check-in'i (OD + Yön ORTAK) — okuma tarafı TEK yerde.
 * `app/panel/ogrenci/check-in/page.tsx` ve `GET /api/panel/student/check-in`
 * aynı fonksiyonu çağırır.
 *
 * Destek alanı kuralı mevcut sunucu politikasıdır ve DEĞİŞTİRİLMEDİ:
 * aktif OD grubu olan öğrenci gruplarından birini seçer; aktif grubu
 * olmayan öğrenci aktif koç atamasıyla (Yön) check-in yapar
 * (`POST /api/panel/student-check-ins` aynı kuralı doğrular).
 */
export async function loadStudentCheckIn(input: { userId: string; now?: Date }) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    include: {
      enrollments: {
        where: { endedAt: null, group: { isActive: true } },
        include: { group: { select: { id: true, name: true, subject: true } } },
      },
      coachAssignments: { where: { endedAt: null }, select: { id: true } },
      checkIns: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          group: { select: { name: true } },
          helpRequest: {
            include: {
              responses: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { action: true },
              },
            },
          },
        },
      },
    },
  });
  if (!profile) return null;

  const now = input.now ?? new Date();
  const weeklyCount = await prisma.studentCheckIn.count({
    where: {
      studentId: profile.id,
      createdAt: { gte: studentCheckInWeekStart(now), lt: studentCheckInWeekEnd(now) },
    },
  });

  const targets = profile.enrollments.length
    ? profile.enrollments.map((item) => ({ kind: "GROUP" as const, groupId: item.group.id, name: item.group.name, subject: item.group.subject }))
    : profile.coachAssignments.map((item) => ({ kind: "COACH" as const, coachAssignmentId: item.id, name: "Yön Koçluk" }));

  const history = profile.checkIns.map((item) => ({
    id: item.id,
    groupName: item.group?.name ?? "Yön Koçluk",
    energy: item.energy,
    confidence: item.confidence,
    barrier: item.barrier,
    shared: item.shareWithTeacher,
    createdAt: item.createdAt,
    request: item.helpRequest
      ? {
          id: item.helpRequest.id,
          status: item.helpRequest.status,
          version: item.helpRequest.version,
          helpful: item.helpRequest.helpful,
          action: item.helpRequest.responses[0]?.action || null,
        }
      : null,
  }));

  return {
    profileId: profile.id,
    targets,
    history,
    weeklyCount,
    remaining: Math.max(0, STUDENT_CHECK_IN_WEEKLY_LIMIT - weeklyCount),
  };
}

export type StudentCheckInData = NonNullable<Awaited<ReturnType<typeof loadStudentCheckIn>>>;
