import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { MaterialsList } from "@/components/panel/materials/materials-list";
import { requireTeacher } from "@/lib/panel-teacher";
import {
  getMaterialsForTeacher,
  type MaterialListFilters,
} from "@/lib/panel/materials";
import type { MaterialType } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { type?: string; q?: string };

export default async function TeacherMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { teacher } = await requireTeacher();
  if (!teacher) redirect("/panel");
  const sp = await searchParams;

  const validTypes: MaterialType[] = ["PDF", "VIDEO", "LINK", "FILE", "NOTE"];
  const typeParam = (sp.type ?? "").toUpperCase() as MaterialType;
  const filterType: MaterialType | null = validTypes.includes(typeParam) ? typeParam : null;

  const filters: MaterialListFilters = {
    type: filterType,
    take: 50,
  };
  let materials = await getMaterialsForTeacher(teacher.id, filters);

  const q = (sp.q ?? "").trim().toLowerCase();
  if (q) {
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q) ||
        (m.subject ?? "").toLowerCase().includes(q) ||
        (m.classroomName ?? "").toLowerCase().includes(q) ||
        (m.courseTitle ?? "").toLowerCase().includes(q),
    );
  }

  const counts = {
    total: materials.length,
    published: materials.filter((m) => m.isPublished).length,
    draft: materials.filter((m) => !m.isPublished).length,
  };

  const typeFilters: { value: "" | MaterialType; label: string }[] = [
    { value: "", label: "Tümü" },
    { value: "PDF", label: "PDF" },
    { value: "VIDEO", label: "Video" },
    { value: "LINK", label: "Bağlantı" },
    { value: "FILE", label: "Dosya" },
    { value: "NOTE", label: "Not" },
  ];

  return (
    <>
      <PageHeader
        title="Materyaller"
        subtitle={`${counts.total} kayıt · ${counts.published} yayında · ${counts.draft} taslak`}
        right={
          <Link href="/panel/ogretmen/materyaller/yeni" className="od-btn od-btn-primary od-btn-sm">
            + Yeni materyal
          </Link>
        }
      />

      <Card padded>
        <form className="od-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            name="q"
            placeholder="Başlık, açıklama, ders ara…"
            defaultValue={sp.q ?? ""}
            className="od-input"
            style={{ minWidth: 220 }}
          />
          <select name="type" defaultValue={filterType ?? ""} className="od-input" style={{ width: 160 }}>
            {typeFilters.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="submit" className="od-btn od-btn-sm">Filtrele</button>
          {(filterType || q) ? (
            <Link href="/panel/ogretmen/materyaller" className="od-btn od-btn-sm od-btn-ghost">
              Temizle
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        <CardHeader title="Liste" subtitle="Oluşturduğunuz veya sınıflarınıza bağlı materyaller" />
        <CardBody>
          {materials.length === 0 ? (
            <EmptyState
              icon="folder"
              title="Henüz materyal yok"
              description="İlk materyalinizi ekleyerek öğrencilerinizle paylaşmaya başlayabilirsiniz."
              action={
                <Link href="/panel/ogretmen/materyaller/yeni" className="od-btn od-btn-primary od-btn-sm">
                  + Yeni materyal
                </Link>
              }
            />
          ) : (
            <MaterialsList materials={materials} />
          )}
        </CardBody>
      </Card>
    </>
  );
}
