import { prisma } from "@/lib/prisma";

/**
 * Lesson çakışma kontrolü.
 *
 * Bir derste çakışma kuralları (status != CANCELLED):
 *  - Aynı öğretmen aynı zaman aralığında başka bir derste olamaz.
 *  - Aynı sınıf aynı zaman aralığında başka bir derste kullanılamaz.
 *  - Aynı öğrenci aynı zaman aralığında başka bir derste planlı olamaz.
 *
 * Zaman aralığı [start, start+duration) yarı açık intervaldir.
 * İki ders çakışır <=> a.start < b.end AND b.start < a.end.
 *
 * Prisma'da aralık karşılaştırması zor olduğu için: aynı güne ait
 * tüm lesson'ları çekip JS tarafında zaman çakışma testi yapıyoruz.
 * (Aynı gün sayısı pratikte küçük → performans uygun.)
 *
 * NOT: `studentId` zorunlu olduğu için (sınıf dersi N satır fan-out),
 * studentId bazlı çakışmada da fan-out edilmiş tüm satırlar dikkate alınır.
 *
 * @returns Çakışan ders listesi (boş array → çakışma yok)
 */
export type ConflictReason = "TEACHER" | "CLASSROOM" | "STUDENT";

export type LessonConflict = {
  lessonId: string;
  scheduledAt: Date;
  duration: number;
  reason: ConflictReason;
  detail: string;
};

export type OccurrenceCheck = {
  scheduledAt: Date;
  duration: number;
};

export type ConflictCheckParams = {
  teacherId: string;
  classroomId?: string | null;
  studentIds: string[];
  occurrences: OccurrenceCheck[];
  /** Bu lesson id'lerini hariç tut (update sırasında kendi satırlarını dışla). */
  excludeLessonIds?: string[];
};

function overlaps(aStart: Date, aDur: number, bStart: Date, bDur: number): boolean {
  const aEnd = aStart.getTime() + aDur * 60_000;
  const bEnd = bStart.getTime() + bDur * 60_000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

export async function findLessonConflicts(p: ConflictCheckParams): Promise<LessonConflict[]> {
  if (p.occurrences.length === 0) return [];

  // Aday tarih aralığını genişlet (gün granülünde): minStart - 1gün, maxEnd + 1gün
  const sorted = [...p.occurrences].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const min = new Date(sorted[0].scheduledAt.getTime() - 86400000);
  const lastEnd = sorted[sorted.length - 1].scheduledAt.getTime() +
    sorted[sorted.length - 1].duration * 60_000;
  const max = new Date(lastEnd + 86400000);

  const exclude = p.excludeLessonIds && p.excludeLessonIds.length > 0
    ? { id: { notIn: p.excludeLessonIds } }
    : {};

  // Aday lesson'ları çek: öğretmen, sınıf veya öğrencilerden biri eşleşmeli.
  const candidates = await prisma.lesson.findMany({
    where: {
      ...exclude,
      status: { not: "CANCELLED" },
      scheduledAt: { gte: min, lte: max },
      OR: [
        { teacherId: p.teacherId },
        ...(p.classroomId ? [{ classroomId: p.classroomId }] : []),
        ...(p.studentIds.length > 0 ? [{ studentId: { in: p.studentIds } }] : []),
      ],
    },
    select: {
      id: true,
      scheduledAt: true,
      duration: true,
      teacherId: true,
      classroomId: true,
      studentId: true,
      teacher: { select: { fullName: true } },
      classroom: { select: { name: true } },
      student: { select: { fullName: true } },
    },
  });

  if (candidates.length === 0) return [];

  const conflicts: LessonConflict[] = [];
  const studentSet = new Set(p.studentIds);

  for (const occ of p.occurrences) {
    for (const c of candidates) {
      if (!overlaps(occ.scheduledAt, occ.duration, c.scheduledAt, c.duration)) continue;
      // Hangi sebeple çakışıyor?
      if (c.teacherId === p.teacherId) {
        conflicts.push({
          lessonId: c.id,
          scheduledAt: c.scheduledAt,
          duration: c.duration,
          reason: "TEACHER",
          detail: `Öğretmen ${c.teacher?.fullName ?? ""} bu saatte zaten ders veriyor.`,
        });
      }
      if (p.classroomId && c.classroomId === p.classroomId) {
        conflicts.push({
          lessonId: c.id,
          scheduledAt: c.scheduledAt,
          duration: c.duration,
          reason: "CLASSROOM",
          detail: `Sınıf ${c.classroom?.name ?? ""} bu saatte dolu.`,
        });
      }
      if (studentSet.has(c.studentId)) {
        conflicts.push({
          lessonId: c.id,
          scheduledAt: c.scheduledAt,
          duration: c.duration,
          reason: "STUDENT",
          detail: `Öğrenci ${c.student?.fullName ?? ""} bu saatte başka bir derste.`,
        });
      }
    }
  }

  return conflicts;
}

/** Çakışmaları kullanıcı dostu tek metne çevirir. */
export function formatConflicts(conflicts: LessonConflict[]): string {
  if (conflicts.length === 0) return "";
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  // Aynı (lessonId+reason) tekrarlarını teklestir
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const c of conflicts) {
    const key = `${c.lessonId}:${c.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`• ${fmt.format(c.scheduledAt)} (${c.duration}dk) — ${c.detail}`);
    if (lines.length >= 8) {
      lines.push(`… ve ${conflicts.length - lines.length} ek çakışma`);
      break;
    }
  }
  return `Çakışma tespit edildi:\n${lines.join("\n")}`;
}
