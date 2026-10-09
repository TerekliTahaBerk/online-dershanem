/**
 * Öğrenci ders detayı — SAF sunum kuralları (web sayfası ve mobil JSON aynı
 * fonksiyonu kullanır; sorgular `student-lesson-detail-server.ts`'te).
 */

import { lessonJoinState, type LessonJoinState } from "@/lib/panel/lesson-join";

export type AttendanceStatusValue = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type AttendanceTone = "neutral" | "success" | "warning";

/** Web ders detayındaki etiket ve ton tablosu (davranış değişmedi). */
export function attendancePresentation(status: AttendanceStatusValue | null | undefined): { label: string; tone: AttendanceTone } {
  const label =
    status === "PRESENT"
      ? "Katıldın"
      : status === "LATE"
        ? "Geç katıldın"
        : status === "ABSENT"
          ? "Katılmadın"
          : status === "EXCUSED"
            ? "Mazeretli"
            : "Katılım işlenmedi";
  const tone: AttendanceTone = status === "ABSENT" ? "warning" : status === "PRESENT" || status === "LATE" ? "success" : "neutral";
  return { label, tone };
}

export type StudentLessonDetailRow = {
  lesson: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    status: "PLANNED" | "COMPLETED" | "CANCELLED";
    meetingUrl: string | null;
    groupId: string;
    group: { name: string; subject: string; isActive: boolean };
    teacher: { fullName: string | null };
  };
  /** Grubun ortak notu (`studentId: null`). */
  sharedNote: { topic: string | null; homework: string | null; nextGoal: string | null } | null;
  /** YALNIZ bu öğrenciye yazılmış not (`studentId = profile.id`). */
  personalNote: string | null;
  attendance: AttendanceStatusValue | null;
  assignments: Array<{ id: string; title: string; dueAt: Date; done: boolean }>;
  enrollmentActive: boolean;
  recoveryStatus: "PUBLISHED" | "COMPLETED" | null;
};

export type StudentLessonDetailView = StudentLessonDetailRow & {
  attendanceView: { label: string; tone: AttendanceTone };
  join: { state: LessonJoinState; url: string | null; opensAt: Date | null };
};

export function buildStudentLessonDetailView(row: StudentLessonDetailRow, now: Date): StudentLessonDetailView {
  return {
    ...row,
    attendanceView: attendancePresentation(row.attendance),
    join: lessonJoinState({
      status: row.lesson.status,
      startsAt: row.lesson.startsAt,
      meetingUrl: row.lesson.meetingUrl,
      // Pasif grupta (arşiv) bağlantı paylaşılmaz — takvim dışa aktarımıyla aynı.
      enrollmentActive: row.enrollmentActive && row.lesson.group.isActive,
      now,
    }),
  };
}
