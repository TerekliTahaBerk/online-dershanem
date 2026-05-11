import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Geldi",
  ABSENT: "Gelmedi",
  LATE: "Geç",
  EXCUSED: "Mazeretli",
};

export default async function VeliDevamsizlikPage() {
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

  const records = studentIds.length
    ? await prisma.attendance.findMany({
        where: { studentId: { in: studentIds } },
        include: { lesson: { select: { title: true, scheduledAt: true } } },
        orderBy: { sessionDate: "desc" },
        take: 200,
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Devamsızlık</h1>
          <p className="pd-page-subtitle">Çocuğunuzun yoklama kayıtları.</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>
          Henüz yoklama kaydı yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--pd-bg-2)" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Öğrenci</th>
                <th style={{ padding: 10, textAlign: "left" }}>Ders</th>
                <th style={{ padding: 10, textAlign: "left" }}>Tarih</th>
                <th style={{ padding: 10, textAlign: "left" }}>Durum</th>
                <th style={{ padding: 10, textAlign: "left" }}>Not</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                  <td style={{ padding: 10 }}>{nameById[r.studentId] ?? "—"}</td>
                  <td style={{ padding: 10 }}>{r.lesson?.title ?? "Ders"}</td>
                  <td style={{ padding: 10 }}>
                    {new Date(r.sessionDate).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ padding: 10 }}>
                    <strong>{STATUS_LABEL[r.status] ?? r.status}</strong>
                  </td>
                  <td style={{ padding: 10, color: "var(--pd-muted-2)" }}>{r.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
