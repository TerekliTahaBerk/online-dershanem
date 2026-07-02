/**
 * Phase 3 / Session 4 — D5: Teacher list operational view.
 *
 * Server component. URL-driven advanced filters + saved views (scope=teachers).
 *
 * Filters supported (single value, "" = all):
 *   q              — name / email / phone / subjects substring
 *   status         — ACTIVE | INACTIVE
 *   access         — yes | no                       (teacher.userId)
 *   state          — NO_ACCOUNT | INVITE_PENDING | INVITE_EXPIRED
 *                  | NEEDS_PASSWORD | MUST_CHANGE_PASSWORD | ACTIVE | DISABLED
 *   classroom      — yes | no                       (has any ClassroomTeacher)
 *   classroomId    — specific classroom id
 *   subject        — substring on Teacher.subjects (free-text branch)
 *   compRule       — yes | no                       (has any active rule)
 *   missing        — email | phone
 *   mustChange     — yes | no
 *   lastLogin      — never | 7d | 30d | older30
 *   created        — today | 7d | 30d
 *
 * Bulk actions: deferred (not part of Session 4 scope).
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { BulkProvider, BulkRowCheckbox, BulkAllCheckbox, BulkBar } from "@/components/panel/ui/smart-table";
import { TeacherBulkActions } from "@/components/panel/bulk/teacher-bulk-actions";
import { QuickFilters } from "@/components/panel/ui/quick-filters";
import { SavedViewsBar } from "@/components/panel/ui/saved-views";
import { Pagination } from "@/components/panel/ui/pagination";
import { parsePagination } from "@/components/panel/ui/pagination-utils";
import {
  deriveUserAccountState,
  getUserAccountStateLabel,
  getUserAccountStateTone,
} from "@/lib/panel/account-onboarding";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  status?: string;
  access?: string;
  state?: string;
  classroom?: string;
  classroomId?: string;
  subject?: string;
  compRule?: string;
  missing?: string;
  mustChange?: string;
  lastLogin?: string;
  created?: string;
  page?: string;
  pageSize?: string;
};

function buildAccountStateWhere(state: string): Prisma.TeacherWhereInput | null {
  const now = new Date();
  switch (state) {
    case "NO_ACCOUNT":
      return { userId: null };
    case "INVITE_PENDING":
      return {
        user: {
          userInviteToken: { not: null },
          OR: [
            { userInviteTokenExpiresAt: null },
            { userInviteTokenExpiresAt: { gt: now } },
          ],
          accountDisabledAt: null,
          lastLoginAt: null,
          mustChangePassword: false,
        },
      };
    case "INVITE_EXPIRED":
      return {
        user: {
          userInviteToken: { not: null },
          userInviteTokenExpiresAt: { lt: now },
          accountDisabledAt: null,
        },
      };
    case "NEEDS_PASSWORD":
      return {
        user: {
          userInviteToken: null,
          lastLoginAt: null,
          accountDisabledAt: null,
          mustChangePassword: false,
        },
      };
    case "MUST_CHANGE_PASSWORD":
      return { user: { mustChangePassword: true, accountDisabledAt: null } };
    case "ACTIVE":
      return {
        user: {
          lastLoginAt: { not: null },
          mustChangePassword: false,
          accountDisabledAt: null,
        },
      };
    case "DISABLED":
      return { user: { accountDisabledAt: { not: null } } };
    default:
      return null;
  }
}

function buildLastLoginWhere(v: string): Prisma.TeacherWhereInput | null {
  const now = Date.now();
  switch (v) {
    case "never":
      return { userId: { not: null }, user: { lastLoginAt: null } };
    case "7d":
      return { user: { lastLoginAt: { gte: new Date(now - 7 * 24 * 60 * 60_000) } } };
    case "30d":
      return { user: { lastLoginAt: { gte: new Date(now - 30 * 24 * 60 * 60_000) } } };
    case "older30":
      return { user: { lastLoginAt: { lt: new Date(now - 30 * 24 * 60 * 60_000) } } };
    default:
      return null;
  }
}
function buildCreatedWhere(v: string): Prisma.TeacherWhereInput | null {
  const now = Date.now();
  switch (v) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return { createdAt: { gte: d } };
    }
    case "7d":
      return { createdAt: { gte: new Date(now - 7 * 24 * 60 * 60_000) } };
    case "30d":
      return { createdAt: { gte: new Date(now - 30 * 24 * 60 * 60_000) } };
    default:
      return null;
  }
}

function buildWhere(p: SearchParams): Prisma.TeacherWhereInput {
  const and: Prisma.TeacherWhereInput[] = [];
  if (p.q) {
    and.push({
      OR: [
        { fullName: { contains: p.q, mode: "insensitive" } },
        { email: { contains: p.q, mode: "insensitive" } },
        { phone: { contains: p.q } },
        { subjects: { contains: p.q, mode: "insensitive" } },
      ],
    });
  }
  if (p.status === "ACTIVE") and.push({ status: "ACTIVE" });
  if (p.status === "INACTIVE") and.push({ status: "INACTIVE" });
  if (p.access === "yes") and.push({ userId: { not: null } });
  if (p.access === "no") and.push({ userId: null });
  if (p.state) {
    const w = buildAccountStateWhere(p.state);
    if (w) and.push(w);
  }
  if (p.classroom === "yes") and.push({ classrooms: { some: {} } });
  if (p.classroom === "no") and.push({ classrooms: { none: {} } });
  if (p.classroomId) {
    and.push({ classrooms: { some: { classroomId: p.classroomId } } });
  }
  if (p.subject) and.push({ subjects: { contains: p.subject, mode: "insensitive" } });
  if (p.compRule === "yes") and.push({ compensationRules: { some: { isActive: true } } });
  if (p.compRule === "no") and.push({ compensationRules: { none: { isActive: true } } });
  if (p.missing === "email") and.push({ email: null });
  if (p.missing === "phone") and.push({ phone: null });
  if (p.mustChange === "yes") and.push({ user: { mustChangePassword: true } });
  if (p.mustChange === "no") {
    and.push({
      OR: [
        { userId: null },
        { user: { mustChangePassword: false } },
      ],
    });
  }
  if (p.lastLogin) {
    const w = buildLastLoginWhere(p.lastLogin);
    if (w) and.push(w);
  }
  if (p.created) {
    const w = buildCreatedWhere(p.created);
    if (w) and.push(w);
  }
  return and.length === 0 ? {} : { AND: and };
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { dateStyle: "medium" });
}
function relTime(d: Date | null | undefined): string {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / (24 * 60 * 60_000));
  if (days < 1) return "bugün";
  if (days < 30) return `${days} gün önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}
function tone(t: ReturnType<typeof getUserAccountStateTone>): "ok" | "warn" | "bad" | "neutral" {
  return t === "good" ? "ok" : t;
}

export default async function AdminTeachers({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp, { pageSize: 50, maxPageSize: 200 });
  const where = buildWhere(sp);

  const [total, teachers, classroomOpts] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        subjects: true,
        status: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            email: true,
            passwordHash: true,
            lastLoginAt: true,
            userInviteToken: true,
            userInviteTokenExpiresAt: true,
            userInviteSentAt: true,
            mustChangePassword: true,
            passwordChangedAt: true,
            accountDisabledAt: true,
          },
        },
        _count: {
          select: {
            classrooms: true,
            compensationRules: { where: { isActive: true } },
          },
        },
      },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Öğretmenler"
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmenler" },
        ]}
        subtitle={`${total} öğretmen${sp.q ? ` · "${sp.q}"` : ""}`}
        right={
          <div className="od-list-toolbar">
            <SearchInput placeholder="Ad, email, branş, telefon…" />
            <ExportButton entity="ogretmenler" />
            <a
              href="/api/panel/import-templates/ogretmenler"
              className="od-btn od-btn-ghost od-btn-sm"
              download
              title="Toplu içe aktarma için CSV şablonu indir"
            >
              📥 Şablon
            </a>
            <Link href="/panel/admin/ogretmenler/yeni" className="od-btn dark sm">+ Yeni öğretmen</Link>
          </div>
        }
      />

      {/* Saved views */}
      <div style={{ marginBottom: 8 }}>
        <SavedViewsBar
          scope="teachers"
          presets={[
            { name: "Tüm öğretmenler",                    filter: {} },
            { name: "Hesabı olmayan öğretmenler",         filter: { access: "no" } },
            { name: "Davet bekleyenler",                  filter: { state: "INVITE_PENDING" } },
            { name: "Hiç giriş yapmayanlar",              filter: { access: "yes", lastLogin: "never" } },
            { name: "Şifre değiştirmesi gerekenler",      filter: { state: "MUST_CHANGE_PASSWORD" } },
            { name: "Sınıf atanmamış öğretmenler",        filter: { classroom: "no" } },
            { name: "Hakediş kuralı eksik",               filter: { compRule: "no" } },
            { name: "Aktif öğretmenler",                  filter: { status: "ACTIVE" } },
            { name: "Devre dışı hesaplar",                filter: { state: "DISABLED" } },
            { name: "İletişim bilgisi eksik",             filter: { missing: "email" } },
          ]}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "grid",
          gap: 10,
          marginBottom: 12,
          padding: 10,
          border: "1px solid var(--pd-line)",
          borderRadius: 10,
          background: "var(--pd-bg-subtle, var(--pd-bg))",
        }}
      >
        <QuickFilters
          param="status"
          label="Durum"
          options={[
            { value: "",         label: "Tümü" },
            { value: "ACTIVE",   label: "Aktif",  tone: "ok"      },
            { value: "INACTIVE", label: "Pasif",  tone: "neutral" },
          ]}
        />
        <QuickFilters
          param="access"
          label="Hesap"
          options={[
            { value: "",    label: "Tümü" },
            { value: "yes", label: "Var",  tone: "ok"      },
            { value: "no",  label: "Yok",  tone: "neutral" },
          ]}
        />
        <QuickFilters
          param="state"
          label="Hesap durumu"
          options={[
            { value: "",                     label: "Tümü" },
            { value: "NO_ACCOUNT",           label: "Hesap yok",         tone: "neutral" },
            { value: "INVITE_PENDING",       label: "Davet bekleniyor",  tone: "warn"    },
            { value: "INVITE_EXPIRED",       label: "Davet süresi doldu", tone: "bad"    },
            { value: "MUST_CHANGE_PASSWORD", label: "Şifre değiştirmeli", tone: "warn"   },
            { value: "ACTIVE",               label: "Aktif",              tone: "ok"     },
            { value: "DISABLED",             label: "Devre dışı",         tone: "bad"    },
          ]}
        />
        <QuickFilters
          param="classroom"
          label="Sınıf ataması"
          options={[
            { value: "",    label: "Tümü" },
            { value: "yes", label: "Var",  tone: "ok"      },
            { value: "no",  label: "Yok",  tone: "warn"    },
          ]}
        />
        <QuickFilters
          param="compRule"
          label="Hakediş kuralı"
          options={[
            { value: "",    label: "Tümü" },
            { value: "yes", label: "Var", tone: "ok"   },
            { value: "no",  label: "Yok", tone: "warn" },
          ]}
        />
        <QuickFilters
          param="missing"
          label="Eksik bilgi"
          options={[
            { value: "",      label: "Yok" },
            { value: "email", label: "Email yok",   tone: "warn" },
            { value: "phone", label: "Telefon yok", tone: "warn" },
          ]}
        />
        <QuickFilters
          param="lastLogin"
          label="Son giriş"
          options={[
            { value: "",        label: "Tümü" },
            { value: "never",   label: "Hiç",          tone: "warn"    },
            { value: "7d",      label: "Son 7 gün",    tone: "ok"      },
            { value: "30d",     label: "Son 30 gün",   tone: "ok"      },
            { value: "older30", label: "30+ gün önce", tone: "neutral" },
          ]}
        />
        <QuickFilters
          param="created"
          label="Oluşturuldu"
          options={[
            { value: "",      label: "Tümü" },
            { value: "today", label: "Bugün",     tone: "ok" },
            { value: "7d",    label: "Son 7 gün", tone: "ok" },
            { value: "30d",   label: "Son 30 gün", tone: "ok" },
          ]}
        />
        <QuickFilters
          param="classroomId"
          label="Sınıf"
          options={[
            { value: "", label: "Tümü" },
            ...classroomOpts.slice(0, 8).map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      <Card>
        <BulkProvider>
        <table className="od-table premium-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <BulkAllCheckbox ids={teachers.map((t) => t.id)} />
              </th>
              <th>Öğretmen</th>
              <th>Hesap durumu</th>
              <th>Branş</th>
              <th>Sınıf</th>
              <th>Hakediş</th>
              <th>Son giriş</th>
              <th>Oluşturuldu</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr><td colSpan={9} className="od-empty-soft">Filtreye uyan öğretmen yok.</td></tr>
            ) : null}
            {teachers.map((t) => {
              const state = deriveUserAccountState(t.user);
              return (
                <tr key={t.id}>
                  <td style={{ width: 32 }}>
                    <BulkRowCheckbox id={t.id} label={t.fullName} />
                  </td>
                  <td>
                    <Link href={`/panel/admin/ogretmenler/${t.id}/duzenle`} style={{ fontWeight: 500 }}>
                      {t.fullName}
                    </Link>
                    <div className="od-muted" style={{ fontSize: 12 }}>
                      {t.email ?? "—"}{t.phone ? ` · ${t.phone}` : ""}
                    </div>
                  </td>
                  <td>
                    <Badge tone={tone(getUserAccountStateTone(state))}>{getUserAccountStateLabel(state)}</Badge>
                    {!t.email ? <div className="od-muted" style={{ fontSize: 11, marginTop: 2 }}>Email gerekli</div> : null}
                  </td>
                  <td className="od-muted" style={{ fontSize: 13 }}>{t.subjects}</td>
                  <td>
                    {t._count.classrooms > 0 ? (
                      <Badge tone="ok">{t._count.classrooms}</Badge>
                    ) : (
                      <Badge tone="warn">0</Badge>
                    )}
                  </td>
                  <td>
                    {t._count.compensationRules > 0 ? (
                      <Badge tone="ok">{t._count.compensationRules} aktif</Badge>
                    ) : (
                      <Badge tone="warn">Eksik</Badge>
                    )}
                  </td>
                  <td className="od-muted" style={{ fontSize: 12 }}>{relTime(t.user?.lastLoginAt)}</td>
                  <td className="od-muted" style={{ fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                  <td>
                    <Link href={`/panel/admin/ogretmenler/${t.id}/duzenle`} className="od-btn ghost sm">
                      Aç
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <BulkBar><TeacherBulkActions /></BulkBar>
        </BulkProvider>
      </Card>

      <Pagination total={total} page={page} pageSize={pageSize} rowCount={teachers.length} />
    </>
  );
}
