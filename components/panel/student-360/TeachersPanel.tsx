import { PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { StudentTeacherLinkForm, StudentTeacherUnlinkButton } from "@/components/panel/student-teacher-link-form";
import { EmptyLine } from "./shared";
import type { TeachersPanelProps } from "./types";

export function TeachersPanel(props: TeachersPanelProps) {
  const { data, studentId, teacherOptions, canManage } = props;
  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardTitle>Branş öğretmenleri</PanelCardTitle>
        <div className="mt-3 space-y-2">
          {data.links.length ? (
            data.links.map((link) => (
              <div
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dc-line-soft px-3 py-2.5"
              >
                <div>
                  <p className="text-[12.5px] font-semibold uppercase tracking-wide text-dc-ink-faint">
                    {link.subject}
                  </p>
                  <p className="text-[14px] font-bold text-dc-ink">{link.teacherName}</p>
                </div>
                {canManage ? <StudentTeacherUnlinkButton linkId={link.id} /> : null}
              </div>
            ))
          ) : (
            <EmptyLine text="Henüz branş öğretmeni bağlı değil." />
          )}
        </div>
        {canManage ? (
          <StudentTeacherLinkForm
            studentId={studentId}
            teachers={teacherOptions.map((t) => ({ id: t.id, name: t.label }))}
          />
        ) : null}
      </PanelCard>
    </div>
  );
}
