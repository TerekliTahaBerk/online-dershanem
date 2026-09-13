import { PanelCard, PanelCardTitle, PanelTaskRow } from "@/components/panel/ui";
import { DATE, DAY, EmptyLine, SectionTitle } from "./shared";
import type { OverviewPanelProps } from "./types";

export function OverviewPanel(props: OverviewPanelProps) {
  const { data } = props;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <PanelCard>
        <PanelCardTitle>Bu haftanın durumu</PanelCardTitle>
        <dl className="mt-4 space-y-3 text-[13.5px] text-dc-ink-body">
          <div className="flex justify-between gap-3">
            <dt>Ders katılımı</dt>
            <dd className="font-semibold text-dc-ink">
              {data.weekAttendancePresent} / {data.weekAttendanceTotal}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Tamamlanan çalışmalar</dt>
            <dd className="font-semibold text-dc-ink">
              {data.completedAssignments} / {data.assignmentTotal}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Plan gerçekleşme</dt>
            <dd className="font-semibold text-dc-ink">
              {data.planCompletionPercent == null
                ? "Plan yok"
                : `%${data.planCompletionPercent}`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Açık yardım</dt>
            <dd className="font-semibold text-dc-ink">
              {data.openHelpRequests}
            </dd>
          </div>
          {data.nearestOdkExamTitle ? (
            <div className="flex justify-between gap-3">
              <dt>Yaklaşan ODK</dt>
              <dd className="font-semibold text-dc-ink">
                {data.nearestOdkExamTitle}
              </dd>
            </div>
          ) : null}
        </dl>

        <SectionTitle>Yaklaşan dersler</SectionTitle>
        <div className="mt-2.5 space-y-1">
          {data.upcomingLessons.length ? (
            data.upcomingLessons.map((lesson) => (
              <PanelTaskRow
                key={lesson.id}
                title={lesson.title}
                meta={DATE.format(lesson.startsAt)}
              />
            ))
          ) : (
            <EmptyLine text="Yaklaşan ders yok." />
          )}
        </div>
      </PanelCard>

      <div className="space-y-5">
        <PanelCard>
          <PanelCardTitle>Son denemeler</PanelCardTitle>
          <div className="mt-3 space-y-2">
            {data.recentExams.length ? (
              data.recentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex justify-between gap-3 text-[13.5px]"
                >
                  <span className="text-dc-ink-body">
                    {exam.title} · {DAY.format(exam.takenAt)}
                  </span>
                  <span className="font-semibold text-dc-ink">
                    {exam.totalNet.toFixed(1).replace(".", ",")} net
                  </span>
                </div>
              ))
            ) : (
              <EmptyLine text="Deneme kaydı yok." />
            )}
          </div>
        </PanelCard>

        <PanelCard>
          <PanelCardTitle>Açık görev / müdahale</PanelCardTitle>
          <div className="mt-3 space-y-2">
            {data.openInterventions.length ? (
              data.openInterventions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[10px] border border-dc-line-soft px-3 py-2.5"
                >
                  <p className="text-[13px] font-semibold text-dc-ink">
                    {item.status}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-5 text-dc-ink-muted">
                    {item.reason}
                  </p>
                </div>
              ))
            ) : data.activeRiskReasons.length ? (
              data.activeRiskReasons.map((reason) => (
                <p
                  key={reason}
                  className="text-[13px] leading-6 text-dc-ink-body"
                >
                  {reason}
                </p>
              ))
            ) : (
              <EmptyLine text="Açık müdahale yok." />
            )}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
