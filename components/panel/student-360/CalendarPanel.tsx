import { PanelCard, PanelCardTitle, PanelStatusBadge } from "@/components/panel/ui";
import { DATE, EmptyLine } from "./shared";
import type { CalendarPanelProps } from "./types";

export function CalendarPanel(props: CalendarPanelProps) {
  const { data } = props;
  const items = [
    ...data.upcoming.map((lesson) => ({ ...lesson, kind: "upcoming" as const })),
    ...data.past.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      startsAt: lesson.startsAt,
      groupName: lesson.attendance ?? "Tamamlandı",
      kind: "past" as const,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <PanelCard>
      <PanelCardTitle>Takvim</PanelCardTitle>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dc-line-soft px-3 py-2.5"
            >
              <div>
                <p className="text-[13.5px] font-semibold text-dc-ink">{item.title}</p>
                <p className="text-[12px] text-dc-ink-muted">
                  {DATE.format(item.startsAt)}
                  {item.groupName ? ` · ${item.groupName}` : ""}
                </p>
              </div>
              <PanelStatusBadge
                label={item.kind === "upcoming" ? "Planlı" : "Geçmiş"}
                tone={item.kind === "upcoming" ? "info" : "neutral"}
              />
            </div>
          ))
        ) : (
          <EmptyLine text="Takvimde ders yok." />
        )}
      </div>
    </PanelCard>
  );
}
