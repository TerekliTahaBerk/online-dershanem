import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { listParentVisibleTeachers } from "@/lib/panel/student-teacher-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildContext } from "@/components/panel/parent/child-context";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
} from "@/components/panel/ui";
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
  const { children, selected } = await resolveParentScope(
    session.userId,
    studentId,
  );

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle={PANEL_DOMAIN.ogretmenler}
    >
      <div className="max-w-[760px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <EmptyState title="Bağlı öğrenci yok." body="Yönetim eşleştirmesi tamamlanınca öğretmenler burada görünür." />,
    );
  }

  const teachers = await listParentVisibleTeachers(selected.id);

  return shell(
    <>
      <PageHeader
        title={PANEL_DOMAIN.ogretmenler}
        description="Aktif öğretmenler ve branşları. İletişim bilgisi ve iç notlar paylaşılmaz."
        metadata={<ChildContext options={children} selectedId={selected.id} basePath="/panel/veli/ogretmenler" />}
      />
      {teachers.length === 0 ? (
        <EmptyState className="mt-5" title="Henüz öğretmen bağlantısı yok." body="Öğretmen atandığında branş bilgisi burada listelenir." />
      ) : (
        <PanelTable caption={`${selected.name} · öğretmenler`} columns={["Branş", "Öğretmen", "Hakkında"]}>
          {teachers.map((teacher) => (
            <PanelTableRow key={teacher.assignmentId}>
              <PanelTableCell>{teacher.subject}</PanelTableCell>
              <PanelTableCell>
                <span className="font-medium text-pn-text">{teacher.teacherName}</span>
              </PanelTableCell>
              <PanelTableCell>{teacher.bio || <span className="text-pn-text-muted">—</span>}</PanelTableCell>
            </PanelTableRow>
          ))}
        </PanelTable>
      )}
    </>,
  );
}
