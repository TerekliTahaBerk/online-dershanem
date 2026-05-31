import { redirect } from "next/navigation";

import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { MaterialsList } from "@/components/panel/materials/materials-list";
import { requireStudent } from "@/lib/panel-student";
import { getMaterialsForStudent } from "@/lib/panel/materials";
import type { MaterialType } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { type?: string; q?: string; recent?: string };

export default async function StudentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { student } = await requireStudent();
  if (!student) redirect("/panel");
  const sp = await searchParams;

  const validTypes: MaterialType[] = ["PDF", "VIDEO", "LINK", "FILE", "NOTE"];
  const typeParam = (sp.type ?? "").toUpperCase() as MaterialType;
  const filterType: MaterialType | null = validTypes.includes(typeParam) ? typeParam : null;

  const recent = sp.recent === "7" ? 7 : sp.recent === "30" ? 30 : null;

  let materials = await getMaterialsForStudent(student.id, {
    type: filterType,
    recentDays: recent,
    take: 60,
  });

  const q = (sp.q ?? "").trim().toLowerCase();
  if (q) {
    materials = materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q) ||
        (m.subject ?? "").toLowerCase().includes(q) ||
        (m.courseTitle ?? "").toLowerCase().includes(q),
    );
  }

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
        title="Kütüphane"
        subtitle="Sınıflarınız ve derslerinizle paylaşılan materyaller"
        right={<Badge tone="accent">{materials.length} kayıt</Badge>}
      />

      <Card padded>
        <form className="od-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            name="q"
            placeholder="Başlık, ders ara…"
            defaultValue={sp.q ?? ""}
            className="od-input"
            style={{ minWidth: 220 }}
          />
          <select name="type" defaultValue={filterType ?? ""} className="od-input" style={{ width: 150 }}>
            {typeFilters.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select name="recent" defaultValue={recent ? String(recent) : ""} className="od-input" style={{ width: 160 }}>
            <option value="">Tüm zamanlar</option>
            <option value="7">Son 7 gün</option>
            <option value="30">Son 30 gün</option>
          </select>
          <button type="submit" className="od-btn od-btn-sm">Filtrele</button>
        </form>
      </Card>

      <Card>
        <CardBody>
          <MaterialsList
            materials={materials}
            emptyTitle="Henüz materyal yok"
            emptyDescription="Sınıf veya ders öğretmeniniz materyal paylaştığında burada görünür."
          />
        </CardBody>
      </Card>
    </>
  );
}
