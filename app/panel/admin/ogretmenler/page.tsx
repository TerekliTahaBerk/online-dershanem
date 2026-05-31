import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";

export const dynamic = "force-dynamic";

export default async function AdminTeachers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { subjects: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const teachers = await prisma.teacher.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmenler" },
        ]}
        title="Öğretmenler"
        subtitle={`${teachers.length} öğretmen${q ? ` · "${q}"` : ""}`}
        right={
          <div className="od-list-toolbar">
            <SearchInput placeholder="Ad, email, branş…" />
            <ExportButton entity="ogretmenler" />
            <Link href="/panel/admin/ogretmenler/yeni" className="od-btn dark sm">+ Yeni öğretmen</Link>
          </div>
        }
      />
      <Card>
        <table className="od-table premium-table">
          <thead><tr><th>Ad</th><th>Email</th><th>Branş</th><th>Telefon</th><th>Durum</th><th></th></tr></thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr><td colSpan={6} className="od-empty-soft">Öğretmen bulunamadı.</td></tr>
            ) : null}
            {teachers.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.fullName}</td>
                <td className="od-muted">{t.email ?? "—"}</td>
                <td>{t.subjects}</td>
                <td className="od-mono">{t.phone ?? "—"}</td>
                <td><Badge tone={t.status === "ACTIVE" ? "ok" : "neutral"}>{t.status}</Badge></td>
                <td><Link href={`/panel/admin/ogretmenler/${t.id}/duzenle`} className="od-btn ghost sm">Düzenle</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
