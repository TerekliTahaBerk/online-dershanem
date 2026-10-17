import { adminJson } from "@/lib/panel/admin-api";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import {
  lessonSeriesRequestSchema,
  previewLessonSeries,
  resolveLessonSeriesInput,
  LessonSeriesScheduleError,
  formatOccurrenceLabel,
} from "@/lib/panel/lesson-series-schedule";
import { findLessonScheduleConflicts } from "@/lib/panel/lesson-lifecycle";
import { resolveLessonTargetGroup } from "@/lib/panel/lesson-target";
import { prisma } from "@/lib/prisma";

const NO_GROUP_YET =
  "Bu öğrenci için henüz bireysel grup yok; oluşturma sırasında açılır." as const;

/** Admin/öğretmen formlarıyla hizalı önizleme gövdesi. */
const schema = lessonSeriesRequestSchema.extend({
  targetType: z.enum(["GROUP", "STUDENT"]).default("GROUP"),
  groupId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  startsAt: z.string().datetime().optional(),
  meetingUrl: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return adminJson({ error: "Lütfen seri bilgilerini bir kez daha kontrol eder misiniz?" }, { status: 400 });
  }

  const resolved = await resolveLessonTargetGroup({
    targetType: parsed.data.targetType,
    groupId: parsed.data.groupId,
    studentId: parsed.data.studentId,
    teacherId: parsed.data.teacherId,
    actorRole: auth.session.role === "TEACHER" ? "TEACHER" : "ADMIN",
    actorUserId: auth.session.userId,
    createIfMissing: false,
  });

  const group = resolved.group;
  const teacherId =
    parsed.data.teacherId ||
    group?.teacherId ||
    (auth.session.role === "TEACHER" ? auth.session.userId : null);

  if (!teacherId) {
    return adminJson({ error: resolved.error || "Lütfen öğretmen seçin." }, { status: 400 });
  }
  if (parsed.data.targetType === "GROUP" && (resolved.error || !group)) {
    return adminJson({ error: resolved.error || "Grubu bulamadık." }, { status: 404 });
  }
  if (parsed.data.targetType === "STUDENT" && !parsed.data.studentId) {
    return adminJson({ error: "Lütfen öğrenci seçin." }, { status: 400 });
  }
  if (parsed.data.targetType === "STUDENT" && resolved.error && resolved.error !== NO_GROUP_YET) {
    return adminJson({ error: resolved.error }, { status: 403 });
  }

  try {
    // Oluşturma ucuyla AYNI çözümleyici — önizlemenin gösterdiği occurrence
    // listesi ile kaydedilecek liste tanım gereği aynı.
    const preview = previewLessonSeries(resolveLessonSeriesInput(parsed.data));

    const studentIds = group
      ? group.enrollments.map((row) => row.student.id)
      : parsed.data.studentId
        ? [parsed.data.studentId]
        : [];
    const conflictGroupId = group?.id ?? "__preview_no_group__";
    const conflictKindLabel: Record<string, string> = {
      TEACHER: "Öğretmen başka derste",
      GROUP: "Grup başka derste",
      STUDENT: "Öğrenci başka derste",
    };
    const conflicts: Array<{
      occurrenceIndex: number;
      message: string;
    }> = [];

    // 48 oluşuma kadar sıralı sorgu önizlemeyi saniyelerce bekletiyordu;
    // bağlantı havuzunu tüketmemek için sınırlı paralellikle denetlenir.
    const CONCURRENCY = 6;
    const found: Awaited<ReturnType<typeof findLessonScheduleConflicts>>[] = [];
    for (let start = 0; start < preview.occurrences.length; start += CONCURRENCY) {
      const chunk = preview.occurrences.slice(start, start + CONCURRENCY);
      found.push(
        ...(await Promise.all(
          chunk.map((occ, offset) =>
            findLessonScheduleConflicts(prisma, {
              lessonId: `preview-${conflictGroupId}-${start + offset}`,
              teacherId,
              groupId: conflictGroupId,
              startsAt: occ.startsAt,
              endsAt: occ.endsAt,
              studentIds,
            }),
          ),
        )),
      );
    }

    found.forEach((items, index) => {
      if (!items.length) return;
      const kinds = [...new Set(items.map((item) => item.kind))];
      conflicts.push({
        occurrenceIndex: index,
        message: kinds
          .map((kind) => conflictKindLabel[kind] || kind)
          .concat(
            items
              .filter((item) => item.kind === "STUDENT" && item.studentName)
              .map((item) => item.studentName!),
          )
          .join(" · "),
      });
    });

    return adminJson({
      count: preview.count,
      hasConflicts: conflicts.length > 0,
      conflicts,
      note: group ? null : NO_GROUP_YET,
      occurrences: preview.occurrences.map((occ) => ({
        startsAt: occ.startsAt.toISOString(),
        endsAt: occ.endsAt.toISOString(),
        label: formatOccurrenceLabel(occ.startsAt),
      })),
    });
  } catch (error) {
    if (error instanceof LessonSeriesScheduleError) {
      return adminJson({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }
}
