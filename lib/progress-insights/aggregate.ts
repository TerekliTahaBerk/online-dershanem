import {
  averageNullable,
  isDecliningGidisat,
  median,
} from "@/lib/progress-insights/compute";
import { buildTeacherOverviewNarrative } from "@/lib/progress-insights/narrative";
import type {
  AdminGidisatPanel,
  NetTrendPoint,
  ProgressInsightBundle,
  ProgressInsightPeriod,
  TeacherGidisatOverview,
  TeacherStudentGidisatRow,
} from "@/lib/progress-insights/types";

export function buildTeacherGidisatOverview(input: {
  period: ProgressInsightPeriod;
  bundles: ProgressInsightBundle[];
  studentMeta: Array<{
    studentId: string;
    studentName: string;
    classLevel: string | null;
  }>;
}): TeacherGidisatOverview {
  const metaById = new Map(input.studentMeta.map((m) => [m.studentId, m]));

  const rows: TeacherStudentGidisatRow[] = input.bundles.map((bundle) => {
    const meta = metaById.get(bundle.studentId);
    const attendancePercent = bundle.behavioral.attendance.percent;
    const assignmentPercent = bundle.behavioral.assignments.percent;
    const planPercent = bundle.behavioral.plan.percent;
    const netDelta = bundle.academic.netDelta;
    return {
      studentId: bundle.studentId,
      studentName: meta?.studentName ?? bundle.studentName,
      classLevel: meta?.classLevel ?? null,
      attendancePercent,
      assignmentPercent,
      planPercent,
      netDelta,
      declining: isDecliningGidisat({
        netDelta,
        attendancePercent,
        assignmentPercent,
        planPercent,
      }),
      href: `/panel/ogretmen/ogrenci/${bundle.studentId}`,
      riskHint: bundle.riskHint ?? null,
    };
  });

  rows.sort((a, b) => {
    if (a.declining !== b.declining) return a.declining ? -1 : 1;
    return a.studentName.localeCompare(b.studentName, "tr");
  });

  const declining = rows.filter((r) => r.declining);

  const overview: TeacherGidisatOverview = {
    period: input.period,
    studentCount: rows.length,
    averages: {
      attendancePercent: averageNullable(rows.map((r) => r.attendancePercent)),
      assignmentPercent: averageNullable(rows.map((r) => r.assignmentPercent)),
      planPercent: averageNullable(rows.map((r) => r.planPercent)),
      medianNetDelta: median(
        rows.map((r) => r.netDelta).filter((v): v is number => v !== null),
      ),
    },
    declining,
    rows,
    narrative: [],
  };
  overview.narrative = buildTeacherOverviewNarrative(overview);
  return overview;
}

export function buildAdminGidisatPanel(input: {
  attendancePercent: number | null;
  assignmentPercent: number | null;
  planPercent: number | null;
  netDeltas: number[];
  sparkline: NetTrendPoint[];
  suppressMin?: number;
}): AdminGidisatPanel {
  const suppressMin = input.suppressMin ?? 10;
  const pairedStudents = input.netDeltas.length;
  const suppressed = pairedStudents > 0 && pairedStudents < suppressMin;
  const medianNetDelta = suppressed ? null : median(input.netDeltas);

  const narrative: string[] = [];
  if (input.attendancePercent !== null) {
    narrative.push(`Kohort ders katılımı %${input.attendancePercent}.`);
  }
  if (input.assignmentPercent !== null) {
    narrative.push(`Ödev/çalışma tamamlama %${input.assignmentPercent}.`);
  }
  if (input.planPercent !== null) {
    narrative.push(`Haftalık plan tamamlama %${input.planPercent}.`);
  }
  if (suppressed) {
    narrative.push(`Net değişim bastırıldı (${pairedStudents}/${suppressMin} eşleşme).`);
  } else if (medianNetDelta !== null) {
    narrative.push(
      `Medyan net değişim ${medianNetDelta > 0 ? "+" : ""}${medianNetDelta} (${pairedStudents} öğrenci).`,
    );
  }

  return {
    attendancePercent: input.attendancePercent,
    assignmentPercent: input.assignmentPercent,
    planPercent: input.planPercent,
    medianNetDelta,
    pairedStudents,
    suppressed,
    sparkline: input.sparkline,
    narrative,
  };
}
