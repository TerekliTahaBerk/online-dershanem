import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { prisma } from "@/lib/prisma";
import {
  ASSIGNMENT_DISPLAY_LABELS,
  deriveAssignmentDisplayStatus,
} from "@/lib/panel/assignment-display";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildContext } from "@/components/panel/parent/child-context";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  StatusBadge,
} from "@/components/panel/ui";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

/**
 * Veli · Ödevler — salt okunur. Internal öğretmen notları gösterilmez.
 */
export default async function ParentAssignmentsPage({
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
      pageTitle={PANEL_DOMAIN.odev}
    >
      <div className="max-w-[760px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <EmptyState title="Bağlı öğrenci yok." body="Ödev özeti öğrenci eşleşince açılır." />,
    );
  }

  const now = new Date();
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: selected.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((row) => row.groupId);

  const assignments = groupIds.length
    ? await prisma.assignment.findMany({
        where: { groupId: { in: groupIds }, isActive: true },
        orderBy: { dueAt: "asc" },
        take: 40,
        select: {
          id: true,
          title: true,
          description: true,
          dueAt: true,
          createdBy: { select: { fullName: true, email: true } },
          progress: {
            where: { studentId: selected.id },
            select: { status: true },
            take: 1,
          },
          submissions: {
            where: { studentId: selected.id },
            orderBy: { attemptNumber: "desc" },
            take: 1,
            select: { status: true },
          },
        },
      })
    : [];

  const rows = assignments.map((assignment) => {
    const status = deriveAssignmentDisplayStatus({
      progress: assignment.progress[0]?.status ?? null,
      dueAt: assignment.dueAt,
      now,
      submissionStatus: assignment.submissions[0]?.status ?? null,
    });
    return { assignment, status };
  });

  const active = rows.filter((row) =>
    ["ATANDI", "GORULDU", "DEVAM_EDIYOR", "GEC"].includes(row.status),
  );
  const late = rows.filter((row) => row.status === "GEC");

  return shell(
    <>
      <PageHeader
        title={PANEL_DOMAIN.odev}
        description={`Aktif ${active.length} · geciken ${late.length}. Ödev içerikleri öğretmen tarafından yönetilir; burada yalnız izlenir.`}
        metadata={<ChildContext options={children} selectedId={selected.id} basePath="/panel/veli/odevler" />}
      />
      {rows.length === 0 ? (
        <EmptyState className="mt-5" title="Aktif ödev yok." body="Öğretmenden ödev geldiğinde burada görünür." />
      ) : (
        <PanelTable caption={`${selected.name} · ödevler`} columns={["Ödev", "Öğretmen", "Son tarih", "Durum"]}>
          {rows.map(({ assignment, status }) => (
            <PanelTableRow key={assignment.id}>
              <PanelTableCell>
                <span className="font-medium text-pn-text">{assignment.title}</span>
                {assignment.description ? <span className="mt-0.5 block text-[12.5px] text-pn-text-muted line-clamp-2">{assignment.description}</span> : null}
              </PanelTableCell>
              <PanelTableCell>{assignment.createdBy.fullName || assignment.createdBy.email}</PanelTableCell>
              <PanelTableCell>
                <span className="tabular-nums">{DATE.format(assignment.dueAt)}</span>
              </PanelTableCell>
              <PanelTableCell>
                <StatusBadge
                  label={ASSIGNMENT_DISPLAY_LABELS[status]}
                  tone={status === "GEC" ? "critical" : status === "TAMAMLANDI" || status === "DEGERLENDIRILDI" ? "success" : "neutral"}
                />
              </PanelTableCell>
            </PanelTableRow>
          ))}
        </PanelTable>
      )}
    </>,
  );
}
