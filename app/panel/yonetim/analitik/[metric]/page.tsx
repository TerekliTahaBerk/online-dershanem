import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import {
  AnalyticsFilterForm,
  filtersToQuery,
} from "@/components/panel/analytics-filter-form";
import { getMetricDefinition } from "@/lib/analytics/definitions";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import { formatMetricDisplay } from "@/lib/analytics/dashboard";
import { loadManagementAnalyticsSnapshot } from "@/lib/analytics/server";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

function metricValue(
  key: string,
  snapshot: Awaited<ReturnType<typeof loadManagementAnalyticsSnapshot>>,
): number | null {
  const c = snapshot.commercial;
  const e = snapshot.education;
  const t = snapshot.teacherOps;
  switch (key) {
    case "lead_count":
      return c.leadCount;
    case "lead_to_won":
      return c.leadToWonPercent;
    case "won_to_paid":
      return c.wonToPaidPercent;
    case "paid_to_provisioned":
      return c.paidToProvisionedPercent;
    case "avg_sales_cycle_days":
      return c.avgSalesCycleDays;
    case "collections":
      return c.collectionsCents;
    case "refunds":
      return c.refundedCents;
    case "package_renewals_upcoming":
      return c.packageRenewalsUpcoming;
    case "active_students":
      return e.activeStudents;
    case "active_groups":
      return e.activeGroups;
    case "lesson_attendance_rate":
      return e.lessonAttendancePercent;
    case "assignment_completion":
      return e.assignmentCompletionPercent;
    case "weekly_plan_completion":
      return e.weeklyPlanCompletionPercent;
    case "mock_exam_participation":
      return e.mockExamParticipationPercent;
    case "intervention_rate":
      return e.interventionRatePercent;
    case "student_risk_distribution":
      return e.risk.critical + e.risk.watch;
    case "lesson_close_completion":
      return t.lessonCloseCompletionPercent;
    case "teacher_open_work":
      return t.openWorkItems;
    case "intervention_resolution":
      return t.interventionResolutionPercent;
    case "teacher_student_load":
      return t.averageStudentLoad;
    case "cohort_outcome_progress":
      return snapshot.success.outcomeProgress.value;
    default:
      return null;
  }
}

export default async function ManagementAnalyticsMetricPage({
  params,
  searchParams,
}: {
  params: Promise<{ metric: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("ADMIN");
  const { metric: metricKey } = await params;
  const def = getMetricDefinition(metricKey);
  if (!def) notFound();

  const query = await searchParams;
  const filters = parseAnalyticsFilters({
    from: typeof query.from === "string" ? query.from : undefined,
    to: typeof query.to === "string" ? query.to : undefined,
    examType: typeof query.examType === "string" ? query.examType : undefined,
    classLevel: typeof query.classLevel === "string" ? query.classLevel : undefined,
    product: typeof query.product === "string" ? query.product : undefined,
    groupId: typeof query.groupId === "string" ? query.groupId : undefined,
    teacherId: typeof query.teacherId === "string" ? query.teacherId : undefined,
  });

  const snapshot = await loadManagementAnalyticsSnapshot(filters);
  const qs = filtersToQuery(filters);
  const value = metricValue(metricKey, snapshot);

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <Link
        href={`/panel/yonetim/analitik?${qs}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-olive)]"
      >
        <ArrowLeft size={14} /> Analitiklere dön
      </Link>
      <AdminPageHeader
        eyebrow={def.domain}
        title={def.label}
        description={def.definition}
        icon={BarChart3}
        meta={formatMetricDisplay(def.unit, value)}
      />

      <div className="mt-4">
        <AnalyticsFilterForm filters={filters} action={`/panel/yonetim/analitik/${metricKey}`} />
      </div>
      {filters.notice ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
        >
          {filters.notice}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="panel-surface p-5">
          <h2 className="text-sm font-extrabold">Tanım sözleşmesi</h2>
          <dl className="mt-3 space-y-3 text-xs text-[var(--site-body)]">
            <div>
              <dt className="font-bold text-[var(--site-muted)]">Query source</dt>
              <dd className="mt-0.5 font-mono text-[11px]">{def.querySource}</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--site-muted)]">Date semantics</dt>
              <dd className="mt-0.5">{def.dateSemantics}</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--site-muted)]">Timezone</dt>
              <dd className="mt-0.5">{def.timezone}</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--site-muted)]">Denominator</dt>
              <dd className="mt-0.5">{def.denominator}</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--site-muted)]">Aralık</dt>
              <dd className="mt-0.5">
                {formatIstanbulDateInput(filters.from)} – {formatIstanbulDateInput(filters.to)}
              </dd>
            </div>
          </dl>
        </article>

        <article className="panel-surface p-5">
          <h2 className="text-sm font-extrabold">Değer</h2>
          <p className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-[var(--site-ink)]">
            {formatMetricDisplay(def.unit, value)}
          </p>

          {metricKey === "sales_by_product" ? (
            <ul className="mt-4 divide-y divide-[var(--site-line)] text-xs">
              {snapshot.commercial.salesByProduct.length === 0 ? (
                <li className="py-3 text-[var(--site-muted)]">Bu aralıkta satış yok.</li>
              ) : (
                snapshot.commercial.salesByProduct.map((row) => (
                  <li key={`${row.product}-${row.packageName}`} className="flex justify-between gap-3 py-2">
                    <span>
                      {row.product} · {row.packageName}
                    </span>
                    <span className="font-bold">
                      {row.orderCount} · {(row.totalCents / 100).toLocaleString("tr-TR")} ₺
                    </span>
                  </li>
                ))
              )}
            </ul>
          ) : null}

          {metricKey === "student_risk_distribution" ? (
            <ul className="mt-4 space-y-2 text-xs">
              <li>Kritik: {snapshot.education.risk.critical}</li>
              <li>İzleme: {snapshot.education.risk.watch}</li>
              <li>Normal: {snapshot.education.risk.normal}</li>
              <li>Toplam aktif: {snapshot.education.risk.total}</li>
            </ul>
          ) : null}

          {metricKey.startsWith("cohort_") || metricKey === "plan_alignment_vs_outcome" ? (
            <div className="mt-4 space-y-3 text-xs text-[var(--site-body)]">
              {snapshot.success.mockExamTrends.map((row) => (
                <p key={row.exam}>
                  {row.exam}:{" "}
                  {row.status === "READY"
                    ? `medyan ${row.medianChange} (n=${row.pairedStudents})`
                    : `bastırıldı (n=${row.pairedStudents})`}
                </p>
              ))}
              <p>
                Kazanım kapsamı: {snapshot.success.outcomeProgress.status} · n=
                {snapshot.success.outcomeProgress.sampleSize}
                {snapshot.success.outcomeProgress.value !== null
                  ? ` · %${snapshot.success.outcomeProgress.value}`
                  : ""}
              </p>
              <p>
                Plan vs deneme: {snapshot.success.planAlignmentVsOutcome.status} · n=
                {snapshot.success.planAlignmentVsOutcome.sampleSize}
              </p>
            </div>
          ) : null}

          {def.domain === "teacher_ops" ? (
            <p className="mt-4 text-[11px] text-[var(--site-muted)]">
              Bu görünüm öğretmen sıralaması veya performans değerlendirmesi üretmez; yalnız operasyon
              yükünü gösterir.
            </p>
          ) : null}
        </article>
      </section>
    </PanelShell>
  );
}
