import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherAssignments() {
  const { teacher } = await requireTeacher();
  if (!teacher) return <Card><EmptyState icon="user" title="Öğretmen profili yok" /></Card>;
  const list = await prisma.assignment.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" }, take: 100,
    include: {
      classroom: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
  });
  return (
    <>
      <PageHeader
        title="Ödevler"
        subtitle={`${list.length} ödev`}
        breadcrumbs={[{ label: "Öğretmen", href: "/panel/ogretmen" }, { label: "Ödevler" }]}
        right={<Link href="/panel/ogretmen/odevler/yeni" className="od-btn dark sm">+ Yeni ödev</Link>}
      />
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>Sınıf</th><th>Ders</th><th>Son teslim</th><th>Gönderim</th><th>Durum</th><th></th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/panel/ogretmen/odevler/${a.id}`} className="od-link">{a.title}</Link></td>
                <td>{a.classroom?.name ?? "Bireysel"}</td>
                <td>{a.subject ?? "—"}</td>
                <td className="od-mono od-muted">{a.dueAt ? new Intl.DateTimeFormat("tr-TR").format(a.dueAt) : "—"}</td>
                <td className="od-mono">{a._count.submissions}</td>
                <td><Badge tone={a.status === "PUBLISHED" ? "ok" : a.status === "CLOSED" ? "neutral" : "warn"}>{a.status}</Badge></td>
                <td><Link href={`/panel/ogretmen/odevler/${a.id}`} className="od-btn ghost sm">Aç</Link></td>
              </tr>
            ))}
            {list.length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: "center" }} className="od-muted">Henüz ödev yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
