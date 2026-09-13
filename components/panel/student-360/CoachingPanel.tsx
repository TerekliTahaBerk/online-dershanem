import { PanelCard, PanelCardTitle, PanelTaskRow } from "@/components/panel/ui";
import { DAY, EmptyLine } from "./shared";
import type { CoachingPanelProps } from "./types";

export function CoachingPanel(props: CoachingPanelProps) {
  const { data } = props;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard>
        <PanelCardTitle>Haftalık plan</PanelCardTitle>
        {data.plan ? (
          <>
            <p className="mt-2 text-[13.5px] text-dc-ink-body">
              {data.plan.status}
              {data.plan.completionPercent != null
                ? ` · %${data.plan.completionPercent} tamamlandı`
                : ""}
            </p>
            <ul className="mt-3 space-y-1">
              {data.plan.tasks.slice(0, 8).map((task) => (
                <PanelTaskRow
                  key={task.id}
                  title={task.title}
                  meta={`${task.status} · ${DAY.format(task.scheduledFor)}`}
                />
              ))}
            </ul>
            {data.feedbackCategory ? (
              <p className="mt-3 text-[12.5px] text-dc-ink-faint">
                Plan geri bildirimi: {data.feedbackCategory}
              </p>
            ) : null}
          </>
        ) : (
          <EmptyLine text="Bu hafta için onaylı plan yok." />
        )}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Koçluk özeti</PanelCardTitle>
        <dl className="mt-3 space-y-2.5 text-[13.5px] text-dc-ink-body">
          <div className="flex justify-between gap-3">
            <dt>Koç</dt>
            <dd className="font-semibold text-dc-ink">
              {data.coachName ?? "Atama yok"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Sıklık</dt>
            <dd>{data.cadenceDays ? `${data.cadenceDays} günde bir` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Durum</dt>
            <dd className={data.overdue ? "font-semibold text-[#C2493D]" : ""}>
              {data.overdue ? "Görüşme gecikmiş" : "Takipte"}
            </dd>
          </div>
        </dl>
        {data.sharedNote ? (
          <p className="mt-4 rounded-[10px] border border-dc-line-soft bg-dc-surface-soft px-3.5 py-3 text-[13.5px] leading-6 text-dc-ink-body">
            {data.sharedNote}
          </p>
        ) : (
          <p className="mt-4 text-[13px] text-dc-ink-muted">
            Paylaşılan koçluk notu yok.
          </p>
        )}
        {data.focus ? (
          <p className="mt-2 text-[12.5px] text-dc-ink-faint">
            Odak: {data.focus}
          </p>
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Hedefler</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.goals.length ? (
            data.goals.map((goal) => (
              <div
                key={goal.id}
                className="flex justify-between gap-3 text-[13.5px]"
              >
                <span>{goal.label}</span>
                <span className="font-semibold text-dc-ink">
                  {goal.current == null ? "—" : goal.current} / {goal.target}
                </span>
              </div>
            ))
          ) : (
            <EmptyLine text="Hedef tanımlanmamış." />
          )}
        </div>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Check-in geçmişi</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.checkIns.length ? (
            <ul className="space-y-2">
              {data.checkIns.map((row) => (
                <PanelTaskRow
                  key={row.id}
                  title={`${row.energy} · ${row.barrier}`}
                  meta={`${DAY.format(row.createdAt)}${row.shared ? " · öğretmenle paylaşıldı" : ""}`}
                />
              ))}
            </ul>
          ) : (
            <EmptyLine text="Check-in kaydı yok." />
          )}
        </div>
      </PanelCard>

      <PanelCard className="lg:col-span-2">
        <PanelCardTitle>Zaman çizelgesi</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.timeline?.length ? (
            <ul className="space-y-2">
              {data.timeline.map((row) => (
                <PanelTaskRow
                  key={row.id}
                  title={row.title}
                  meta={`${DAY.format(row.occurredAt)}${row.summary ? ` · ${row.summary}` : ""}`}
                />
              ))}
            </ul>
          ) : (
            <EmptyLine text="Henüz zaman çizelgesi kaydı yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}
