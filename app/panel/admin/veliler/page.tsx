import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { deleteParentAction } from "./_actions";

export const dynamic = "force-dynamic";

export default async function AdminParents({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
        ],
      }
    : {};
  const parents = await prisma.parent.findMany({
    where,
    orderBy: { createdAt: "desc" }, take: 200,
    include: { students: { include: { student: { select: { fullName: true, classLevel: true } } } } },
  });
  return (
    <>
      <PageHeader
        title="Veliler"
        subtitle={`${parents.length} veli${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Ad, email, telefon…" />
            <ExportButton entity="veliler" />
            <Link href="/panel/admin/veliler/yeni" className="od-btn od-btn-primary od-btn-sm">+ Yeni veli</Link>
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead><tr><th>Ad</th><th>Email</th><th>Telefon</th><th>Çocukları</th><th></th></tr></thead>
          <tbody>
            {parents.map((p) => (
              <tr key={p.id}>
                <td>{p.fullName}</td>
                <td className="od-muted">{p.email ?? "—"}</td>
                <td className="od-mono">{p.phone ?? "—"}</td>
                <td>{p.students.map((c) => c.student.fullName).join(", ") || "—"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <Link href={`/panel/admin/veliler/${p.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">Düzenle</Link>
                  <form action={deleteParentAction.bind(null, p.id)} style={{ display: "inline" }}>
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
