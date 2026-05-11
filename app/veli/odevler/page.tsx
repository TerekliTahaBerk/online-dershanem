import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VeliOdevlerPage() {
  const { parentId, isAdmin } = await requireParent();
  if (!parentId && !isAdmin) redirect("/giris");

  const links = parentId
    ? await prisma.parentStudent.findMany({
        where: { parentId },
        select: { studentId: true, student: { select: { fullName: true } } },
      })
    : [];
  const studentIds = links.map((l: any) => l.studentId);
  const nameById: Record<string, string> = Object.fromEntries(
    links.map((l: any) => [l.studentId, l.student.fullName]),
  );

  const subs = studentIds.length
    ? await prisma.assignmentSubmission.findMany({
        where: { studentId: { in: studentIds } },
        include: {
          assignment: {
            select: {
              title: true,
              dueAt: true,
              teacher: { select: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Ödevler</h1>
          <p className="pd-page-subtitle">Çocuğunuzun ödev durumları.</p>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>
          Henüz ödev yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--pd-bg-2)" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Öğrenci</th>
                <th style={{ padding: 10, textAlign: "left" }}>Ödev</th>
                <th style={{ padding: 10, textAlign: "left" }}>Öğretmen</th>
                <th style={{ padding: 10, textAlign: "left" }}>Son Tarih</th>
                <th style={{ padding: 10, textAlign: "left" }}>Durum</th>
                <th style={{ padding: 10, textAlign: "left" }}>Not</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s: any) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                  <td style={{ padding: 10 }}>{nameById[s.studentId] ?? "—"}</td>
                  <td style={{ padding: 10 }}>{s.assignment.title}</td>
                  <td style={{ padding: 10 }}>{s.assignment.teacher?.user?.name ?? "—"}</td>
                  <td style={{ padding: 10 }}>
                    {s.assignment.dueAt
                      ? new Date(s.assignment.dueAt).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                  <td style={{ padding: 10 }}>
                    <strong>{s.status}</strong>
                  </td>
                  <td style={{ padding: 10 }}>{s.score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
