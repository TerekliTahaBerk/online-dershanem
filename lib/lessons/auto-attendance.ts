/**
 * Sprint 6 — Auto-attendance helper.
 *
 * Bir ders için `LessonJoinEvent` satırlarını okur ve `Attendance` kayıtlarına
 * dönüştürür. KURAL:
 *  - `Attendance.source==="MANUAL"` olan kayıtlar HİÇBİR ZAMAN üzerine yazılmaz
 *    (öğretmen önceliği).
 *  - AUTO kayıtlar idempotent yazılır (aynı ders+öğrenci için tek satır).
 *  - LATE eşiği = scheduledAt + 10 dk; sonra katılan LATE sayılır.
 *
 * Şimdilik dersi bitiren akış (`endLessonAction`, `lesson-lifecycle-tick`)
 * çağırır. Çağıran tarafın bu modülün hatasını yutması beklenir (audit/log).
 */
import "server-only";
import type { PrismaClient } from "@prisma/client";

export type ComputeAutoAttendanceInput = {
  lessonId: string;
  /** İsteğe bağlı override; verilmezse Lesson'dan okunur. */
  scheduledAt?: Date;
  /** Late eşiği. Default 10 dk. */
  lateThresholdMs?: number;
};

export type ComputeAutoAttendanceResult = {
  lessonId: string;
  created: number;
  skippedManual: number;
  total: number;
};

const DEFAULT_LATE_THRESHOLD_MS = 10 * 60_000;

export async function computeAutoAttendanceForLesson(
  prisma: PrismaClient,
  input: ComputeAutoAttendanceInput,
): Promise<ComputeAutoAttendanceResult> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: input.lessonId },
    select: { id: true, studentId: true, scheduledAt: true },
  });
  if (!lesson) {
    return { lessonId: input.lessonId, created: 0, skippedManual: 0, total: 0 };
  }
  const scheduledAt = input.scheduledAt ?? lesson.scheduledAt;
  const lateAfter = scheduledAt.getTime() + (input.lateThresholdMs ?? DEFAULT_LATE_THRESHOLD_MS);

  // Bu ders satırına ait JOIN event'leri (sadece öğrencinin user'ı için olanlar).
  // Lesson.studentId mevcut olduğu için 1-1 öğrenci-ders eşlemesi var.
  const events = await prisma.lessonJoinEvent.findMany({
    where: { lessonId: lesson.id },
    select: { kind: true, ts: true, studentId: true, userId: true },
    orderBy: { ts: "asc" },
  });

  // Öğrenciye ait olan join'leri filtrele.
  const studentJoins = events.filter(
    (e) => e.kind === "JOIN" && (e.studentId === lesson.studentId || e.studentId === null),
  );
  const studentLeaves = events.filter(
    (e) => e.kind === "LEAVE" && (e.studentId === lesson.studentId || e.studentId === null),
  );

  if (studentJoins.length === 0) {
    return { lessonId: lesson.id, created: 0, skippedManual: 0, total: 0 };
  }

  // Manual var mı?
  const existing = await prisma.attendance.findFirst({
    where: { lessonId: lesson.id, studentId: lesson.studentId, context: "LESSON" },
    select: { id: true, source: true },
  });
  if (existing && existing.source === "MANUAL") {
    return { lessonId: lesson.id, created: 0, skippedManual: 1, total: 1 };
  }

  const firstJoin = studentJoins[0].ts;
  const lastLeave = studentLeaves[studentLeaves.length - 1]?.ts ?? studentJoins[studentJoins.length - 1].ts;
  const durationSec = Math.max(0, Math.floor((lastLeave.getTime() - firstJoin.getTime()) / 1000));
  const status = firstJoin.getTime() > lateAfter ? "LATE" : "PRESENT";

  if (existing) {
    // AUTO satırı varsa güncelle (yeni event'lerle süre uzayabilir).
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        status,
        firstJoinedAt: firstJoin,
        durationSec,
        source: "AUTO",
      },
    });
    return { lessonId: lesson.id, created: 0, skippedManual: 0, total: 1 };
  }

  await prisma.attendance.create({
    data: {
      studentId: lesson.studentId,
      lessonId: lesson.id,
      context: "LESSON",
      sessionDate: scheduledAt,
      status,
      source: "AUTO",
      firstJoinedAt: firstJoin,
      durationSec,
    },
  });
  return { lessonId: lesson.id, created: 1, skippedManual: 0, total: 1 };
}
