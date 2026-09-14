import { PanelCard, PanelCardTitle, PanelTaskRow } from "@/components/panel/ui";
import { ATTENDANCE_LABEL, DATE, DAY, EmptyLine } from "./shared";
import type { LessonsPanelProps } from "./types";

export function LessonsPanel(props: LessonsPanelProps) {
  const { data } = props;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard>
        <PanelCardTitle>Gelecek dersler</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.upcoming.length ? (
            <ul className="space-y-2">
              {data.upcoming.map((lesson) => (
                <PanelTaskRow
                  key={lesson.id}
                  title={lesson.title}
                  meta={`${lesson.groupName} · ${DATE.format(lesson.startsAt)}`}
                />
              ))}
            </ul>
          ) : (
            <EmptyLine text="Planlı ders yok." />
          )}
        </div>
        {data.recoveryOpenCount > 0 ? (
          <p className="mt-4 text-[13px] font-semibold text-[#8A5F37]">
            {data.recoveryOpenCount} açık telafi paketi var.
          </p>
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Geçmiş dersler</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.past.length ? (
            data.past.map((lesson) => (
              <article
                key={lesson.id}
                className="border-b border-dc-line-soft pb-3 last:border-0 last:pb-0"
              >
                <p className="text-[13.5px] font-semibold text-dc-ink">
                  {lesson.title}
                </p>
                <p className="mt-1 text-[12.5px] text-dc-ink-muted">
                  {DAY.format(lesson.startsAt)}
                  {lesson.attendance
                    ? ` · ${ATTENDANCE_LABEL[lesson.attendance] ?? lesson.attendance}`
                    : ""}
                </p>
                {lesson.note ? (
                  <p className="mt-1.5 text-[13px] leading-5 text-dc-ink-body">
                    {lesson.note}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <EmptyLine text="Tamamlanmış ders kaydı yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}
