import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { QuickFilters } from "@/components/panel/ui/quick-filters";
import { SmartTableShell, SortableTh, BulkProvider, BulkRowCheckbox, BulkAllCheckbox, BulkBar } from "@/components/panel/ui/smart-table";
import { StudentBulkActions } from "@/components/panel/bulk/student-bulk-actions";
import { Pagination } from "@/components/panel/ui/pagination";
import { parsePagination } from "@/components/panel/ui/pagination-utils";
import { SavedViewsBar } from "@/components/panel/ui/saved-views";
import { StudentQuickDrawer } from "@/components/panel/students/student-quick-drawer";
import { ParentQuickDrawer } from "@/components/panel/parents/parent-quick-drawer";
import { getStudentProductFlags } from "@/lib/access/student-product-flags";
import type { StudentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_MAP: Record<string, "fullName" | "city" | "updatedAt" | "status" | "classLevel"> = {
  name: "fullName",
  city: "city",
  updated: "updatedAt",
  status: "status",
  class: "classLevel",
};

export default async function AdminStudents({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; dir?: string; page?: string; pageSize?: string }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const { q, status, sort, dir } = sp;
  const { page, pageSize, skip, take } = parsePagination(sp, { pageSize: 50, maxPageSize: 200 });
  const now = new Date();

  const odkOnlyExclusion = {
    NOT: {
      AND: [
        {
          user: {
            OR: [
              {
                odkUserAccessTags: {
                  some: {
                    revokedAt: null,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                    accessTag: { service: "ODK" as const, isActive: true },
                  },
                },
              },
              {
                odkEntitlements: {
                  some: {
                    status: "ACTIVE" as const,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                  },
                },
              },
            ],
          },
        },
        { packages: { none: {} } },
        {
          user: {
            odkUserAccessTags: {
              none: {
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                accessTag: { service: "OD" as const, isActive: true },
              },
            },
          },
        },
      ],
    },
  };

  const filters: Record<string, unknown>[] = [odkOnlyExclusion];
  if (q) {
    filters.push({
      OR: [
        { fullName: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { city: { contains: q, mode: "insensitive" as const } },
        { schoolName: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }
  const VALID_STATUS: StudentStatus[] = ["NEW", "FOLLOW_UP", "ACTIVE", "AT_RISK", "COMPLETED", "INACTIVE"];
  if (status && (VALID_STATUS as string[]).includes(status)) {
    filters.push({ status: status as StudentStatus });
  }
  const baseWhere = filters.length > 1 ? { AND: filters } : odkOnlyExclusion;

  const sortField = sort && SORT_MAP[sort] ? SORT_MAP[sort] : "updatedAt";
  const sortDir: "asc" | "desc" = dir === "asc" ? "asc" : "desc";

  // count + page'ı paralel çek (1000+ kayıtta da hızlı: status,updatedAt indexli)
  const [total, students] = await Promise.all([
    prisma.student.count({ where: baseWhere }),
    prisma.student.findMany({
      where: baseWhere,
      orderBy: { [sortField]: sortDir },
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        classLevel: true,
        examType: true,
        status: true,
        city: true,
        updatedAt: true,
      },
    }),
  ]);

  // Sayfa boyunda flag çek — büyük dataset'lerde de güvenli (her zaman ≤ pageSize)
  const flagsMap = await getStudentProductFlags(students.map((s) => s.id));

  // Phase 3 / Session 8 — Bulk action toolbar fixtures (admin-only)
  const [bulkClassrooms, bulkAccessTags] = await Promise.all([
    prisma.classroom.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.odkAccessTag.findMany({
      where: { isActive: true },
      select: { id: true, key: true, service: true },
      orderBy: [{ service: "asc" }, { key: "asc" }],
      take: 200,
    }),
  ]);
  const pageStudentIds = students.map((s) => s.id);

  // Sayfa numarası total'ı geçtiyse son sayfaya kayıyor olabiliriz — display için clamp
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <>
      <PageHeader
        title="OD Öğrencileri"
        breadcrumbs={[{ label: "Yönetim", href: "/panel/admin" }, { label: "Öğrenciler" }]}
        subtitle={`${total.toLocaleString("tr-TR")} öğrenci${q ? ` · "${q}"` : ""}${status ? ` · ${status}` : ""} · sayfa ${safePage}/${totalPages}`}
        right={
          <div className="od-list-toolbar">
            <SearchInput placeholder="Ad, email, telefon, şehir, okul…" />
            <ExportButton entity="ogrenciler" />
            <a
              href="/api/panel/import-templates/ogrenciler"
              className="od-btn od-btn-ghost od-btn-sm"
              download
              title="Toplu içe aktarma için CSV şablonu indir"
            >
              📥 Şablon
            </a>
            <Link
              href="/panel/admin/odk/ogrenciler"
              className="od-btn ghost sm"
              title="ODK öğrencileri için ayrı liste"
            >
              ODK Öğrencileri →
            </Link>
            <Link href="/panel/admin/ogrenciler/yeni" className="od-btn dark sm">
              + Yeni öğrenci
            </Link>
          </div>
        }
      />
      <Card>
        <BulkProvider>
        <SmartTableShell
          tableId="admin.ogrenciler"
          columns={[
            { id: "select",  label: "Seç", hideable: false },
            { id: "name",    label: "Ad Soyad", hideable: false },
            { id: "phone",   label: "Telefon" },
            { id: "email",   label: "Email" },
            { id: "class",   label: "Sınıf" },
            { id: "exam",    label: "Sınav" },
            { id: "city",    label: "Şehir" },
            { id: "access",  label: "Erişim" },
            { id: "status",  label: "Durum" },
            { id: "updated", label: "Güncel" },
          ]}
          toolbarLeft={
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <SavedViewsBar
                scope="students"
                presets={[
                  { name: "Tüm öğrenciler", filter: {} },
                  { name: "Riskli",         filter: { status: "AT_RISK" } },
                  { name: "Yeni",           filter: { status: "NEW" } },
                  { name: "Takipte",        filter: { status: "FOLLOW_UP" } },
                  // Phase 1.5 — backend filter handlers eklenince anlamlı
                  // hale gelecek presetler. Şimdilik URL state'i taşırlar
                  // ve smart-table sıralamasını/sayfalamayı korurlar.
                  { name: "Velisi yok",     filter: { noParent: "1" } },
                  { name: "Ödeme bekleyen", filter: { paymentDue: "1" } },
                  { name: "Eksik ödev",     filter: { overdueAsg: "1" } },
                ]}
              />
              <QuickFilters
                param="status"
                label="Durum"
                options={[
                  { value: "",           label: "Tümü" },
                  { value: "ACTIVE",     label: "Aktif",     tone: "ok"   },
                  { value: "AT_RISK",    label: "Risk",      tone: "bad"  },
                  { value: "FOLLOW_UP",  label: "Takip" },
                  { value: "NEW",        label: "Yeni" },
                  { value: "INACTIVE",   label: "Pasif" },
                ]}
              />
            </div>
          }
        >
          <table className="od-table">
            <thead>
              <tr>
                <th data-col="select" style={{ width: 32 }}>
                  <BulkAllCheckbox ids={pageStudentIds} />
                </th>
                <SortableTh field="name"    label="Ad Soyad" />
                <th data-col="phone">Telefon</th>
                <th data-col="email">Email</th>
                <SortableTh field="class"   label="Sınıf" />
                <th data-col="exam">Sınav</th>
                <SortableTh field="city"    label="Şehir" />
                <th data-col="access">Erişim</th>
                <SortableTh field="status"  label="Durum" />
                <SortableTh field="updated" label="Güncel" defaultDir="desc" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const f = flagsMap.get(s.id);
                // Build drawer-open href that preserves the current filter state.
                // We pass a relative `?...` href; Next will merge with current pathname.
                const drawerParams = new URLSearchParams();
                if (q) drawerParams.set("q", q);
                if (status) drawerParams.set("status", status);
                if (sort) drawerParams.set("sort", sort);
                if (dir) drawerParams.set("dir", dir);
                if (sp.page) drawerParams.set("page", String(sp.page));
                drawerParams.set("drawer", "student");
                drawerParams.set("id", s.id);
                const drawerHref = `/panel/admin/ogrenciler?${drawerParams.toString()}`;
                return (
                  <tr key={s.id}>
                    <td data-col="select">
                      <BulkRowCheckbox id={s.id} label={s.fullName} />
                    </td>
                    <td data-col="name">
                      <Link href={drawerHref} className="od-cell-user" scroll={false}>
                        <span className="n">{s.fullName}</span>
                      </Link>
                    </td>
                    <td data-col="phone" className="od-mono">{s.phone}</td>
                    <td data-col="email" className="od-muted">{s.email ?? "—"}</td>
                    <td data-col="class">{s.classLevel ?? "—"}</td>
                    <td data-col="exam">{s.examType ?? "—"}</td>
                    <td data-col="city">{s.city ?? "—"}</td>
                    <td data-col="access">
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <Badge tone={f?.hasOD ? "teal" : "neutral"}>{f?.hasOD ? "OD" : "OD ✗"}</Badge>
                        {f?.hasODK ? <Badge tone="purple">ODK</Badge> : null}
                      </div>
                    </td>
                    <td data-col="status">
                      <Badge
                        tone={
                          s.status === "ACTIVE"
                            ? "ok"
                            : s.status === "AT_RISK"
                            ? "bad"
                            : s.status === "NEW"
                            ? "teal"
                            : "neutral"
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td data-col="updated" className="od-mono od-muted">
                      {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(s.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SmartTableShell>
        <BulkBar>
          {() => (
            <StudentBulkActions
              classrooms={bulkClassrooms}
              accessTags={bulkAccessTags}
            />
          )}
        </BulkBar>
        </BulkProvider>
        <Pagination
          total={total}
          page={safePage}
          pageSize={pageSize}
          rowCount={students.length}
        />
      </Card>
      <StudentQuickDrawer />
      <ParentQuickDrawer />
    </>
  );
}
