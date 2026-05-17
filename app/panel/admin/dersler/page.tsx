import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { subject: { contains: q, mode: "insensitive" as const } },
          { levelLabel: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const courses = await prisma.course.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { title: "asc" }],
    include: {
      defaultTeacher: { select: { fullName: true } },
      defaultClassroom: { select: { name: true, branch: true } },
      _count: { select: { lessons: true, modules: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Dersler (Tanımlar)"
        subtitle={`${courses.length} ders · Curriculum / şablon`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Ad, branş, seviye…" />
            <Link href="/panel/admin/ders-programi" className="od-btn od-btn-ghost od-btn-sm">
              Ders programı →
            </Link>
            <Link href="/panel/admin/dersler/yeni" className="od-btn od-btn-primary od-btn-sm">
              + Yeni ders
            </Link>
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead>
            <tr>
              <th>Ders</th>
              <th>Branş</th>
              <th>Seviye</th>
              <th>Öğretmen</th>
              <th>Sınıf</th>
              <th>Modül</th>
              <th>Planlanan</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/panel/admin/dersler/${c.id}`} className="od-link">
                    {c.title}
                  </Link>
                  <div className="od-mono od-muted" style={{ fontSize: 10 }}>{c.slug}</div>
                </td>
                <td>{c.subject}</td>
                <td className="od-muted">{c.levelLabel ?? "—"}</td>
                <td>{c.defaultTeacher?.fullName ?? <span className="od-muted">—</span>}</td>
                <td>
                  {c.defaultClassroom
                    ? `${c.defaultClassroom.name}${c.defaultClassroom.branch ? " · " + c.defaultClassroom.branch : ""}`
                    : <span className="od-muted">—</span>}
                </td>
                <td className="od-mono">{c._count.modules}</td>
                <td className="od-mono">{c._count.lessons}</td>
                <td>
                  {c.isActive ? (
                    <Badge tone={c.status === "PUBLISHED" ? "ok" : "teal"}>{c.status}</Badge>
                  ) : (
                    <Badge tone="neutral">Pasif</Badge>
                  )}
                </td>
                <td>
                  <Link href={`/panel/admin/dersler/${c.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
            {courses.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: "center" }} className="od-muted">
                  Henüz ders tanımı yok. <Link href="/panel/admin/dersler/yeni" className="od-link">+ Yeni ders</Link> ile başlayın.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
