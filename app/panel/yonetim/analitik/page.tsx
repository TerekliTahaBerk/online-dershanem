import { BarChart3, Download } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import {
  AnalyticsFilterForm,
  filtersToQuery,
} from "@/components/panel/analytics-filter-form";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import { loadManagementAnalyticsSnapshot } from "@/lib/analytics/server";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";
import { MANAGEMENT_ANALYTICS_RULE_VERSION } from "@/lib/analytics/definitions";

export const dynamic = "force-dynamic";

function toneClass(tone: string) {
  if (tone === "positive") return "text-emerald-700";
  if (tone === "critical") return "text-rose-700";
  if (tone === "watch") return "text-amber-700";
  return "text-[var(--site-ink)]";
}

export default async function ManagementAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("ADMIN");
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

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <AdminPageHeader
        eyebrow="Yönetim analitikleri"
        title="Karar destek metrikleri."
        description="Vanity sayaçlar yerine dönüşüm, operasyon ve kohort kalitesi. Europe/Istanbul · aggregate sorgular."
        icon={BarChart3}
        meta={MANAGEMENT_ANALYTICS_RULE_VERSION}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--site-muted)]">
          {formatIstanbulDateInput(filters.from)} – {formatIstanbulDateInput(filters.to)} · ürün{" "}
          {filters.product}
        </p>
        <a
          href={`/api/panel/analytics/export?${qs}`}
          download
          className="panel-quick-action panel-quick-action-primary"
        >
          <Download size={15} /> CSV (PII yok)
        </a>
      </div>

      <div className="mt-4">
        <AnalyticsFilterForm filters={filters} />
      </div>
      {filters.notice ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
        >
          {filters.notice}
        </p>
      ) : null}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.kpis.map((kpi) => (
          <Link
            key={kpi.key}
            href={`${kpi.href}?${qs}`}
            className="panel-metric-card transition hover:border-[var(--brand-olive)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-olive)]"
          >
            <p className={`mt-1 text-3xl font-extrabold tracking-[-0.03em] ${toneClass(kpi.tone)}`}>
              {kpi.display}
            </p>
            <p className="mt-2 text-xs font-bold text-[var(--site-body)]">{kpi.label}</p>
            <p className="mt-1 text-[11px] text-[var(--site-muted)]">{kpi.hint}</p>
            {kpi.sampleNote ? (
              <p className="mt-2 text-[10px] text-[var(--site-muted)]">{kpi.sampleNote}</p>
            ) : null}
            <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--brand-olive)]">
              Detay →
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="panel-surface p-5">
          <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Ticari özet</h2>
          <ul className="mt-3 space-y-2 text-xs text-[var(--site-body)]">
            <li>Won → Paid: {snapshot.commercial.wonToPaidPercent ?? "—"}%</li>
            <li>Ort. satış süresi: {snapshot.commercial.avgSalesCycleDays ?? "—"} gün</li>
            <li>
              İade: {snapshot.commercial.refundedOrderCount} sipariş ·{" "}
              {(snapshot.commercial.refundedCents / 100).toLocaleString("tr-TR")} ₺
            </li>
            <li>Yenileme yaklaşan: {snapshot.commercial.packageRenewalsUpcoming}</li>
          </ul>
          <Link
            href={`/panel/yonetim/analitik/sales_by_product?${qs}`}
            className="mt-4 inline-block text-xs font-bold text-[var(--brand-olive)]"
          >
            Ürün bazında satış →
          </Link>
        </article>
        <article className="panel-surface p-5">
          <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Öğrenci risk & öğretmen işleri</h2>
          <ul className="mt-3 space-y-2 text-xs text-[var(--site-body)]">
            <li>
              Risk: {snapshot.education.risk.critical} kritik · {snapshot.education.risk.watch} izleme ·{" "}
              {snapshot.education.risk.normal} normal
            </li>
            <li>Aktif grup: {snapshot.education.activeGroups}</li>
            <li>Açık işler (toplam): {snapshot.teacherOps.openWorkItems}</li>
            <li>
              Ort. öğrenci yükü: {snapshot.teacherOps.averageStudentLoad ?? "—"} (sıralama yok)
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-[var(--site-muted)]">
            Öğretmen metrikleri performans puanı veya leaderboard üretmez.
          </p>
        </article>
      </section>

      <section className="mt-6 panel-surface p-5">
        <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Kohort başarı (gizlilik eşikli)</h2>
        <p className="mt-1 text-xs text-[var(--site-muted)]">
          n &lt; 10 örneklemde değerler bastırılır. Nedensellik iddiası yoktur.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.success.mockExamTrends.map((row) => (
            <article
              key={row.exam}
              className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--site-muted)]">
                {row.exam}
              </p>
              <p className="mt-2 text-xl font-extrabold text-[var(--site-ink)]">
                {row.status === "READY" && row.medianChange !== null
                  ? `${row.medianChange > 0 ? "+" : ""}${row.medianChange}`
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--site-muted)]">
                {row.status === "INSUFFICIENT_SAMPLE"
                  ? `${row.pairedStudents}/10 eşleşme`
                  : `${row.pairedStudents} eşleşme · medyan değişim`}
              </p>
            </article>
          ))}
        </div>
        <Link
          href={`/panel/yonetim/analitik/cohort_mock_exam_trend?${qs}`}
          className="mt-4 inline-block text-xs font-bold text-[var(--brand-olive)]"
        >
          Kohort detayı →
        </Link>
      </section>
    </PanelShell>
  );
}
