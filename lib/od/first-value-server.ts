import "server-only";

import { prisma } from "@/lib/prisma";
import { firstValueChecklist, type FirstValueStep } from "@/lib/od/first-value";

/**
 * İLK DEĞER KONTROL LİSTESİ — veri tarafı.
 *
 * Her adım ASIL kayıttan okunur (parola bayrağı, veli bağı, tercih satırı,
 * kayıt, planlanmış ders). Ayrı bir ilerleme tablosu yoktur; olsaydı veli bağı
 * silindiğinde kutucuk işaretli kalır ve liste yalan söylerdi.
 */

export async function getStudentFirstValue(userId: string): Promise<FirstValueStep[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      mustChangePassword: true,
      studentProfile: {
        select: {
          parents: { select: { confirmedAt: true } },
          planPreference: { select: { availableDays: true } },
          enrollments: {
            where: { endedAt: null },
            select: { group: { select: { lessons: { where: { status: "PLANNED" }, select: { id: true }, take: 1 } } } },
          },
        },
      },
    },
  });
  if (!user?.studentProfile) return [];

  const profile = user.studentProfile;
  const days = profile.planPreference?.availableDays;
  return firstValueChecklist({
    audience: "STUDENT",
    accountClaimed: !user.mustChangePassword,
    relationship: profile.parents.length
      ? profile.parents.some((link) => link.confirmedAt) ? "CONFIRMED" : "UNCONFIRMED"
      : null,
    baselinePreferencesSet: Array.isArray(days) && days.length > 0,
    groupAssigned: profile.enrollments.length > 0,
    firstLessonScheduled: profile.enrollments.some((enrollment) => enrollment.group.lessons.length > 0),
  });
}

/**
 * Velinin listesi SEÇİLİ ÇOCUĞA göredir. İki çocuklu bir velide tek bir
 * birleşik liste, hangi çocuğun grubunun atandığını belirsiz bırakırdı.
 */
export async function getParentFirstValue(
  parentUserId: string,
  studentProfileId: string | null,
): Promise<FirstValueStep[]> {
  const [user, link] = await Promise.all([
    prisma.user.findUnique({ where: { id: parentUserId }, select: { mustChangePassword: true, notificationPrefs: { select: { userId: true } } } }),
    studentProfileId
      ? prisma.parentStudent.findUnique({
          where: { parentId_studentId: { parentId: parentUserId, studentId: studentProfileId } },
          select: {
            confirmedAt: true,
            student: {
              select: {
                enrollments: {
                  where: { endedAt: null },
                  select: { group: { select: { lessons: { where: { status: "PLANNED" }, select: { id: true }, take: 1 } } } },
                },
              },
            },
          },
        })
      : null,
  ]);
  if (!user) return [];

  return firstValueChecklist({
    audience: "PARENT",
    accountClaimed: !user.mustChangePassword,
    relationship: link ? (link.confirmedAt ? "CONFIRMED" : "UNCONFIRMED") : null,
    baselinePreferencesSet: Boolean(user.notificationPrefs),
    groupAssigned: Boolean(link?.student.enrollments.length),
    firstLessonScheduled: Boolean(link?.student.enrollments.some((enrollment) => enrollment.group.lessons.length > 0)),
  });
}
