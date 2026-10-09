import "server-only";

import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { buildStudentLessonDetailView, type StudentLessonDetailView } from "@/lib/panel/student-lesson-detail";
import { prisma } from "@/lib/prisma";

/**
 * Öğrenci ders detayı okuma modeli — `app/panel/ogrenci/takvim/[id]` sayfası
 * ve `GET /api/panel/student/lessons/[id]` AYNI fonksiyonu kullanır.
 *
 * Erişim politikası web sayfasının mevcut davranışıdır (genişletilmedi):
 * öğrenci, KAYDI OLDUĞU (aktif veya sonlanmış) grupların derslerini görür;
 * başka grubun dersi `null` (404). Sonlanmış kayıtta geçmiş ders özeti
 * görünür ama katılım bağlantısı verilmez.
 *
 * Gizlilik: notlar `studentId IS NULL OR studentId = profil` ile çekilir —
 * başka öğrencinin özel notu hiçbir koşulda sorgulanmaz.
 */
export async function loadStudentLessonDetail(input: { studentUserId: string; lessonId: string; now?: Date }): Promise<StudentLessonDetailView | null> {
  const profile = await prisma.studentProfile.findUnique({ where: { userId: input.studentUserId }, select: { id: true } });
  if (!profile) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id },
    select: { groupId: true, endedAt: true },
  });
  const groupIds = enrollments.map((row) => row.groupId);
  if (!groupIds.length) return null;

  const lesson = await prisma.lesson.findFirst({
    where: { id: input.lessonId, groupId: { in: groupIds } },
    include: {
      group: { select: { name: true, subject: true, isActive: true } },
      teacher: { select: { fullName: true } },
      notes: { where: { OR: [{ studentId: null }, { studentId: profile.id }] } },
      attendances: { where: { studentId: profile.id }, select: { status: true } },
    },
  });
  if (!lesson) return null;

  const shared = lesson.notes.find((note) => note.studentId === null) ?? null;
  const personal = lesson.notes.find((note) => note.studentId === profile.id) ?? null;
  const flags = getPanelFeatureFlags();

  const [assignments, recovery] = await Promise.all([
    prisma.assignment.findMany({
      where: { groupId: lesson.groupId, isActive: true },
      orderBy: { dueAt: "desc" },
      take: 3,
      include: { progress: { where: { studentId: profile.id }, select: { status: true } } },
    }),
    flags.recoveryPackage
      ? prisma.recoveryPackage.findFirst({
          where: { lessonId: lesson.id, studentId: profile.id, status: { in: ["PUBLISHED", "COMPLETED"] } },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);

  return buildStudentLessonDetailView(
    {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        startsAt: lesson.startsAt,
        endsAt: lesson.endsAt,
        status: lesson.status,
        meetingUrl: lesson.meetingUrl,
        groupId: lesson.groupId,
        group: lesson.group,
        teacher: lesson.teacher,
      },
      sharedNote: shared ? { topic: shared.topic, homework: shared.homework, nextGoal: shared.nextGoal } : null,
      personalNote: personal?.note ?? null,
      attendance: lesson.attendances[0]?.status ?? null,
      assignments: assignments.map((row) => ({ id: row.id, title: row.title, dueAt: row.dueAt, done: row.progress[0]?.status === "DONE" })),
      enrollmentActive: enrollments.some((row) => row.groupId === lesson.groupId && row.endedAt === null),
      recoveryStatus: recovery?.status === "PUBLISHED" || recovery?.status === "COMPLETED" ? recovery.status : null,
    },
    input.now ?? new Date(),
  );
}
