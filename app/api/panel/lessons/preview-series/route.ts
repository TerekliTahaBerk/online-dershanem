import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import {
  previewLessonSeries,
  LessonSeriesScheduleError,
  formatOccurrenceLabel,
  type IsoWeekday,
} from "@/lib/panel/lesson-series-schedule";
import { findLessonScheduleConflicts } from "@/lib/panel/lesson-lifecycle";
import { resolveLessonTargetGroup } from "@/lib/panel/lesson-target";
import { prisma } from "@/lib/prisma";

const NO_GROUP_YET =
  "Bu öğrenci için henüz bireysel grup yok; oluşturma sırasında açılır." as const;

/** Admin/öğretmen formlarıyla hizalı önizleme gövdesi. */
const schema = z.object({
  targetType: z.enum(["GROUP", "STUDENT"]).default("GROUP"),
  groupId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  startsAt: z.string().datetime().optional(),
  seriesStartsOn: z.string().datetime().optional(),
  startsAtTime: z
    .string()
    .regex(/^([01]?\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  totalOccurrences: z.number().int().min(1).max(48).default(8),
  repeatWeeks: z.number().int().min(1).max(12).optional(),
  seriesEndsOn: z.string().datetime().optional().nullable(),
  mode: z.enum(["SINGLE", "SERIES"]).optional(),
  meetingUrl: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Seri bilgilerini kontrol edin." }, { status: 400 });
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
    return NextResponse.json({ error: resolved.error || "Öğretmen seçin." }, { status: 400 });
  }
  if (parsed.data.targetType === "GROUP" && (resolved.error || !group)) {
    return NextResponse.json({ error: resolved.error || "Grup bulunamadı." }, { status: 404 });
  }
  if (parsed.data.targetType === "STUDENT" && !parsed.data.studentId) {
    return NextResponse.json({ error: "Öğrenci seçin." }, { status: 400 });
  }
  if (parsed.data.targetType === "STUDENT" && resolved.error && resolved.error !== NO_GROUP_YET) {
    return NextResponse.json({ error: resolved.error }, { status: 403 });
  }

  const startsAt = new Date(
    parsed.data.seriesStartsOn || parsed.data.startsAt || new Date().toISOString(),
  );
  const time =
    parsed.data.startsAtTime ||
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(startsAt);

  try {
    const preview = previewLessonSeries({
      seriesStartsOn: startsAt,
      startsAtTime: time,
      durationMinutes: parsed.data.durationMinutes,
      weekdays: (parsed.data.weekdays || []) as IsoWeekday[],
      totalOccurrences:
        parsed.data.totalOccurrences ||
        parsed.data.repeatWeeks ||
        (parsed.data.mode === "SINGLE" ? 1 : 8),
      seriesEndsOn: parsed.data.seriesEndsOn ? new Date(parsed.data.seriesEndsOn) : null,
    });

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

    for (let index = 0; index < preview.occurrences.length; index += 1) {
      const occ = preview.occurrences[index];
      const found = await findLessonScheduleConflicts(prisma, {
        lessonId: `preview-${conflictGroupId}-${index}`,
        teacherId,
        groupId: conflictGroupId,
        startsAt: occ.startsAt,
        endsAt: occ.endsAt,
        studentIds,
      });
      if (found.length) {
        const kinds = [...new Set(found.map((item) => item.kind))];
        conflicts.push({
          occurrenceIndex: index,
          message: kinds
            .map((kind) => conflictKindLabel[kind] || kind)
            .concat(
              found
                .filter((item) => item.kind === "STUDENT" && item.studentName)
                .map((item) => item.studentName!),
            )
            .join(" · "),
        });
      }
    }

    return NextResponse.json({
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
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }
}
