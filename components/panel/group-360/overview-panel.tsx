import {
  EmptyState,
  List,
  ListRow,
  PropertyList,
  PropertyRow,
  Section,
} from "@/components/panel/ui";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { GROUP_360_BOX_CLASS, GROUP_360_DATE } from "./shared";

export function OverviewPanel({
  data,
}: {
  data: NonNullable<Group360Bundle["overview"]>;
}) {
  return (
    <>
      <Section title="Hızlı özet" divider={false} className="mt-6">
        <PropertyList>
          <PropertyRow label="Boş koltuk">
            {String(data.capacity.available)}
          </PropertyRow>
          <PropertyRow label="Aktif ders serisi">
            {String(data.seriesCount)}
          </PropertyRow>
          <PropertyRow label="Ödev sayısı">
            {String(data.assignmentCount)}
          </PropertyRow>
        </PropertyList>
      </Section>

      <Section title="Yaklaşan dersler">
        {data.upcomingLessons.length ? (
          <List label="Yaklaşan dersler">
            {data.upcomingLessons.map((lesson) => (
              <ListRow
                key={lesson.id}
                title={lesson.title}
                meta={`${GROUP_360_DATE.format(lesson.startsAt)} · ${lesson.teacherName}`}
                action={
                  <span className="text-[13px] text-pn-text-muted">
                    {lesson.status}
                  </span>
                }
              />
            ))}
          </List>
        ) : (
          <EmptyState title="Yaklaşan planlı ders yok." />
        )}
      </Section>

      {data.issues.length ? (
        <Section title="Operasyon sorunları">
          <div className="space-y-2">
            {data.issues.map((issue) => (
              <div key={issue.code} className={GROUP_360_BOX_CLASS}>
                <p className="text-[13.5px] font-semibold text-pn-text">
                  {issue.title}
                </p>
                <p className="mt-1 text-[13px] text-pn-text-muted">
                  {issue.description}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
