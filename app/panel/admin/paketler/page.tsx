import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { togglePackageAction, deletePackageAction } from "./_actions";

export const dynamic = "force-dynamic";

export default async function AdminPackages({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { subjects: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const packages = await prisma.package.findMany({ where, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader
        title="Paketler"
        subtitle={`${packages.length} paket${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Ad, ders…" />
            <ExportButton entity="paketler" />
            <Link href="/panel/admin/paketler/yeni" className="od-btn od-btn-primary od-btn-sm">+ Yeni paket</Link>
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead><tr><th>Ad</th><th>Tür</th><th>Ders sayısı</th><th>Fiyat</th><th>Durum</th><th></th></tr></thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td className="od-mono">{p.lessonCount}</td>
                <td className="od-mono">{p.price ? `₺${(p.price / 100).toLocaleString("tr-TR")}` : "—"}</td>
                <td>{p.isActive ? "Aktif" : "Pasif"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <Link href={`/panel/admin/paketler/${p.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">Düzenle</Link>
                  <form action={togglePackageAction.bind(null, p.id, !p.isActive)} style={{ display: "inline" }}>
                    <button type="submit" className="od-btn od-btn-ghost od-btn-sm">{p.isActive ? "Pasifle" : "Aktifle"}</button>
                  </form>
                  <form action={deletePackageAction.bind(null, p.id)} style={{ display: "inline" }}>
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
