import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { markNotificationReadAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function StudentNotifications() {
  const ctx = await requirePanelRole("ogrenci");
  const items = await prisma.inboxMessage.findMany({
    where: { recipientUserId: ctx.userId },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return (
    <>
      <PageHeader title="Bildirimler" subtitle={`${items.length} bildirim · ${items.filter((m) => !m.readAt).length} okunmamış`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>Mesaj</th><th>Öncelik</th><th>Tarih</th><th></th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} style={{ opacity: m.readAt ? 0.55 : 1 }}>
                <td>{!m.readAt ? <span style={{ color: "var(--pd-accent)", marginRight: 4 }}>●</span> : null}{m.title}</td>
                <td className="od-muted" style={{ maxWidth: 360 }}>{m.body}</td>
                <td><Badge tone={m.priority === "URGENT" ? "bad" : m.priority === "HIGH" ? "warn" : "neutral"}>{m.priority}</Badge></td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(m.createdAt)}</td>
                <td>
                  {!m.readAt ? (
                    <form action={markNotificationReadAction.bind(null, m.id)} style={{ display: "inline" }}>
                      <button type="submit" className="od-btn od-btn-ghost od-btn-sm">Okundu</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Bildirim yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
