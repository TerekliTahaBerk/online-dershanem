"use server";

/**
 * Devamsızlık (Attendance) server actions.
 *
 * `bulkMarkAttendanceAction` is the action behind <AttendanceQuickTake>. It
 * accepts a sessionGroupId (or single lessonId) and per-student status fields
 * from FormData and upserts Attendance rows. MANUAL source always wins over
 * the cron-driven AUTO source (per existing conventions in `lib/od/auto-attendance`).
 */

import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isWritableAttendanceStatus, WRITABLE_ATTENDANCE_STATUSES } from "@/lib/attendance";
import type { AttendanceStatus } from "@prisma/client";

const VALID_STATUSES: AttendanceStatus[] = WRITABLE_ATTENDANCE_STATUSES;

function parseStatus(raw: unknown): AttendanceStatus | null {
  return isWritableAttendanceStatus(raw) ? raw : null;
}

function parseMinutes(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n < 600 ? n : null;
}

function parseNote(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t ? t.slice(0, 500) : null;
}

/**
 * Bulk mark attendance for one lesson session.
 * - If the lesson has a sessionGroupId, all peers are considered the roster.
 * - Otherwise only this lesson's student is considered.
 *
 * FormData keys per student:
 *   status_<studentId>      = PRESENT | ABSENT | LATE | EXCUSED  (skipped if missing/invalid)
 *   minutesLate_<studentId> = number (only honored when status=LATE)
 *   note_<studentId>        = freeform note
 */
export async function bulkMarkAttendanceAction(lessonId: string, fd: FormData) {
  const session = await requirePanelRole("admin");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      scheduledAt: true,
      classroomId: true,
      sessionGroupId: true,
      studentId: true,
    },
  });
  if (!lesson) throw new Error("Ders bulunamadı.");

  // Roster: peers in sessionGroup, or just this student.
  const peers = lesson.sessionGroupId
    ? await prisma.lesson.findMany({
        where: { sessionGroupId: lesson.sessionGroupId },
        select: { id: true, studentId: true },
      })
    : [{ id: lesson.id, studentId: lesson.studentId }];

  let updated = 0;
  let created = 0;
  const tally: Record<AttendanceStatus, number> = {
    PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, LEFT_EARLY: 0,
  };

  await prisma.$transaction(async (tx) => {
    for (const peer of peers) {
      const status = parseStatus(fd.get(`status_${peer.studentId}`));
      if (!status) continue; // not marked → skip
      const minutesLate = status === "LATE" ? parseMinutes(fd.get(`minutesLate_${peer.studentId}`)) : null;
      const note = parseNote(fd.get(`note_${peer.studentId}`));

      // Find existing attendance for this lesson+student (either MANUAL or AUTO).
      const existing = await tx.attendance.findFirst({
        where: { lessonId: peer.id, studentId: peer.studentId },
        select: { id: true },
      });

      if (existing) {
        await tx.attendance.update({
          where: { id: existing.id },
          data: {
            status,
            minutesLate,
            notes: note,
            source: "MANUAL",
            recordedById: session.userId,
            sessionDate: lesson.scheduledAt,
            classroomId: lesson.classroomId,
          },
        });
        updated++;
      } else {
        await tx.attendance.create({
          data: {
            studentId: peer.studentId,
            context: "LESSON",
            lessonId: peer.id,
            classroomId: lesson.classroomId,
            sessionDate: lesson.scheduledAt,
            status,
            minutesLate,
            notes: note,
            source: "MANUAL",
            recordedById: session.userId,
          },
        });
        created++;
      }
      tally[status]++;
    }
  });

  await logAudit({
    actorUserId: session.userId,
    entityType: "Lesson",
    entityId: lessonId,
    action: "ATTENDANCE_BULK_MARK",
    summary: `Yoklama: ${created} yeni, ${updated} güncellendi`,
    payload: { tally, sessionGroupId: lesson.sessionGroupId, peers: peers.length },
  });

  revalidatePath(`/panel/admin/ders-programi/${lessonId}`);
  revalidatePath("/panel/admin/devamsizlik");

  return { ok: true as const, created, updated, tally };
}
