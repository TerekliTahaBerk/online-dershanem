import { PanelCard, PanelCardTitle, PanelTaskRow } from "@/components/panel/ui";
import { RelationshipRemoveButton } from "@/components/panel/relationship-remove-button";
import { StudentParentLinkForm } from "@/components/panel/student-parent-link-form";
import { DAY, EmptyLine } from "./shared";
import type { ParentPanelProps } from "./types";

export function ParentPanel(props: ParentPanelProps) {
  const { data, studentId, canManage, parentOptions } = props;
  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardTitle>Bağlı veliler</PanelCardTitle>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {data.parents.map((parent) => (
            <div
              key={parent.linkId}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-dc-line p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-dc-ink">
                  {parent.fullName}
                </p>
                <p className="mt-1 truncate text-[12px] text-dc-ink-muted">
                  {parent.email}
                  {parent.relationship ? ` · ${parent.relationship}` : ""}
                </p>
              </div>
              {canManage ? (
                <RelationshipRemoveButton id={parent.linkId} />
              ) : null}
            </div>
          ))}
          {!data.parents.length ? (
            <EmptyLine text="Aktif veli bağlantısı yok." />
          ) : null}
        </div>
        {canManage ? (
          <StudentParentLinkForm
            studentId={studentId}
            parents={parentOptions.map((p) => ({ id: p.id, name: p.label }))}
          />
        ) : null}
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Haftalık özetler</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.digests.length ? (
            data.digests.map((digest) => (
              <PanelTaskRow
                key={digest.id}
                title={`${digest.trendBand} · ${digest.supportArea}`}
                meta={`${DAY.format(digest.weekStart)} · ${digest.status}${
                  digest.publishedAt
                    ? ` · yayın ${DAY.format(digest.publishedAt)}`
                    : ""
                }`}
              />
            ))
          ) : (
            <EmptyLine text="Yayınlanmış veya taslak haftalık özet yok." />
          )}
        </div>
      </PanelCard>
    </div>
  );
}
