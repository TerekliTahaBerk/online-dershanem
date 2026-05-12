import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { deleteAssignmentAction } from "./_actions";

export const dynamic = "force-dynamic";

export default async function AdminAssignments({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { subject: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const list = await prisma.assignment.findMany({
    where,
    orderBy: { createdAt: "desc" }, take: 100,
    include: { _count: { select: { submissions: true } } },
  });
  return (
    <>
      <PageHeader
        title="Ödevler"
        subtitle={`${list.length} ödev${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Başlık, ders…" />
            <ExportButton entity="odevler" />
            <Link href="/panel/admin/odevler/yeni" className="od-btn od-btn-primary od-btn-sm">+ Yeni ödev</Link>
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>Ders</th><th>Son Teslim</th><th>Gönderim</th><th></th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.subject ?? "—"}</td>
                <td className="od-mono od-muted">{a.dueAt ? new Intl.DateTimeFormat("tr-TR").format(a.dueAt) : "—"}</td>
                <td className="od-mono">{a._count.submissions}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <Link href={`/panel/admin/odevler/${a.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">Düzenle</Link>
                  <form action={deleteAssignmentAction.bind(null, a.id)} style={{ display: "inline" }}>
                    <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Sil</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
