import { PanelCard, PanelCardTitle, PanelTaskRow } from "@/components/panel/ui";
import { DAY, EmptyLine } from "./shared";
import type { AcademicPanelProps } from "./types";

export function AcademicPanel(props: AcademicPanelProps) {
  const { data } = props;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard>
        <PanelCardTitle>Ders bazlı performans</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.subjectPerformance.length ? (
            data.subjectPerformance.map((row) => (
              <div key={row.subject} className="flex justify-between gap-3 text-[13.5px]">
                <span>{row.subject}</span>
                <span className="font-semibold text-dc-ink">
                  {row.avgNet == null
                    ? "Veri yok"
                    : `${row.avgNet.toFixed(1).replace(".", ",")} ort. · ${row.sampleSize} bölüm`}
                </span>
              </div>
            ))
          ) : (
            <EmptyLine text="Henüz ders bazlı deneme verisi yok." />
          )}
        </div>
        <p className="mt-4 text-[12.5px] text-dc-ink-faint">
          Tekrar kuyruğu: {data.reviewDueCount} · kazanım sinyali: {data.evidenceCount}
        </p>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Ödev geçmişi</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.assignmentHistory.length ? (
            data.assignmentHistory.map((row) => (
              <PanelTaskRow
                key={row.id}
                title={row.title}
                meta={`${row.groupName} · ${row.status}${row.dueAt ? ` · ${DAY.format(row.dueAt)}` : ""}`}
              />
            ))
          ) : (
            <EmptyLine text="Ödev kaydı yok." />
          )}
        </div>
      </PanelCard>

      {data.outcomeHints.length ? (
        <PanelCard className="lg:col-span-2">
          <PanelCardTitle>Kazanım / tekrar ihtiyacı</PanelCardTitle>
          <ul className="mt-3 space-y-2 text-[13.5px] text-dc-ink-body">
            {data.outcomeHints.map((hint, index) => (
              <li key={`${hint.title}-${index}`}>
                {hint.subject} · {hint.title} · {hint.type}
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      {data.unifiedOutcomes.length ? (
        <PanelCard className="lg:col-span-2">
          <PanelCardTitle>Birleşik kazanım profili</PanelCardTitle>
          <p className="mt-1 text-[12.5px] text-dc-ink-faint">
            Ders, ödev, deneme ve koçluk kanıtları tek profilde.
          </p>
          <div className="mt-4 space-y-4">
            {data.unifiedOutcomes.map((row) => (
              <div key={row.outcomeId} className="rounded-xl border border-dc-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-dc-ink">{row.title}</p>
                    <p className="text-[12px] text-dc-ink-faint">
                      {row.subjectName} · {row.unitName} · {row.code}
                    </p>
                  </div>
                  <span className="rounded-full bg-dc-surface-muted px-2.5 py-1 text-[12px] font-medium text-dc-ink">
                    {row.statusLabel}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-[12.5px] text-dc-ink-body sm:grid-cols-2">
                  {row.evidence.lesson ? (
                    <div>
                      <dt className="font-medium text-dc-ink">Ders</dt>
                      <dd>{row.evidence.lesson}</dd>
                    </div>
                  ) : null}
                  {row.evidence.assignment ? (
                    <div>
                      <dt className="font-medium text-dc-ink">Ödev</dt>
                      <dd>{row.evidence.assignment}</dd>
                    </div>
                  ) : null}
                  {row.evidence.mockExam ? (
                    <div>
                      <dt className="font-medium text-dc-ink">Deneme</dt>
                      <dd>{row.evidence.mockExam}</dd>
                    </div>
                  ) : null}
                  {row.evidence.coaching ? (
                    <div>
                      <dt className="font-medium text-dc-ink">Koçum</dt>
                      <dd>{row.evidence.coaching}</dd>
                    </div>
                  ) : null}
                </dl>
                {row.explanation.length ? (
                  <ul className="mt-3 space-y-1 text-[12px] text-dc-ink-faint">
                    {row.explanation.map((line, index) => (
                      <li key={index}>
                        {line.source}: {line.detail}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </PanelCard>
      ) : null}
    </div>
  );
}
