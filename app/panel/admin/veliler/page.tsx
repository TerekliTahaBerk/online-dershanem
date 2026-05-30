import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { ParentQuickDrawer } from "@/components/panel/parents/parent-quick-drawer";
import { StudentQuickDrawer } from "@/components/panel/students/student-quick-drawer";
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
    select: {
      id: true, fullName: true, email: true, phone: true, userId: true,
      students: { select: { student: { select: { id: true, fullName: true, classLevel: true } } } },
    },
  });
  return (
    <>
      <PageHeader
        title="Veliler"
        breadcrumbs={[{ label: "Admin", href: "/panel/admin" }, { label: "Veliler" }]}
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
          <thead>
            <tr>
              <th>Ad</th>
              <th>Hesap</th>
              <th>Email</th>
              <th>Telefon</th>
              <th>Çocuklar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => {
              const childCount = p.students.length;
              return (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/panel/admin/veliler?${q ? `q=${encodeURIComponent(q)}&` : ""}drawer=parent&id=${p.id}`}
                      className="od-cell-user"
                      scroll={false}
                    >
                      <span className="n">{p.fullName}</span>
                    </Link>
                  </td>
                  <td>
                    {p.userId ? <Badge tone="ok">Aktif</Badge> : <Badge tone="neutral">Davet bekliyor</Badge>}
                  </td>
                  <td className="od-muted">{p.email ?? "—"}</td>
                  <td className="od-mono">{p.phone ?? "—"}</td>
                  <td>
                    {childCount === 0 ? (
                      <span className="od-muted">—</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {p.students.slice(0, 3).map((c) => (
                          <Link
                            key={c.student.id}
                            href={`/panel/admin/veliler?${q ? `q=${encodeURIComponent(q)}&` : ""}drawer=student&id=${c.student.id}`}
                            scroll={false}
                          >
                            <Badge tone="teal">{c.student.fullName}{c.student.classLevel ? ` · ${c.student.classLevel}` : ""}</Badge>
                          </Link>
                        ))}
                        {childCount > 3 ? <span className="od-muted" style={{ fontSize: 11 }}>+{childCount - 3}</span> : null}
                      </div>
                    )}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/panel/admin/veliler/${p.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">Düzenle</Link>
                    <form action={deleteParentAction.bind(null, p.id)} style={{ display: "inline" }}>
                      <button type="submit" className="od-btn od-btn-ghost od-btn-sm" style={{ color: "var(--pd-bad)" }}>Sil</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <ParentQuickDrawer />
      <StudentQuickDrawer />
    </>
  );
}
