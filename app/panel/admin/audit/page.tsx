import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminAudit() {
  await requirePanelRole("admin");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });
  return (
    <>
      <PageHeader title="Audit logs" subtitle={`Son ${logs.length} kayıt`} />
      <Card>
        <table className="od-table">
          <thead><tr><th>Tarih</th><th>Aktör</th><th>Eylem</th><th>Tür</th><th>ID</th><th>Özet</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(l.createdAt)}</td>
                <td>{l.actor?.name ?? l.actor?.email ?? <span className="od-muted">{l.actorType}</span>}</td>
                <td><Badge tone="teal">{l.action}</Badge></td>
                <td className="od-muted">{l.entityType}</td>
                <td className="od-mono od-muted">{l.entityId.slice(0, 8)}</td>
                <td>{l.summary ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 ? <tr><td colSpan={6} className="od-muted" style={{ padding: 24, textAlign: "center" }}>Kayıt yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
