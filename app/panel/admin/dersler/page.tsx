import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { QuickFilters } from "@/components/panel/ui/quick-filters";
import { SavedViewsBar } from "@/components/panel/ui/saved-views";
import { Pagination, parsePagination } from "@/components/panel/ui/pagination";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function pickStr(sp: SP, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function DerslerListPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;

  const q = pickStr(sp, "q").trim();
  const status = pickStr(sp, "status");
  const active = pickStr(sp, "active");
  const subjectFilter = pickStr(sp, "subject");
  const examType = pickStr(sp, "examType");
  const hasClassroom = pickStr(sp, "hasClassroom");
  const hasTeacher = pickStr(sp, "hasTeacher");
  const hasUpcoming = pickStr(sp, "hasUpcomingLesson");
  const hasMaterial = pickStr(sp, "hasMaterial");
  const hasHomeworkFlag = pickStr(sp, "hasHomework");

  const { page, pageSize, skip } = parsePagination(sp, { pageSize: 25, maxPageSize: 100 });

  const where: Prisma.CourseWhereInput = {};
  const ands: Prisma.CourseWhereInput[] = [];

  if (q) {
    ands.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED") {
    ands.push({ status });
  }
  if (active === "true") ands.push({ isActive: true });
  if (active === "false") ands.push({ isActive: false });
  if (subjectFilter) ands.push({ subject: subjectFilter });
  if (examType) ands.push({ examType });
  if (hasClassroom === "true") ands.push({ defaultClassroomId: { not: null } });
  if (hasClassroom === "false") ands.push({ defaultClassroomId: null });
  if (hasTeacher === "true") ands.push({ defaultTeacherId: { not: null } });
  if (hasTeacher === "false") ands.push({ defaultTeacherId: null });
  if (hasMaterial === "true") {
    ands.push({ materials: { some: { isArchived: false } } });
  } else if (hasMaterial === "false") {
    ands.push({ materials: { none: { isArchived: false } } });
  }
  if (hasUpcoming === "true") {
    ands.push({
      lessons: {
        some: {
          scheduledAt: { gte: new Date() },
          status: { not: "CANCELLED" },
        },
      },
    });
  } else if (hasUpcoming === "false") {
    ands.push({
      lessons: {
        none: {
          scheduledAt: { gte: new Date() },
          status: { not: "CANCELLED" },
        },
      },
    });
  }
  if (ands.length) where.AND = ands;

  const [total, rows, subjectsRaw] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { subject: "asc" }, { title: "asc" }],
      skip,
      take: pageSize,
      include: {
        defaultTeacher: { select: { id: true, fullName: true } },
        defaultClassroom: { select: { id: true, name: true } },
        _count: { select: { lessons: true, packageCourses: true, materials: true } },
      },
    }),
    prisma.course.findMany({
      distinct: ["subject"],
      orderBy: { subject: "asc" },
      select: { subject: true },
      take: 200,
    }),
  ]);

  const courseIds = rows.map((r) => r.id);
  const subjectsForRows = Array.from(new Set(rows.map((r) => r.subject)));

  const [upcomingByCourse, hwBySubject] = await Promise.all([
    courseIds.length
      ? prisma.lesson.groupBy({
          by: ["courseId"],
          where: {
            courseId: { in: courseIds },
            scheduledAt: { gte: new Date() },
            status: { not: "CANCELLED" },
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as Array<{ courseId: string | null; _count: { _all: number } }>),
    subjectsForRows.length
      ? prisma.assignment.groupBy({
          by: ["subject"],
          where: {
            subject: { in: subjectsForRows },
            status: "PUBLISHED",
          },
          _count: { _all: true },
        })
      : Promise.resolve([] as Array<{ subject: string; _count: { _all: number } }>),
  ]);

  const upcomingMap = new Map<string, number>();
  for (const r of upcomingByCourse) {
    if (r.courseId) upcomingMap.set(r.courseId, r._count._all);
  }
  const hwMap = new Map<string, number>();
  for (const r of hwBySubject) {
    if (r.subject) hwMap.set(r.subject, r._count._all);
  }

  let displayRows = rows;
  if (hasHomeworkFlag === "true") {
    displayRows = rows.filter((r) => (hwMap.get(r.subject) ?? 0) > 0);
  } else if (hasHomeworkFlag === "false") {
    displayRows = rows.filter((r) => (hwMap.get(r.subject) ?? 0) === 0);
  }

  const subjectOpts = subjectsRaw
    .map((s) => s.subject)
    .filter(Boolean)
    .map((s) => ({ value: s, label: s }));

  return (
    <>
      <PageHeader
        title="Dersler"
        meta={<span className="od-muted">{total} kayıt</span>}
        breadcrumbs={[{ label: "Yönetim", href: "/panel/admin" }, { label: "Dersler" }]}
        right={
          <Link href="/panel/admin/dersler/yeni" className="od-btn od-btn-primary od-btn-sm">
            + Yeni ders
          </Link>
        }
      />

      <SavedViewsBar
        scope="courses"
        excludeKeys={["page"]}
        presets={[
          { name: "Tümü", filter: {} },
          { name: "Aktif yayınlar", filter: { status: "PUBLISHED", active: "true" } },
          { name: "Taslak", filter: { status: "DRAFT" } },
          { name: "Pasif / Arşiv", filter: { active: "false" } },
          { name: "Sınıfsız dersler", filter: { hasClassroom: "false", active: "true" } },
          { name: "Öğretmensiz dersler", filter: { hasTeacher: "false", active: "true" } },
          { name: "Materyalsiz dersler", filter: { hasMaterial: "false", active: "true" } },
          { name: "Ödevsiz dersler", filter: { hasHomework: "false", active: "true" } },
        ]}
      />

      <div style={{ marginBottom: 12 }}>
        <SearchInput paramName="q" placeholder="Başlık, branş veya slug..." />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <QuickFilters
          param="status"
          label="Durum"
          options={[
            { value: "PUBLISHED", label: "Yayında", tone: "ok" },
            { value: "DRAFT", label: "Taslak", tone: "warn" },
            { value: "ARCHIVED", label: "Arşiv", tone: "neutral" },
          ]}
        />
        <QuickFilters
          param="active"
          label="Aktif"
          options={[
            { value: "true", label: "Aktif", tone: "ok" },
            { value: "false", label: "Pasif", tone: "neutral" },
          ]}
        />
        {subjectOpts.length > 0 ? (
          <QuickFilters param="subject" label="Branş" options={subjectOpts.slice(0, 12)} />
        ) : null}
        <QuickFilters
          param="hasClassroom"
          label="Sınıf"
          options={[
            { value: "true", label: "Atanmış", tone: "ok" },
            { value: "false", label: "Yok", tone: "warn" },
          ]}
        />
        <QuickFilters
          param="hasTeacher"
          label="Öğretmen"
          options={[
            { value: "true", label: "Atanmış", tone: "ok" },
            { value: "false", label: "Yok", tone: "warn" },
          ]}
        />
        <QuickFilters
          param="hasUpcomingLesson"
          label="Yakın ders"
          options={[
            { value: "true", label: "Var", tone: "ok" },
            { value: "false", label: "Yok", tone: "neutral" },
          ]}
        />
        <QuickFilters
          param="hasMaterial"
          label="Materyal"
          options={[
            { value: "true", label: "Var", tone: "ok" },
            { value: "false", label: "Yok", tone: "warn" },
          ]}
        />
        <QuickFilters
          param="hasHomework"
          label="Ödev"
          options={[
            { value: "true", label: "Var", tone: "ok" },
            { value: "false", label: "Yok", tone: "neutral" },
          ]}
        />
      </div>

      <Card>
        <CardBody>
          {displayRows.length === 0 ? (
            <EmptyState
              title="Eşleşen ders yok"
              description="Filtreleri temizleyin veya yeni bir ders oluşturun."
            />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Branş</th>
                  <th>Yayın</th>
                  <th>Default sınıf</th>
                  <th>Default öğretmen</th>
                  <th>Ders</th>
                  <th>Yakın</th>
                  <th>Ödev</th>
                  <th>Materyal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((c) => {
                  const upcoming = upcomingMap.get(c.id) ?? 0;
                  const hw = hwMap.get(c.subject) ?? 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/panel/admin/dersler/${c.id}`} className="od-link">
                          {c.title}
                        </Link>
                        {c.examType ? (
                          <>
                            {" "}<Badge tone="teal">{c.examType}</Badge>
                          </>
                        ) : null}
                      </td>
                      <td>{c.subject}</td>
                      <td>
                        {c.isActive ? (
                          <Badge tone={c.status === "PUBLISHED" ? "ok" : c.status === "DRAFT" ? "warn" : "neutral"}>
                            {c.status}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Pasif</Badge>
                        )}
                      </td>
                      <td>
                        {c.defaultClassroom ? (
                          <Link href={`/panel/admin/siniflar/${c.defaultClassroom.id}`} className="od-link">
                            {c.defaultClassroom.name}
                          </Link>
                        ) : (
                          <Badge tone="warn">Yok</Badge>
                        )}
                      </td>
                      <td>
                        {c.defaultTeacher ? (
                          <Link href={`/panel/admin/ogretmenler/${c.defaultTeacher.id}/duzenle`} className="od-link">
                            {c.defaultTeacher.fullName}
                          </Link>
                        ) : (
                          <Badge tone="warn">Yok</Badge>
                        )}
                      </td>
                      <td className="od-mono">{c._count.lessons}</td>
                      <td className="od-mono">{upcoming}</td>
                      <td className="od-mono">{hw}</td>
                      <td className="od-mono">{c._count.materials}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link href={`/panel/admin/dersler/${c.id}`} className="od-btn od-btn-ghost od-btn-sm">
                            Detay
                          </Link>
                          <Link href={`/panel/admin/dersler/${c.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">
                            Düzenle
                          </Link>
                          <Link
                            href={`/panel/admin/ders-programi/yeni?courseId=${c.id}${
                              c.defaultTeacherId ? `&teacherId=${c.defaultTeacherId}` : ""
                            }${c.defaultClassroomId ? `&classroomId=${c.defaultClassroomId}` : ""}`}
                            className="od-btn od-btn-ghost od-btn-sm"
                          >
                            Program
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Pagination total={total} page={page} pageSize={pageSize} rowCount={displayRows.length} />
    </>
  );
}
