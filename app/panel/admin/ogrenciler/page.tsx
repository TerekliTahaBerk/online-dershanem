import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";

export const dynamic = "force-dynamic";

export default async function AdminStudents({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePanelRole("admin");
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { city: { contains: q, mode: "insensitive" as const } },
          { schoolName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const students = await prisma.student.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true, fullName: true, phone: true, email: true, classLevel: true,
      examType: true, status: true, city: true, updatedAt: true,
    },
  });
  return (
    <>
      <PageHeader
        title="Öğrenciler"
        subtitle={`${students.length} öğrenci${q ? ` · "${q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Ad, email, telefon, şehir, okul…" />
            <ExportButton entity="ogrenciler" />
            <Link href="/panel/admin/ogrenciler/yeni" className="od-btn od-btn-primary od-btn-sm">+ Yeni öğrenci</Link>
          </div>
        }
      />
      <Card>
        <table className="od-table">
          <thead>
            <tr>
              <th>Ad Soyad</th><th>Telefon</th><th>Email</th>
              <th>Sınıf</th><th>Sınav</th><th>Şehir</th><th>Durum</th><th>Güncel</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/panel/admin/ogrenciler/${s.id}`} className="od-cell-user">
                    <span className="n">{s.fullName}</span>
                  </Link>
                </td>
                <td className="od-mono">{s.phone}</td>
                <td className="od-muted">{s.email ?? "—"}</td>
                <td>{s.classLevel ?? "—"}</td>
                <td>{s.examType ?? "—"}</td>
                <td>{s.city ?? "—"}</td>
                <td><Badge tone={s.status === "ACTIVE" ? "ok" : s.status === "AT_RISK" ? "bad" : s.status === "NEW" ? "teal" : "neutral"}>{s.status}</Badge></td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(s.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
