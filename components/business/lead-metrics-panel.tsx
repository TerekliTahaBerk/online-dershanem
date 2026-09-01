import type { LeadAnalytics } from "@/lib/business/lead-metrics";
import { LEAD_LOST_REASON_LABELS, LEAD_SOURCE_LABELS, LEAD_STAGE_LABELS } from "@/lib/business/leads";

const pct = new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1 });

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)} sn`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} dk`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)} sa`;
  return `${(ms / 86_400_000).toFixed(1)} gün`;
}

type Props = {
  analytics: LeadAnalytics;
  ownerNames: Record<string, string>;
};

export function LeadMetricsPanel({ analytics, ownerNames }: Props) {
  return (
    <section className="space-y-4" aria-label="CRM metrikleri">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Toplam aday", analytics.leadCount],
          ["Açık aday", analytics.openLeadCount],
          ["Kazanılan", analytics.wonLeadCount],
          ["Kaybedilen", analytics.lostLeadCount],
          ["Geciken takip", analytics.followUpOverdueCount],
        ].map(([label, value]) => (
          <article key={String(label)} className="panel-metric-card">
            <p className="mt-2 text-2xl font-semibold text-[var(--site-ink)]">{value}</p>
            <p className="mt-1 text-xs font-bold text-[var(--site-muted)]">{label}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="panel-surface p-4">
          <h3 className="text-xs font-extrabold">Kaynak dönüşümü</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {analytics.sourceConversion.length === 0 ? (
              <li className="text-[var(--site-muted)]">Veri yok</li>
            ) : (
              analytics.sourceConversion.map((row) => (
                <li key={row.source} className="flex justify-between gap-3 border-t pt-2">
                  <span>{LEAD_SOURCE_LABELS[row.source]}</span>
                  <strong>
                    {row.won}/{row.total} · {pct.format(row.rate)}
                  </strong>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="panel-surface p-4">
          <h3 className="text-xs font-extrabold">Aşama dağılımı</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {analytics.stageConversion.map((row) => (
              <li key={row.stage} className="flex justify-between gap-3 border-t pt-2">
                <span>{LEAD_STAGE_LABELS[row.stage]}</span>
                <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel-surface p-4">
          <h3 className="text-xs font-extrabold">Ortalama aşama süresi</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {analytics.averageMsInStage.length === 0 ? (
              <li className="text-[var(--site-muted)]">Yeterli STAGE_CHANGED örneği yok</li>
            ) : (
              analytics.averageMsInStage.map((row) => (
                <li key={row.stage} className="flex justify-between gap-3 border-t pt-2">
                  <span>{LEAD_STAGE_LABELS[row.stage]}</span>
                  <strong>
                    {formatDuration(row.averageMs)} · n={row.samples}
                  </strong>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="panel-surface p-4">
          <h3 className="text-xs font-extrabold">Kayıp nedenleri</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {analytics.lostReasons.length === 0 ? (
              <li className="text-[var(--site-muted)]">Kayıp kayıt yok</li>
            ) : (
              analytics.lostReasons.map((row) => (
                <li key={row.code} className="flex justify-between gap-3 border-t pt-2">
                  <span>
                    {row.code === "UNKNOWN"
                      ? "Belirtilmemiş"
                      : LEAD_LOST_REASON_LABELS[row.code]}
                  </span>
                  <strong>{row.count}</strong>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="panel-surface p-4 xl:col-span-2">
          <h3 className="text-xs font-extrabold">Sorumlu performansı</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {analytics.ownerPerformance.length === 0 ? (
              <li className="text-[var(--site-muted)]">Veri yok</li>
            ) : (
              analytics.ownerPerformance.map((row) => (
                <li
                  key={row.ownerId ?? "unassigned"}
                  className="flex flex-wrap justify-between gap-3 border-t pt-2"
                >
                  <span>{row.ownerId ? ownerNames[row.ownerId] || row.ownerId : "Atanmamış"}</span>
                  <strong>
                    {row.won} kazanım / {row.total} aday · {row.overdue} gecikme · {row.lost} kayıp
                  </strong>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </section>
  );
}
