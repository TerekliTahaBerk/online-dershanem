import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function TeacherMessages() {
  const ctx = await requirePanelRole("ogretmen");
  const messages = await prisma.inboxMessage.findMany({
    where: { recipientUserId: ctx.userId },
    orderBy: { createdAt: "desc" }, take: 100,
    include: { createdBy: { select: { name: true, email: true } } },
  });
  return (
    <>
      <PageHeader title="Mesajlar" subtitle={`${messages.length} mesaj`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>Kategori</th><th>Gönderen</th><th>Tarih</th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} style={{ opacity: m.readAt ? 0.6 : 1 }}>
                <td>{m.title}</td>
                <td><Badge tone="neutral">{m.category}</Badge></td>
                <td className="od-muted">{m.createdBy?.name ?? m.createdBy?.email ?? "Sistem"}</td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(m.createdAt)}</td>
              </tr>
            ))}
            {messages.length === 0 ? <tr><td colSpan={4} style={{ padding: 24, textAlign: "center" }} className="od-muted">Mesaj yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
