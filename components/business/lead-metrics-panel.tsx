import type { LeadAnalytics } from "@/lib/business/lead-metrics";
import { BusinessMetric } from "@/components/business/business-metric";
import {
  LEAD_LOST_REASON_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
} from "@/lib/business/leads";

const pct = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  maximumFractionDigits: 1,
});

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
          <BusinessMetric key={String(label)} label={String(label)} value={value} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
          <h3 className="text-[15px] font-semibold">Kaynak dönüşümü</h3>
          <ul className="mt-3 space-y-2 text-[13px]">
            {analytics.sourceConversion.length === 0 ? (
              <li className="text-pn-text-muted">Veri yok</li>
            ) : (
              analytics.sourceConversion.map((row) => (
                <li
                  key={row.source}
                  className="flex justify-between gap-3 border-t pt-2"
                >
                  <span>{LEAD_SOURCE_LABELS[row.source]}</span>
                  <strong>
                    {row.won}/{row.total} · {pct.format(row.rate)}
                  </strong>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
          <h3 className="text-[15px] font-semibold">Aşama dağılımı</h3>
          <ul className="mt-3 space-y-2 text-[13px]">
            {analytics.stageConversion.map((row) => (
              <li
                key={row.stage}
                className="flex justify-between gap-3 border-t pt-2"
              >
                <span>{LEAD_STAGE_LABELS[row.stage]}</span>
                <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
          <h3 className="text-[15px] font-semibold">Ortalama aşama süresi</h3>
          <ul className="mt-3 space-y-2 text-[13px]">
            {analytics.averageMsInStage.length === 0 ? (
              <li className="text-pn-text-muted">
                Yeterli STAGE_CHANGED örneği yok
              </li>
            ) : (
              analytics.averageMsInStage.map((row) => (
                <li
                  key={row.stage}
                  className="flex justify-between gap-3 border-t pt-2"
                >
                  <span>{LEAD_STAGE_LABELS[row.stage]}</span>
                  <strong>
                    {formatDuration(row.averageMs)} · n={row.samples}
                  </strong>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4">
          <h3 className="text-[15px] font-semibold">Kayıp nedenleri</h3>
          <ul className="mt-3 space-y-2 text-[13px]">
            {analytics.lostReasons.length === 0 ? (
              <li className="text-pn-text-muted">Kayıp kayıt yok</li>
            ) : (
              analytics.lostReasons.map((row) => (
                <li
                  key={row.code}
                  className="flex justify-between gap-3 border-t pt-2"
                >
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

        <article className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-4 xl:col-span-2">
          <h3 className="text-[15px] font-semibold">Sorumlu performansı</h3>
          <ul className="mt-3 space-y-2 text-[13px]">
            {analytics.ownerPerformance.length === 0 ? (
              <li className="text-pn-text-muted">Veri yok</li>
            ) : (
              analytics.ownerPerformance.map((row) => (
                <li
                  key={row.ownerId ?? "unassigned"}
                  className="flex flex-wrap justify-between gap-3 border-t pt-2"
                >
                  <span>
                    {row.ownerId
                      ? ownerNames[row.ownerId] || row.ownerId
                      : "Atanmamış"}
                  </span>
                  <strong>
                    {row.won} kazanım / {row.total} aday · {row.overdue} gecikme
                    · {row.lost} kayıp
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
