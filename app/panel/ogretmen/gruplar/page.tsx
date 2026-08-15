import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getAccessibleProducts } from "@/lib/auth/products";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  PanelEmpty,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * EĞİTMEN · ÖĞRENCİLERİN — onaylı tasarım (Panel.dc.html → eStudents).
 *
 * Tasarımın işlev tanımı: "yalnızca sana atanmış öğrenciler" — tablo
 * kolonları Öğrenci / Kapsam / Grup / Katılım / Durum.
 *
 * YETKİ SINIRI: liste yalnız öğretmenin KENDİ aktif gruplarındaki
 * kayıtlardan çıkar (`group.teacherId = session.userId`). Başka öğretmenin
 * öğrencisi sorguya hiç girmez.
 */

export default async function TeacherStudentsPage() {
  const session = await requireRole("TEACHER");

  const groups = await prisma.group.findMany({
    where: { teacherId: session.userId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      enrollments: {
        where: { endedAt: null },
        select: {
          student: {
            select: {
              id: true,
              userId: true,
              user: { select: { fullName: true, email: true, role: true } },
            },
          },
        },
      },
    },
  });

  const rows = groups.flatMap((g) =>
    g.enrollments.map((e) => ({
      studentId: e.student.id,
      userId: e.student.userId,
      role: e.student.user.role,
      name: e.student.user.fullName || e.student.user.email,
      group: g.name,
    })),
  );

  const studentIds = rows.map((r) => r.studentId);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [attendance, progress, products] = await Promise.all([
    studentIds.length
      ? prisma.attendance.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.assignmentProgress.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        })
      : Promise.resolve([]),
    Promise.all(
      rows.map(async (r) => [r.studentId, await getAccessibleProducts(r.userId, r.role)] as const),
    ),
  ]);

  const productMap = new Map(products);

  const scopeLabel = (studentId: string) => {
    const list = productMap.get(studentId) ?? [];
    const parts = [
      list.includes("OD") ? "Ders" : null,
      list.includes("ODK") ? "Deneme" : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" + ") : "Erişim yok";
  };

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğrenciler"
    >
      <div className="max-w-[1040px]">
        <PanelHeading
          title="Öğrencilerin"
          description={`${rows.length} öğrenci · yalnızca sana atanmış öğrenciler`}
        />

        {rows.length === 0 ? (
          <PanelEmpty
            title="Sana atanmış aktif öğrenci yok."
            body="Gruplarına öğrenci eklendiğinde katılım ve çalışma durumu burada listelenir."
          />
        ) : (
          <PanelTable
            caption="Sana atanmış öğrenciler"
            columns={["Öğrenci", "Kapsam", "Grup", "Katılım", "Durum"]}
          >
            {rows.map((row) => {
              const att = attendance.filter((a) => a.studentId === row.studentId);
              const attended = att.filter(
                (a) => a.status === "PRESENT" || a.status === "LATE",
              ).length;
              const absent = att.filter((a) => a.status === "ABSENT").length;

              const prog = progress.filter((p) => p.studentId === row.studentId);
              const done = prog.filter((p) => p.status === "DONE").length;
              const pct = prog.length ? Math.round((done / prog.length) * 100) : null;

              const status =
                absent >= 2
                  ? { label: `${absent} ders katılmadı`, tone: "warn" as const }
                  : pct !== null && pct < 50 && prog.length >= 2
                    ? { label: `Çalışma oranı %${pct}`, tone: "warn" as const }
                    : { label: "Normal", tone: "ok" as const };

              return (
                <PanelTableRow key={`${row.group}-${row.studentId}`}>
                  <PanelTableCell>
                    <span className="text-[14px] font-bold text-dc-ink">{row.name}</span>
                  </PanelTableCell>
                  <PanelTableCell>{scopeLabel(row.studentId)}</PanelTableCell>
                  <PanelTableCell>{row.group}</PanelTableCell>
                  <PanelTableCell>{att.length ? `${attended} / ${att.length}` : "—"}</PanelTableCell>
                  <PanelTableCell tone={status.tone}>{status.label}</PanelTableCell>
                </PanelTableRow>
              );
            })}
          </PanelTable>
        )}
      </div>
    </PanelShell>
  );
}
