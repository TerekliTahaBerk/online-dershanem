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
      <PageHeader
        title="Bildirimler"
        subtitle={`${items.length} bildirim · ${items.filter((m) => !m.readAt).length} okunmamış`}
        breadcrumbs={[{ label: "Öğrenci", href: "/panel/ogrenci" }, { label: "Bildirimler" }]}
      />
      {items.length === 0 ? (
        <Card><div style={{ padding: 24, textAlign: "center" }} className="od-muted">Bildirim yok.</div></Card>
      ) : (
        <ul className="od-inbox-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((m) => {
            const isUnread = !m.readAt;
            return (
              <li key={m.id} className={`od-inbox-item${isUnread ? " od-inbox-unread" : ""}`}>
                <span className="od-inbox-accent" aria-hidden />
                <div style={{ minWidth: 0 }}>
                  <div className="od-inbox-title">{m.title}</div>
                  {m.body ? <div className="od-inbox-body">{m.body}</div> : null}
                  <div className="od-inbox-meta">
                    <Badge tone={m.priority === "URGENT" ? "bad" : m.priority === "HIGH" ? "warn" : "neutral"}>{m.priority}</Badge>
                    <span className="od-mono">· {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(m.createdAt)}</span>
                  </div>
                </div>
                <div className="od-inbox-actions">
                  {isUnread ? (
                    <form action={markNotificationReadAction.bind(null, m.id)}>
                      <button type="submit" className="od-btn ghost sm">Okundu</button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
