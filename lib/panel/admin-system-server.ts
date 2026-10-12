import "server-only";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { gidisatPanelFromAnalyticsSnapshot } from "@/lib/progress-insights/admin-from-analytics";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureSnapshot } from "@/lib/panel-feature-registry";
import { METRIC_DEFINITIONS } from "@/lib/analytics/definitions";
import { formatMetricDisplay } from "@/lib/analytics/dashboard";
import { metricValue } from "@/lib/analytics/metric-value";
import { parseAnalyticsFilters, type AnalyticsFilterInput } from "@/lib/analytics/filters";
import { loadManagementAnalyticsSnapshot } from "@/lib/analytics/server";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";
import { loadAdminQuality } from "./admin-quality-server";
import { publicCohortGain } from "./admin-system-projection";
import { COHORT_MIN_GAP_DAYS, COHORT_MIN_STUDENTS, COHORT_QUALITY_RULE_VERSION, cohortSampleBand } from "@/lib/cohort-quality";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import type { AdminAnalytics, AdminAudit, AdminFeatures, AdminQuality } from "@/lib/mobile-contracts/admin-system";
const value = (n: number | null | undefined, suffix = "") => n == null ? "—" : `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}${suffix}`;
export async function loadAdminAudit(entityType = "", take = 100): Promise<AdminAudit> {
  const rows = await prisma.auditLog.findMany({ where: entityType ? { entityType } : undefined, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take, select: { id: true, action: true, summary: true, entityType: true, actorUserId: true, createdAt: true } });
  const ids = [...new Set(rows.flatMap((row) => row.actorUserId ? [row.actorUserId] : []))];
  const actors = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, email: true } }) : [];
  const names = new Map(actors.map((a) => [a.id, a.fullName || a.email]));
  return { contractVersion: 1, logs: rows.map((r) => ({ id: r.id, action: r.action, summary: r.summary || r.action, entityType: r.entityType, actor: r.actorUserId ? names.get(r.actorUserId) || "Silinmiş kullanıcı" : "Sistem", createdAt: r.createdAt.toISOString() })) };
}
export async function loadAdminFeatures() {
  const { logs } = await loadAdminAudit("", 12);
  return { contractVersion: 1, features: getPanelFeatureSnapshot(), logs } satisfies AdminFeatures;
}
export async function loadAdminAnalytics(input: AnalyticsFilterInput): Promise<AdminAnalytics> {
  const filters = parseAnalyticsFilters(input);
  const s = await loadManagementAnalyticsSnapshot(filters);
  const c = s.commercial; const e = s.education; const t = s.teacherOps;
  const gidisat = getPanelFeatureFlags().progressInsights ? gidisatPanelFromAnalyticsSnapshot(s) : null;
  const out = s.success.outcomeProgress; const align = s.success.planAlignmentVsOutcome;
  return { contractVersion: 1, ruleVersion: s.ruleVersion, timezone: s.timezone,
    filters: { from: formatIstanbulDateInput(filters.from), to: formatIstanbulDateInput(filters.to), examType: filters.examType, product: filters.product, classLevel: filters.classLevel || "", groupId: filters.groupId || "", teacherId: filters.teacherId || "", notice: filters.notice },
    metrics: METRIC_DEFINITIONS.map((def) => ({ ...def, display: formatMetricDisplay(def.unit, metricValue(def.key, s)) })),
    sections: [
      ...(gidisat ? [{ title: "Gidişat", items: gidisat.narrative.map((label) => ({ label, value: "" })) }] : []),
      { title: "Ticari görünüm", items: [{ label: "Kazanımdan ödemeye", value: value(c.wonToPaidPercent, "%") }, { label: "Ortalama satış süresi", value: value(c.avgSalesCycleDays, " gün") }, { label: "İade edilen sipariş", value: value(c.refundedOrderCount) }, { label: "İade tutarı", value: formatMetricDisplay("cents", c.refundedCents) }, { label: "Yaklaşan yenilemeler", value: value(c.packageRenewalsUpcoming) }] },
      { title: "Ürüne göre satışlar", items: c.salesByProduct.map((row) => ({ label: `${row.product} · ${row.packageName}`, value: `${row.orderCount} sipariş · ${formatMetricDisplay("cents", row.totalCents)}` })) },
      { title: "Eğitim ve öğretmen operasyonu", items: [{ label: "Kritik risk", value: value(e.risk.critical) }, { label: "İzlenecek", value: value(e.risk.watch) }, { label: "Normal", value: value(e.risk.normal) }, { label: "Aktif grup", value: value(e.activeGroups) }, { label: "Açık iş", value: value(t.openWorkItems) }, { label: "Ortalama öğrenci yükü", value: value(t.averageStudentLoad) }] },
      { title: "Kohort başarı görünümü", items: [{ label: "Kazanım ilerlemesi", value: out.status === "READY" ? value(out.value, "%") : "Yetersiz örneklem; gizlendi" }, { label: "Plan / sonuç ilişkisi", value: align.status === "READY" ? `Plan ${value(align.value?.planCompletionPercent, "%")} · Deneme ${value(align.value?.mockParticipationPercent, "%")}` : "Yetersiz örneklem; gizlendi" }] },
    ], gains: s.success.mockExamTrends.map(publicCohortGain),
  };
}
export async function loadAdminQualityProjection(): Promise<AdminQuality> {
  const q = await loadAdminQuality();
  await recordPanelProductEvent({ name: "cohort_quality_viewed", properties: { ruleVersion: COHORT_QUALITY_RULE_VERSION, readyCohortCount: q.ready.length, suppressedCohortCount: q.gains.length - q.ready.length, pairedStudentBand: cohortSampleBand(q.pairedTotal) } }, "ADMIN");
  const labels = { KNOWLEDGE: "Bilgi", PROCESS: "İşlem / yöntem", ATTENTION: "Dikkat", TIME: "Süre", BLANK: "Boş bırakma" };
  return { contractVersion: 1, ruleVersion: COHORT_QUALITY_RULE_VERSION, minStudents: COHORT_MIN_STUDENTS, minGapDays: COHORT_MIN_GAP_DAYS, gains: q.gains.map(publicCohortGain), commonErrors: q.commonErrors.map(([category, students]) => ({ label: labels[category], students: students.size })), sections: [{ title: "Öğrenme kalitesi", items: [{ label: "30 günlük kazanım etiketleme", value: `${value(q.evidenceCoverage, "%")} · ${q.taggedItems}/${q.lessons.length + q.assignments.length}` }, { label: "Geri bildirim medyanı", value: `${value(q.feedbackMedian, " sa")} · ${q.feedbackHours.length} inceleme` }, { label: "Yayınlanabilir sınav kohortu", value: `${q.ready.length}/4 · örneklem ${cohortSampleBand(q.pairedTotal)}` }] }] };
}
