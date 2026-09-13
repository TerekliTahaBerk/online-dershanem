import type { AssignmentProgressStatus } from "@prisma/client";
import { PanelCard, PanelCardTitle, PanelStatusBadge } from "@/components/panel/ui";
import { ASSIGNMENT_DISPLAY_LABELS, deriveAssignmentDisplayStatus, type AssignmentDisplayStatus } from "@/lib/panel/assignment-display";
import { DATE, EmptyLine } from "./shared";
import type { AssignmentsPanelProps } from "./types";

export function AssignmentsPanel(props: AssignmentsPanelProps) {
  const { data } = props;
  return (
    <PanelCard>
      <PanelCardTitle>Ödevler</PanelCardTitle>
      <div className="mt-3 space-y-2">
        {data.items.length ? (
          data.items.map((item) => {
            const display = deriveAssignmentDisplayStatus({
              progress: item.status as AssignmentProgressStatus,
              dueAt: item.dueAt ?? new Date(0),
            });
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dc-line-soft px-3 py-2.5"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-dc-ink">{item.title}</p>
                  <p className="text-[12px] text-dc-ink-muted">
                    {item.groupName}
                    {item.dueAt ? ` · ${DATE.format(item.dueAt)}` : ""}
                  </p>
                </div>
                <PanelStatusBadge
                  label={ASSIGNMENT_DISPLAY_LABELS[display as AssignmentDisplayStatus]}
                  tone={display === "GEC" ? "critical" : "neutral"}
                />
              </div>
            );
          })
        ) : (
          <EmptyLine text="Ödev kaydı yok." />
        )}
      </div>
    </PanelCard>
  );
}
