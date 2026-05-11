// lib/attendance.ts — Bulk attendance recording + auto inbox notifications
import "server-only";
import { prisma } from "./prisma";
import { publishInboxMessage } from "./inbox";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Geldi",
  ABSENT: "Gelmedi",
  LATE: "Geç kaldı",
  EXCUSED: "Mazeretli",
};

export interface AttendanceRow {
  studentId: string;
  status: AttendanceStatus;
  minutesLate?: number | null;
  notes?: string | null;
}

/**
 * Toplu yoklama girişi.
 * - `lessonId` verilirse her öğrenci-ders için unique constraint sayesinde upsert benzeri davranır.
 * - `classroomId` verilirse aynı gün için yeni satırlar üretir.
 * - ABSENT olan her satır için öğrenci + bağlı veliler bildirim alır.
 */
export async function recordBulkAttendance(input: {
  rows: AttendanceRow[];
  recordedById: string;
  context: "LESSON" | "CLASSROOM_SESSION";
  lessonId?: string;
  classroomId?: string;
  sessionDate: Date;
}) {
  const { rows, recordedById, context, lessonId, classroomId, sessionDate } = input;

  if (rows.length === 0) return { created: 0, notified: 0 };

  // Lesson context: var olan kayıtları sil, yeniden ekle (unique@lesson+student migration'da var)
  if (context === "LESSON" && lessonId) {
    await prisma.attendance.deleteMany({
      where: { lessonId, studentId: { in: rows.map((r) => r.studentId) } },
    });
  }

  await prisma.attendance.createMany({
    data: rows.map((r) => ({
      studentId: r.studentId,
      status: r.status,
      context,
      lessonId: lessonId ?? null,
      classroomId: classroomId ?? null,
      sessionDate,
      minutesLate: r.minutesLate ?? null,
      notes: r.notes ?? null,
      recordedById,
    })),
  });

  // ABSENT bildirimleri (öğrenci + tüm veliler)
  const absent = rows.filter((r) => r.status === "ABSENT");
  let notified = 0;
  if (absent.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: absent.map((r) => r.studentId) } },
      select: {
        id: true,
        fullName: true,
        userId: true,
        parents: { select: { parent: { select: { userId: true } } } },
      },
    });

    for (const s of students) {
      const recipients = new Set<string>();
      if (s.userId) recipients.add(s.userId);
      for (const p of s.parents) {
        if (p.parent.userId) recipients.add(p.parent.userId);
      }
      const dateStr = sessionDate.toLocaleDateString("tr-TR");
      for (const recipientId of recipients) {
        await publishInboxMessage({
          recipientUserId: recipientId,
          category: "ATTENDANCE",
          priority: "HIGH",
          title: "Devamsızlık kaydı",
          body: `${s.fullName} · ${dateStr} · ${STATUS_LABEL.ABSENT}`,
          relatedEntityType: "Attendance",
          relatedEntityId: s.id,
        });
        notified++;
      }
    }
  }

  return { created: rows.length, notified };
}

export function getAttendanceStatusLabel(status: string): string {
  return STATUS_LABEL[status as AttendanceStatus] ?? status;
}
