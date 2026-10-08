import { EmptyState, List, ListRow, Section } from "@/components/panel/ui";
import { SCHEDULE_CONFLICT_KIND_LABELS } from "@/lib/panel/group-360";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { GROUP_360_BOX_CLASS, GROUP_360_DATE } from "./shared";

export function ProgramPanel({
  data,
}: {
  data: NonNullable<Group360Bundle["program"]>;
}) {
  return (
    <>
      <Section
        title="Haftalık / yaklaşan program"
        divider={false}
        className="mt-6"
      >
        {data.weekly.length ? (
          <List label="Haftalık / yaklaşan program">
            {data.weekly.map((lesson) => (
              <ListRow
                key={lesson.id}
                title={lesson.title}
                meta={`${GROUP_360_DATE.format(lesson.startsAt)} · ${lesson.teacherName} · ${lesson.durationMinutes} dk${
                  lesson.seriesId ? " · seri" : ""
                }`}
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Planlı ders yok." />
        )}
      </Section>

      <Section title="Ders serileri">
        {data.series.length ? (
          <List label="Ders serileri">
            {data.series.map((item) => (
              <ListRow
                key={item.id}
                title={item.title}
                meta={`${item.teacherName} · ${item.isActive ? "Aktif" : "Pasif"} · ${item.upcomingCount} yaklaşan`}
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Ders serisi yok." />
        )}
      </Section>

      <Section title="Çakışmalar">
        {data.conflicts.length ? (
          <div className="space-y-2">
            {data.conflicts.map((conflict, index) => (
              <div
                key={`${conflict.lessonId}-${conflict.otherLessonId}-${conflict.kind}-${index}`}
                className={GROUP_360_BOX_CLASS}
              >
                <p className="text-[13.5px] font-semibold text-pn-text">
                  {SCHEDULE_CONFLICT_KIND_LABELS[conflict.kind]}
                </p>
                <p className="mt-1 text-[13px] text-pn-text-muted">
                  {conflict.lessonTitle || "Ders"} ↔ {conflict.otherLessonTitle}{" "}
                  · {GROUP_360_DATE.format(conflict.startsAt)}
                  {conflict.studentName ? ` · ${conflict.studentName}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Açık çakışma yok." />
        )}
      </Section>
    </>
  );
}
