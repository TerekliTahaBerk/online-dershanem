import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";

export const dynamic = "force-dynamic";

export default async function TeacherAnnouncements() {
  const ctx = await requirePanelRole("ogretmen");
  const items = await prisma.notification.findMany({
    where: { userId: ctx.userId, type: "SYSTEM" },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  return (
    <>
      <PageHeader title="Duyurular" subtitle={`${items.length} duyuru`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>İçerik</th><th>Tarih</th></tr></thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <td>{n.title}</td>
                <td className="od-muted" style={{ maxWidth: 480 }}>{n.body}</td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(n.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={3} style={{ padding: 24, textAlign: "center" }} className="od-muted">Duyuru yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
