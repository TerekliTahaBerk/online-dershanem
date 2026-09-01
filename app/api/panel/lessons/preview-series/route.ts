import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import {
  previewLessonSeries,
  LessonSeriesScheduleError,
  type IsoWeekday,
} from "@/lib/panel/lesson-series-schedule";
import { findLessonScheduleConflicts } from "@/lib/panel/lesson-lifecycle";
import { prisma } from "@/lib/prisma";
import { formatOccurrenceLabel } from "@/lib/panel/lesson-series-schedule";

const schema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(2).max(120).optional(),
  seriesStartsOn: z.string().datetime(),
  startsAtTime: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  totalOccurrences: z.number().int().min(1).max(48),
  seriesEndsOn: z.string().datetime().optional().nullable(),
  teacherId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Seri bilgilerini kontrol edin." }, { status: 400 });
  }

  const group = await prisma.group.findFirst({
    where: {
      id: parsed.data.groupId,
      isActive: true,
      ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}),
    },
    include: {
      enrollments: { where: { endedAt: null }, select: { studentId: true } },
    },
  });
  if (!group) return NextResponse.json({ error: "Aktif grup bulunamadı." }, { status: 404 });

  const teacherId = parsed.data.teacherId || group.teacherId;
  if (auth.session.role === "TEACHER" && teacherId !== auth.session.userId) {
    return NextResponse.json({ error: "Yalnız kendi derslerinizi planlayabilirsiniz." }, { status: 403 });
  }

  try {
    const preview = previewLessonSeries({
      seriesStartsOn: new Date(parsed.data.seriesStartsOn),
      startsAtTime: parsed.data.startsAtTime,
      durationMinutes: parsed.data.durationMinutes,
      weekdays: parsed.data.weekdays as IsoWeekday[],
      totalOccurrences: parsed.data.totalOccurrences,
      seriesEndsOn: parsed.data.seriesEndsOn ? new Date(parsed.data.seriesEndsOn) : null,
    });

    const studentIds = group.enrollments.map((e) => e.studentId);
    const conflictKindLabel: Record<string, string> = {
      TEACHER: "Öğretmen başka derste",
      GROUP: "Grup başka derste",
      STUDENT: "Öğrenci başka derste",
    };
    const conflicts: Array<{
      occurrenceIndex: number;
      startsAt: string;
      kinds: string[];
      message: string;
    }> = [];

    for (let index = 0; index < preview.occurrences.length; index += 1) {
      const occ = preview.occurrences[index];
      const found = await findLessonScheduleConflicts(prisma, {
        lessonId: `preview-${group.id}-${index}`,
        teacherId,
        groupId: group.id,
        startsAt: occ.startsAt,
        endsAt: occ.endsAt,
        studentIds,
      });
      if (found.length) {
        const kinds = [...new Set(found.map((f) => f.kind))];
        conflicts.push({
          occurrenceIndex: index,
          startsAt: occ.startsAt.toISOString(),
          kinds,
          message: kinds
            .map((kind) => conflictKindLabel[kind] || kind)
            .concat(
              found
                .filter((f) => f.kind === "STUDENT" && f.studentName)
                .map((f) => f.studentName!),
            )
            .join(" · "),
        });
      }
    }

    return NextResponse.json({
      count: preview.count,
      weekdays: preview.weekdays,
      timezone: preview.timezone,
      hasConflicts: conflicts.length > 0,
      conflicts,
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
