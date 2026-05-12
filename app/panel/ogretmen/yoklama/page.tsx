import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherAttendance() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const records = await prisma.attendance.findMany({
    where: { lesson: { teacherId: teacher.id } },
    orderBy: { sessionDate: "desc" }, take: 200,
    include: { student: { select: { fullName: true } }, lesson: { select: { title: true, subject: true } } },
  });
  return (
    <>
      <PageHeader title="Yoklama" subtitle={`Son 200 kayıt`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Öğrenci</th><th>Ders</th><th>Durum</th><th>Geç (dk)</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(r.sessionDate)}</td>
                <td>{r.student.fullName}</td>
                <td>{r.lesson?.title ?? r.lesson?.subject ?? "—"}</td>
                <td><Badge tone={r.status === "PRESENT" ? "ok" : r.status === "ABSENT" ? "bad" : "warn"}>{r.status}</Badge></td>
                <td className="od-mono">{r.minutesLate ?? "—"}</td>
              </tr>
            ))}
            {records.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Kayıt yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
