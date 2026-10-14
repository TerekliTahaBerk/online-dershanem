import "server-only";

import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export type EducationManagementSection =
  | "teachers"
  | "students"
  | "parents"
  | "groups"
  | "lessons"
  | "assignments"
  | "materials"
  | "outcomes";

const ALL_SECTIONS: readonly EducationManagementSection[] = [
  "teachers",
  "students",
  "parents",
  "groups",
  "lessons",
  "assignments",
  "materials",
  "outcomes",
];

const skip = <T>(): Promise<T[]> => Promise.resolve([]);

/**
 * Web ve mobil eğitim yönetiminin ortak veri yükleyicisi.
 *
 * Her ekran yalnız ihtiyaç duyduğu bölümleri ister: sekme başına tüm öğrenci,
 * veli ve kazanım kataloğunu çekmek büyük kurumlarda sayfayı saniyelerce
 * bekletiyordu. Grup doluluğu satır yerine filtreli `_count` ile, sonraki
 * planlı ders ise sınırlı ders penceresi yerine `groupBy` ile hesaplanır.
 */
export async function loadEducationManagement(
  userId: string,
  sections: readonly EducationManagementSection[] = ALL_SECTIONS,
) {
  const featureFlags = getPanelFeatureFlags();
  const want = new Set(sections);
  const now = new Date();
  const [
    teachersRaw,
    studentsRaw,
    parentsRaw,
    groupsRaw,
    nextLessons,
    lessons,
    assignments,
    materials,
    outcomes,
  ] = await Promise.all([
    want.has("teachers")
      ? prisma.user.findMany({
          where: { role: "TEACHER", status: "ACTIVE" },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, email: true },
        })
      : skip<{ id: string; fullName: string | null; email: string }>(),
    want.has("students")
      ? prisma.studentProfile.findMany({
          where: { user: { status: "ACTIVE" } },
          orderBy: { user: { fullName: "asc" } },
          select: { id: true, user: { select: { fullName: true, email: true } } },
        })
      : skip<{ id: string; user: { fullName: string | null; email: string } }>(),
    want.has("parents")
      ? prisma.user.findMany({
          where: { role: "PARENT", status: "ACTIVE" },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, email: true },
        })
      : skip<{ id: string; fullName: string | null; email: string }>(),
    want.has("groups")
      ? prisma.group.findMany({
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            subject: true,
            level: true,
            isActive: true,
            capacity: true,
            teacher: { select: { id: true, fullName: true, email: true } },
            _count: { select: { enrollments: { where: { endedAt: null } } } },
          },
        })
      : Promise.resolve([]),
    want.has("groups")
      ? prisma.lesson.groupBy({
          by: ["groupId"],
          where: { status: "PLANNED", startsAt: { gte: now } },
          _min: { startsAt: true },
        })
      : Promise.resolve([]),
    want.has("lessons")
      ? prisma.lesson.findMany({
          where: { startsAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
          orderBy: { startsAt: "asc" },
          take: 24,
          select: {
            id: true,
            title: true,
            startsAt: true,
            status: true,
            groupId: true,
            meetingUrl: true,
            group: { select: { name: true } },
            teacher: { select: { fullName: true, email: true } },
          },
        })
      : Promise.resolve([]),
    want.has("assignments")
      ? prisma.assignment.findMany({
          orderBy: { dueAt: "desc" },
          take: 40,
          select: {
            id: true,
            groupId: true,
            title: true,
            description: true,
            dueAt: true,
            isActive: true,
            group: { select: { name: true } },
            progress: { select: { status: true } },
            outcomeLinks: { select: { outcome: { select: { code: true } } } },
          },
        })
      : Promise.resolve([]),
    want.has("materials")
      ? prisma.learningMaterial.findMany({
          orderBy: { createdAt: "desc" },
          take: 60,
          select: {
            id: true,
            groupId: true,
            title: true,
            description: true,
            url: true,
            blobPathname: true,
            kind: true,
            isActive: true,
            group: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    want.has("outcomes") && featureFlags.learningOutcomes
      ? prisma.learningOutcome.findMany({
          where: {
            isActive: true,
            unit: { subject: { version: { status: "ACTIVE" } } },
          },
          orderBy: [
            { favorites: { _count: "desc" } },
            { assignments: { _count: "desc" } },
            { updatedAt: "desc" },
            { code: "asc" },
          ],
          take: 15,
          include: {
            unit: { include: { subject: true } },
            skills: { include: { skill: true } },
            favorites: { where: { userId: userId } },
            assignments: { where: { linkedById: userId }, take: 1 },
          },
        })
      : Promise.resolve([]),
  ]);

  // Geçmişte kalmış ama "PLANNED" bırakılmış dersler "sonraki ders" sayılmaz.
  const nextLessonByGroup = new Map<string, Date>();
  for (const row of nextLessons) {
    if (row._min.startsAt) nextLessonByGroup.set(row.groupId, row._min.startsAt);
  }

  return {
    featureFlags,
    teachersRaw,
    studentsRaw,
    parentsRaw,
    groupsRaw: groupsRaw.map(({ _count, ...group }) => ({
      ...group,
      activeStudentCount: _count.enrollments,
      nextLessonAt: nextLessonByGroup.get(group.id) ?? null,
    })),
    lessons,
    assignments,
    materials,
    outcomes,
  };
}
