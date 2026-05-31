/**
 * Phase 3 / Session 7 — Admin Classroom list (operational view).
 *
 * URL-driven filters + saved views (scope=classrooms).
 *
 * Filters:
 *   q          — name / branch substring
 *   level      — LGS | TYT | AYT | YDT | MIXED
 *   active     — yes | no
 *   teacher    — yes | no                            (has any ClassroomTeacher)
 *   student    — yes | no                            (has any ClassroomStudent)
 *   capacity   — full | open                         (students vs capacity)
 *   upcoming   — yes | no                            (any lesson in next 14d)
 *   homework   — active                              (has any PUBLISHED Assignment)
 *   material   — none                                (no Material rows)
 */
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { QuickFilters } from "@/components/panel/ui/quick-filters";
import { SavedViewsBar } from "@/components/panel/ui/saved-views";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  level?: string;
  active?: string;
  teacher?: string;
  student?: string;
  capacity?: string;
  upcoming?: string;
  homework?: string;
  material?: string;
};

export default async function AdminClasses({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;

  const now = new Date();
  const in14d = new Date(now.getTime() + 14 * 24 * 3600 * 1000);

  const where: Prisma.ClassroomWhereInput = {};
  const and: Prisma.ClassroomWhereInput[] = [];

  if (sp.q) {
    and.push({
      OR: [
        { name: { contains: sp.q, mode: "insensitive" } },
        { branch: { contains: sp.q, mode: "insensitive" } },
      ],
    });
  }
  if (sp.level && ["LGS", "TYT", "AYT", "YDT", "MIXED"].includes(sp.level)) {
    where.level = sp.level as Prisma.ClassroomWhereInput["level"];
  }
  if (sp.active === "yes") where.isActive = true;
  if (sp.active === "no") where.isActive = false;
  if (sp.teacher === "yes") and.push({ teachers: { some: {} } });
  if (sp.teacher === "no") and.push({ teachers: { none: {} } });
  if (sp.student === "yes") and.push({ students: { some: {} } });
  if (sp.student === "no") and.push({ students: { none: {} } });
  if (sp.upcoming === "yes") {
    and.push({ lessons: { some: { scheduledAt: { gte: now, lte: in14d } } } });
  }
  if (sp.upcoming === "no") {
    and.push({ lessons: { none: { scheduledAt: { gte: now, lte: in14d } } } });
  }
  if (sp.homework === "active") {
    and.push({ assignments: { some: { status: "PUBLISHED" } } });
  }
  if (sp.material === "none") {
    and.push({ materials: { none: {} } });
  }
  if (and.length > 0) where.AND = and;

  const rows = await prisma.classroom.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          lessons: true,
          assignments: true,
          materials: true,
        },
      },
      lessons: {
        where: { scheduledAt: { gte: now, lte: in14d } },
        select: { id: true },
        take: 1,
      },
      assignments: {
        where: { status: "PUBLISHED" },
        select: { id: true },
        take: 1,
      },
    },
  });

  // Capacity filter applied in-memory (cheap, post-query) since Prisma can't
  // express "students.length >= capacity" directly without raw SQL.
  const filtered = rows.filter((c) => {
    if (sp.capacity === "full") return c._count.students >= c.capacity;
    if (sp.capacity === "open") return c._count.students < c.capacity;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Sınıflar"
        subtitle={`${filtered.length} sınıf`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <SearchInput placeholder="Ad, şube…" />
            <ExportButton entity="siniflar" />
            <Link
              href="/panel/admin/siniflar/yeni"
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Yeni sınıf
            </Link>
          </div>
        }
      />

      <SavedViewsBar
        scope="classrooms"
        presets={[
          { name: "Tüm sınıflar", filter: {} },
          { name: "Aktif sınıflar", filter: { active: "yes" } },
          { name: "Öğretmensiz", filter: { teacher: "no", active: "yes" } },
          { name: "Öğrencisiz", filter: { student: "no", active: "yes" } },
          { name: "Yakında dersi olanlar", filter: { upcoming: "yes" } },
          { name: "Aktif ödevli", filter: { homework: "active" } },
          { name: "Materyali olmayanlar", filter: { material: "none" } },
          { name: "Dolu sınıflar", filter: { capacity: "full" } },
        ]}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <QuickFilters
          param="level"
          label="Seviye"
          options={[
            { value: "", label: "Hepsi" },
            { value: "LGS", label: "LGS" },
            { value: "TYT", label: "TYT" },
            { value: "AYT", label: "AYT" },
            { value: "YDT", label: "YDT" },
            { value: "MIXED", label: "MIXED" },
          ]}
        />
        <QuickFilters
          param="active"
          label="Durum"
          options={[
            { value: "", label: "Hepsi" },
            { value: "yes", label: "Aktif" },
            { value: "no", label: "Pasif" },
          ]}
        />
        <QuickFilters
          param="teacher"
          label="Öğretmen"
          options={[
            { value: "", label: "Hepsi" },
            { value: "yes", label: "Var" },
            { value: "no", label: "Yok" },
          ]}
        />
        <QuickFilters
          param="student"
          label="Öğrenci"
          options={[
            { value: "", label: "Hepsi" },
            { value: "yes", label: "Var" },
            { value: "no", label: "Yok" },
          ]}
        />
        <QuickFilters
          param="capacity"
          label="Kapasite"
          options={[
            { value: "", label: "Hepsi" },
            { value: "open", label: "Açık" },
            { value: "full", label: "Dolu" },
          ]}
        />
        <QuickFilters
          param="upcoming"
          label="14g ders"
          options={[
            { value: "", label: "Hepsi" },
            { value: "yes", label: "Var" },
            { value: "no", label: "Yok" },
          ]}
        />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="od-muted" style={{ padding: 16, fontSize: 13 }}>
            Filtre/aramaya uyan sınıf yok.
          </div>
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Sınıf</th>
                <th>Şube</th>
                <th>Seviye</th>
                <th>Öğrenci</th>
                <th>Öğretmen</th>
                <th>14g ders</th>
                <th>Aktif ödev</th>
                <th>Materyal</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isFull = c._count.students >= c.capacity;
                const hasUpcoming = c.lessons.length > 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/panel/admin/siniflar/${c.id}`}
                        style={{ fontWeight: 600 }}
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="od-muted">{c.branch ?? "—"}</td>
                    <td>
                      <Badge tone="neutral">{c.level}</Badge>
                    </td>
                    <td className="od-mono">
                      <span style={{ color: isFull ? "var(--pd-bad)" : undefined }}>
                        {c._count.students}/{c.capacity}
                      </span>
                    </td>
                    <td className="od-mono">
                      {c._count.teachers === 0 ? (
                        <Badge tone="warn">0</Badge>
                      ) : (
                        c._count.teachers
                      )}
                    </td>
                    <td className="od-mono">
                      {hasUpcoming ? (
                        <Badge tone="teal">var</Badge>
                      ) : (
                        <span className="od-muted">—</span>
                      )}
                    </td>
                    <td className="od-mono">
                      {c.assignments.length > 0 ? c._count.assignments : <span className="od-muted">—</span>}
                    </td>
                    <td className="od-mono">
                      {c._count.materials === 0 ? (
                        <span className="od-muted">—</span>
                      ) : (
                        c._count.materials
                      )}
                    </td>
                    <td>
                      {c.isActive ? (
                        <Badge tone="ok">Aktif</Badge>
                      ) : (
                        <Badge tone="neutral">Pasif</Badge>
                      )}
                    </td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <Link
                        href={`/panel/admin/siniflar/${c.id}`}
                        className="od-btn od-btn-ghost od-btn-sm"
                      >
                        Detay
                      </Link>
                      <Link
                        href={`/panel/admin/siniflar/${c.id}/duzenle`}
                        className="od-btn od-btn-ghost od-btn-sm"
                      >
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
