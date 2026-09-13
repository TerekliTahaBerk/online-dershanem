import { buildAdminGidisatPanel } from "@/lib/progress-insights/aggregate";
import { median } from "@/lib/progress-insights/compute";
import type { AdminGidisatPanel } from "@/lib/progress-insights/types";
import type { ManagementAnalyticsSnapshot } from "@/lib/analytics/dashboard";
import { MANAGEMENT_ANALYTICS_COHORT_MIN } from "@/lib/analytics/definitions";

/**
 * Yönetim Analitik snapshot'ından Gidişat paneli.
 * Katılım/ödev/plan education KPI'larından; net değişim kohort trendlerinden.
 *
 * Bastırma eşiği trend satır sayısı değil, READY trendlerdeki eşleşmiş
 * öğrenci toplamına bakılır (kohort gizliliği).
 */
export function gidisatPanelFromAnalyticsSnapshot(
  snapshot: ManagementAnalyticsSnapshot,
): AdminGidisatPanel {
  const readyTrends = snapshot.success.mockExamTrends.filter(
    (row) => row.status === "READY" && row.medianChange !== null,
  );
  const netDeltas = readyTrends.map((row) => row.medianChange!);
  const pairedStudents = readyTrends.reduce((sum, row) => sum + row.pairedStudents, 0);

  const sparkline = readyTrends.map((row) => ({
    label: row.exam,
    net: row.medianChange!,
  }));

  const suppressMin = MANAGEMENT_ANALYTICS_COHORT_MIN;
  const suppressed = pairedStudents > 0 && pairedStudents < suppressMin;
  // Kohort yeterince büyükse trend medyanlarını kullan; aksi halde bastır.
  const base = buildAdminGidisatPanel({
    attendancePercent: snapshot.education.lessonAttendancePercent,
    assignmentPercent: snapshot.education.assignmentCompletionPercent,
    planPercent: snapshot.education.weeklyPlanCompletionPercent,
    netDeltas: suppressed ? [] : netDeltas.length ? netDeltas : [],
    sparkline,
    suppressMin: 1, // satır sayısıyla bastırma; öğrenci eşiğini burada yönetiyoruz
  });

  const medianNetDelta = suppressed || !netDeltas.length ? null : median(netDeltas);
  const narrative = [
    ...base.narrative.filter(
      (line) => !line.includes("Medyan net") && !line.includes("bastırıldı"),
    ),
  ];
  if (suppressed) {
    narrative.push(`Net değişim bastırıldı (${pairedStudents}/${suppressMin} eşleşme).`);
  } else if (medianNetDelta !== null) {
    narrative.push(
      `Medyan net değişim ${medianNetDelta > 0 ? "+" : ""}${medianNetDelta} (${pairedStudents} öğrenci).`,
    );
  }

  return {
    ...base,
    medianNetDelta,
    pairedStudents,
    suppressed,
    sparkline,
    narrative,
  };
}
