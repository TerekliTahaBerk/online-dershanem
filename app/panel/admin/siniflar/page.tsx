import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { deleteClassroomAction } from "./_actions";

export const dynamic = "force-dynamic";

export default async function AdminClasses({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { branch: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const classes = await prisma.classroom.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true, teachers: true, lessons: true } } },
  });
  return (
    <>
      <PageHeader
        title="Sınıflar"
        subtitle={`${classes.length} sınıf${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Ad, şube…" />
            <ExportButton entity="siniflar" />
            <Link href="/panel/admin/siniflar/yeni" className="od-btn od-btn-primary od-btn-sm">+ Yeni sınıf</Link>
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead><tr><th>Sınıf</th><th>Şube</th><th>Öğrenci</th><th>Öğretmen</th><th>Ders</th><th></th></tr></thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="od-muted">{c.branch ?? "—"}</td>
                <td className="od-mono">{c._count.students}</td>
                <td className="od-mono">{c._count.teachers}</td>
                <td className="od-mono">{c._count.lessons}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <Link href={`/panel/admin/siniflar/${c.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">Düzenle</Link>
                  <form action={deleteClassroomAction.bind(null, c.id)} style={{ display: "inline" }}>
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
