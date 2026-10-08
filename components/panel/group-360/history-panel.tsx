import {
  EmptyState,
  List,
  ListRow,
  Section,
  StatusBadge,
} from "@/components/panel/ui";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { GROUP_360_DATE } from "./shared";

export function HistoryPanel({
  data,
}: {
  data: NonNullable<Group360Bundle["history"]>;
}) {
  return (
    <>
      <Section title="Katılım oranı" divider={false} className="mt-6">
        <p className="text-[22px] font-bold tabular-nums text-pn-text">
          {data.attendanceRate != null ? `%${data.attendanceRate}` : "—"}
        </p>
      </Section>

      <Section title="Tamamlanan dersler">
        {data.completed.length ? (
          <List label="Tamamlanan dersler">
            {data.completed.map((lesson) => (
              <ListRow
                key={lesson.id}
                title={lesson.title}
                status={<StatusBadge label="Tamamlandı" tone="success" />}
                meta={GROUP_360_DATE.format(lesson.startsAt)}
                action={
                  <span className="text-[13px] tabular-nums text-pn-text-muted">
                    {lesson.attendanceTotal
                      ? `${lesson.attendancePresent}/${lesson.attendanceTotal}`
                      : "yoklama yok"}
                  </span>
                }
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Tamamlanan ders yok." />
        )}
      </Section>

      <Section title="İptaller">
        {data.cancelled.length ? (
          <List label="İptaller">
            {data.cancelled.map((lesson) => (
              <ListRow
                key={lesson.id}
                title={lesson.title}
                status={<StatusBadge label="İptal" tone="neutral" />}
                meta={GROUP_360_DATE.format(lesson.startsAt)}
              />
            ))}
          </List>
        ) : (
          <EmptyState title="İptal kaydı yok." />
        )}
      </Section>
    </>
  );
}
