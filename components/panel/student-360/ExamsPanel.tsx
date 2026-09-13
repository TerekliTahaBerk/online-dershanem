import { PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { DAY, EmptyLine } from "./shared";
import type { ExamsPanelProps } from "./types";

export function ExamsPanel(props: ExamsPanelProps) {
  const { data } = props;
  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardTitle>Net değişimi</PanelCardTitle>
        <p className="mt-2 text-[14px] text-dc-ink-body">
          {data.netDelta == null
            ? "Kıyaslanacak en az iki deneme yok."
            : data.netDelta > 0
              ? `Son denemede ${data.netDelta.toFixed(1).replace(".", ",")} net düşüş var.`
              : data.netDelta < 0
                ? `Son denemede ${Math.abs(data.netDelta).toFixed(1).replace(".", ",")} net artış var.`
                : "Son iki denemede toplam net aynı."}
        </p>
        {data.recurringGaps.length ? (
          <ul className="mt-3 space-y-1 text-[13px] text-dc-ink-muted">
            {data.recurringGaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Son denemeler</PanelCardTitle>
        {data.recent.length ? (
          <div className="mt-3 space-y-4">
            {data.recent.map((exam) => (
              <article key={exam.id} className="border-b border-dc-line-soft pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14px] font-semibold text-dc-ink">
                    {exam.exam} · {DAY.format(exam.takenAt)}
                  </p>
                  <p className="text-[13.5px] font-bold text-dc-ink">
                    {exam.totalNet.toFixed(1).replace(".", ",")} net
                  </p>
                </div>
                {exam.sections.length ? (
                  <p className="mt-1.5 text-[12.5px] text-dc-ink-muted">
                    {exam.sections
                      .map(
                        (section) =>
                          `${section.subject} ${section.net.toFixed(1).replace(".", ",")}`,
                      )
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12.5px] text-dc-ink-faint">
                    Bu kapsamda görüntülenebilir bölüm yok.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyLine text="Hiç deneme kaydı yok." />
        )}
      </PanelCard>
    </div>
  );
}
