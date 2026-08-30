import "server-only";
import { prisma } from "@/lib/prisma";
import type { InterventionReasonCode } from "@/lib/intervention-rules";

const reasonLabels: Record<InterventionReasonCode, string> = {
  ATTENDANCE_PATTERN: "katılım örüntüsü",
  OVERDUE_WORK: "teslimi geçen çalışma",
  REPEATED_REVIEW_DIFFICULTY: "tekrarlayan çözüm güçlüğü",
  PLAN_STALLED: "plan kapasitesi",
  RECENT_EXAM_DROP: "yakın deneme düşüşü",
  ENGAGEMENT_GAP: "etkinlik boşluğu",
  HUMAN_CONCERN: "insan destek işareti",
};

/**
 * Öğretmen ana sayfasının sınırlı attention read-model'i.
 * Ham attendance/assignment geçmişini yeniden hesaplamaz; canonical
 * Student Support Episode kayıtlarından yalnız ilk beş açık bölümü okur.
 */
export async function getTeacherStudentAttentionSnapshot(teacherId: string) {
  const now = new Date();
  const episodes = await prisma.interventionCase.findMany({
    where: {
      OR: [
        { status: { in: ["OPEN", "IN_PROGRESS"] } },
        { status: "SNOOZED", snoozedUntil: { lte: now } },
      ],
      student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId } } } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      evidenceCount: true,
      dueAt: true,
      student: {
        select: {
          user: { select: { fullName: true, email: true } },
          enrollments: { where: { endedAt: null, group: { isActive: true, teacherId } }, take: 1, select: { group: { select: { name: true } } } },
        },
      },
      signals: { orderBy: { createdAt: "asc" }, select: { reasonCode: true } },
    },
  });

  return episodes.map((episode) => {
    const labels = episode.signals.map((signal) => reasonLabels[signal.reasonCode]);
    return {
      id: episode.id,
      name: episode.student.user.fullName || episode.student.user.email,
      group: episode.student.enrollments[0]?.group.name || "Aktif grup",
      reason: `${labels.join(" + ")} · ${episode.evidenceCount} kontrollü kanıt`,
      dueAt: episode.dueAt.toISOString(),
    };
  });
}
