import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminPermissions() {
  await requirePanelRole("admin");
  const [permissions, rolePerms] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] }),
    prisma.rolePermission.findMany({ include: { permission: { select: { key: true } } } }),
  ]);
  const grouped = new Map<string, typeof permissions>();
  for (const p of permissions) {
    if (!grouped.has(p.category)) grouped.set(p.category, []);
    grouped.get(p.category)!.push(p);
  }
  const byKey = new Map<string, string[]>();
  for (const rp of rolePerms) {
    const k = rp.permission.key;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(rp.role);
  }
  return (
    <>
      <PageHeader title="Yetkiler" subtitle={`${permissions.length} izin tanımlı`} />
      {[...grouped.entries()].map(([cat, list]) => (
        <Card key={cat} style={{ marginBottom: 12 }}>
          <table className="od-table">
            <thead><tr><th>{cat}</th><th>Açıklama</th><th>Roller</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="od-mono">{p.key}</td>
                  <td className="od-muted">{p.description ?? "—"}</td>
                  <td>{(byKey.get(p.key) ?? []).map((r) => <Badge key={r} tone="accent">{r}</Badge>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
      {permissions.length === 0 ? <Card><div style={{ padding: 24, textAlign: "center" }} className="od-muted">Henüz izin tanımı seed edilmemiş.</div></Card> : null}
    </>
  );
}
