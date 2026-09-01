import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { listParentVisibleTeachers } from "@/lib/panel/student-teacher-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelCard, PanelCardTitle, PanelEmpty, PanelPageHeader } from "@/components/panel/ui";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

export const dynamic = "force-dynamic";

/**
 * Veli · Öğretmenler — çocuğun aktif öğretmenleri (telefon/internal not yok).
 */
export default async function ParentTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle={PANEL_DOMAIN.ogretmenler}
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/ogretmenler"
        />
      }
    >
      <div className="max-w-[760px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <PanelEmpty
        title="Bağlı öğrenci yok"
        body="Yönetim eşleştirmesi tamamlanınca öğretmenler burada görünür."
      />,
    );
  }

  const teachers = await listParentVisibleTeachers(selected.id);

  return shell(
    <>
      <PanelPageHeader
        title={PANEL_DOMAIN.ogretmenler}
        description={`${selected.name} için aktif öğretmenler.`}
      />
      {teachers.length === 0 ? (
        <PanelEmpty
          title="Henüz öğretmen bağlantısı yok"
          body="Öğretmen atandığında branş bilgisi burada listelenir."
        />
      ) : (
        <div className="mt-5 space-y-3">
          {teachers.map((teacher) => (
            <PanelCard key={teacher.assignmentId}>
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-dc-ink-faint">
                {teacher.subject}
              </p>
              <PanelCardTitle>{teacher.teacherName}</PanelCardTitle>
              {teacher.bio ? (
                <p className="mt-2 text-[13.5px] text-dc-ink-muted">{teacher.bio}</p>
              ) : (
                <p className="mt-2 text-[13px] text-dc-ink-faint">
                  İletişim özelliği yakında eklenecek.
                </p>
              )}
            </PanelCard>
          ))}
        </div>
      )}
    </>,
  );
}
