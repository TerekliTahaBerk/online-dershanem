import "server-only";

import { prisma } from "@/lib/prisma";
import type { ParentChild } from "@/lib/panel/parent-product-policy";

/**
 * VELİ · DERSLER yükleyicisi — web `app/panel/veli/takvim` ve mobil
 * `GET /api/panel/parent/lessons` AYNI fonksiyonu kullanır.
 *
 * GİZLİLİK (sorgu sınırında): yalnız ORTAK ders notunun KONUSU seçilir
 * (`studentId: null`). Öğretmenin öğrenciye özel notu, notun kendisi, ödev /
 * hedef alanları ve ders bağlantısı (Meet) sorguya HİÇ girmez.
 */
export type ParentAttendanceKey = "PLANNED" | "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | "CANCELLED" | "NOT_RECORDED";
export type ParentAttendanceTone = "neutral" | "info" | "success" | "warning" | "critical";

export const PARENT_ATTENDANCE_LABELS: Record<ParentAttendanceKey, string> = {
  PLANNED: "Planlandı",
  PRESENT: "Katıldı",
  LATE: "Geç katıldı",
  ABSENT: "Katılmadı",
  EXCUSED: "Mazeretli",
  CANCELLED: "İptal edildi",
  NOT_RECORDED: "Henüz işlenmedi",
};

export type ParentLessonRow = {
  id: string;
  startsAt: Date;
  title: string;
  topic: string | null;
  teacherName: string | null;
  attendance: { key: ParentAttendanceKey; label: string; tone: ParentAttendanceTone };
};

export type ParentLessons = { available: boolean; lessons: ParentLessonRow[]; lastSummary: string | null };

/** Web tablosuyla aynı öncelik: iptal → kayıtlı yoklama → gelecek / işlenmemiş. */
export function parentAttendance(input: { lessonStatus: string; attendance: string | null; startsAt: Date; now: Date }): ParentLessonRow["attendance"] {
  const key: ParentAttendanceKey =
    input.lessonStatus === "CANCELLED"
      ? "CANCELLED"
      : input.attendance === "ABSENT"
        ? "ABSENT"
        : input.attendance === "LATE"
          ? "LATE"
          : input.attendance === "PRESENT"
            ? "PRESENT"
            : input.attendance === "EXCUSED"
              ? "EXCUSED"
              : input.startsAt.getTime() > input.now.getTime()
                ? "PLANNED"
                : "NOT_RECORDED";
  const tone: ParentAttendanceTone = key === "ABSENT" ? "warning" : key === "PRESENT" || key === "EXCUSED" ? "success" : "neutral";
  return { key, label: PARENT_ATTENDANCE_LABELS[key], tone };
}

export async function loadParentLessons(child: ParentChild, now = new Date()): Promise<ParentLessons> {
  if (!child.products.includes("OD")) return { available: false, lessons: [], lastSummary: null };
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: child.id, endedAt: null }, select: { groupId: true } });
  const groupIds = enrollments.map((row) => row.groupId);
  if (!groupIds.length) return { available: true, lessons: [], lastSummary: null };
  const rows = await prisma.lesson.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { startsAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      startsAt: true,
      status: true,
      teacher: { select: { fullName: true } },
      // Yalnız ortak not — öğrenciye özel not okunmaz; yalnız konu alanı.
      notes: { where: { studentId: null }, take: 1, select: { topic: true } },
      attendances: { where: { studentId: child.id }, select: { status: true } },
    },
  });
  const lessons = rows.map((lesson) => ({
    id: lesson.id,
    startsAt: lesson.startsAt,
    title: lesson.title,
    topic: lesson.notes[0]?.topic?.trim() || null,
    teacherName: lesson.teacher.fullName?.trim() || null,
    attendance: parentAttendance({ lessonStatus: lesson.status, attendance: lesson.attendances[0]?.status ?? null, startsAt: lesson.startsAt, now }),
  }));
  return { available: true, lessons, lastSummary: lessons.find((lesson) => lesson.topic)?.topic ?? null };
}
