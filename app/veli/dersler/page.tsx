import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VeliDerslerPage() {
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

  const lessons = studentIds.length
    ? await prisma.lesson.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { scheduledAt: "desc" },
        take: 100,
        include: {
          teacher: { select: { user: { select: { name: true } } } },
        },
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <h1 className="pd-page-title">Dersler</h1>
          <p className="pd-page-subtitle">Çocuğunuzun planlanan ve geçmiş dersleri.</p>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="pd-card" style={{ padding: 16, color: "var(--pd-muted-2)" }}>
          Henüz ders kaydı yok.
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--pd-bg-2)" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Tarih</th>
                <th style={{ padding: 10, textAlign: "left" }}>Öğrenci</th>
                <th style={{ padding: 10, textAlign: "left" }}>Ders</th>
                <th style={{ padding: 10, textAlign: "left" }}>Öğretmen</th>
                <th style={{ padding: 10, textAlign: "left" }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((l: any) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
                  <td style={{ padding: 10 }}>
                    {new Date(l.scheduledAt).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td style={{ padding: 10 }}>{l.studentId ? nameById[l.studentId] ?? "—" : "—"}</td>
                  <td style={{ padding: 10 }}>{l.title ?? "Ders"}</td>
                  <td style={{ padding: 10 }}>{l.teacher?.user?.name ?? "—"}</td>
                  <td style={{ padding: 10 }}>
                    <strong>{l.status}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
