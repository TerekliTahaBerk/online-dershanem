import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

const fmt = (k: number) => `₺${(k / 100).toLocaleString("tr-TR")}`;

export default async function StudentPackage() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const enrollments = await prisma.studentPackageEnrollment.findMany({
    where: { studentId: student.id }, orderBy: { startsAt: "desc" },
    include: { package: true },
  });
  return (
    <>
      <PageHeader title="Paketim" subtitle={`${enrollments.length} kayıt`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Paket</th><th>Başlangıç</th><th>Bitiş</th><th>Liste fiyatı</th><th>Durum</th></tr></thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id}>
                <td>{e.package.name}</td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(e.startsAt)}</td>
                <td className="od-mono od-muted">{e.endsAt ? new Intl.DateTimeFormat("tr-TR").format(e.endsAt) : "—"}</td>
                <td className="od-mono">{e.listPrice ? fmt(e.listPrice) : "—"}</td>
                <td><Badge tone={e.status === "ACTIVE" ? "ok" : e.status === "CANCELLED" ? "bad" : "neutral"}>{e.status}</Badge></td>
              </tr>
            ))}
            {enrollments.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Aktif paket yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
