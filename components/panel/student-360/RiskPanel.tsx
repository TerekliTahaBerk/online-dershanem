import { PanelAttentionCard, PanelCard, PanelCardTitle, PanelStatusBadge } from "@/components/panel/ui";
import { STUDENT_360_RISK_LEVEL_LABELS } from "@/lib/panel/student-360";
import { DAY, EmptyLine } from "./shared";
import type { RiskPanelProps } from "./types";

export function RiskPanel(props: RiskPanelProps) {
  const { data } = props;
  return (
    <div className="space-y-5">
      <PanelAttentionCard
        tone={data.summary.level === "high" ? "critical" : data.summary.level === "none" ? "info" : "warning"}
        title={`Risk: ${STUDENT_360_RISK_LEVEL_LABELS[data.summary.level]} (${data.summary.totalPoints} puan)`}
        body={
          data.summary.whyRisky.length
            ? data.summary.whyRisky.join(" ")
            : "Açık risk sinyali yok."
        }
      />

      <PanelCard>
        <PanelCardTitle>Risk sinyalleri</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.summary.items.length ? (
            data.summary.items.map((item) => (
              <article
                key={`${item.code}-${item.reason}`}
                className="rounded-[10px] border border-dc-line-soft px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-dc-ink">{item.reason}</p>
                  <PanelStatusBadge
                    label={`${item.points} puan · ${item.severity}`}
                    tone={
                      item.severity === "high"
                        ? "critical"
                        : item.severity === "medium"
                          ? "warning"
                          : "neutral"
                    }
                  />
                </div>
                <p className="mt-1.5 text-[12.5px] leading-5 text-dc-ink-muted">
                  Önerilen aksiyon: {item.suggestedAction}
                </p>
                <p className="mt-1 text-[12px] text-dc-ink-faint">
                  Durum: {item.status ?? "—"}
                  {item.ownerName ? ` · Sorumlu: ${item.ownerName}` : ""}
                  {item.detectedAt ? ` · ${DAY.format(item.detectedAt)}` : ""}
                </p>
              </article>
            ))
          ) : (
            <EmptyLine text="Risk sinyali üretilmedi." />
          )}
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Müdahale kayıtları</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.cases.length ? (
            data.cases.map((item) => (
              <article key={item.id} className="rounded-[10px] border border-dc-line-soft px-3.5 py-3">
                <p className="text-[13px] font-bold text-dc-ink">
                  {item.reasonCode} · {item.status}
                </p>
                <p className="mt-1 text-[13px] leading-5 text-dc-ink-body">{item.explanation}</p>
                <p className="mt-1 text-[12.5px] text-dc-ink-muted">{item.suggestedAction}</p>
                <p className="mt-1 text-[12px] text-dc-ink-faint">
                  Vade {DAY.format(item.dueAt)}
                  {item.ownerName ? ` · ${item.ownerName}` : ""}
                </p>
              </article>
            ))
          ) : (
            <EmptyLine text="Açık müdahale kaydı yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}
