/**
 * Phase 3 / Session 3 — D4: Parent list operational view.
 *
 * Server component. URL-driven advanced filters + saved views.
 * Filters supported (all single-value, "" = all):
 *   q             — name / email / phone substring
 *   access        — yes | no                       (parent.userId)
 *   state         — NO_ACCOUNT | INVITE_PENDING | INVITE_EXPIRED
 *                 | NEEDS_PASSWORD | MUST_CHANGE_PASSWORD | ACTIVE | DISABLED
 *   child         — yes | no                       (parent.students some/none)
 *   missing       — email | phone
 *   mustChange    — yes | no
 *   lastLogin     — never | 7d | 30d | older30
 *   created       — today | 7d | 30d
 *   relType       — MOTHER | FATHER | GUARDIAN | SIBLING | OTHER
 *
 * Saved view scope is "parents".
 *
 * Bulk actions: deferred to a later session (no half-built UI).
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, ParentRelationship } from "@prisma/client";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { QuickFilters } from "@/components/panel/ui/quick-filters";
import { SavedViewsBar } from "@/components/panel/ui/saved-views";
import { Pagination, parsePagination } from "@/components/panel/ui/pagination";
import { ParentQuickDrawer } from "@/components/panel/parents/parent-quick-drawer";
import { StudentQuickDrawer } from "@/components/panel/students/student-quick-drawer";
import {
  deriveUserAccountState,
  getUserAccountStateLabel,
  getUserAccountStateTone,
  type UserAccountState,
} from "@/lib/panel/account-onboarding";
import {
  PARENT_RELATIONSHIP_TYPES,
  isParentRelationshipType,
} from "@/lib/parents";

export const dynamic = "force-dynamic";

// ─── searchParams type ──────────────────────────────────────────────────

type SearchParams = {
  q?: string;
  access?: string;
  state?: string;
  child?: string;
  missing?: string;
  mustChange?: string;
  lastLogin?: string;
  created?: string;
  relType?: string;
  page?: string;
  pageSize?: string;
};

// ─── Where-clause builders ──────────────────────────────────────────────

function buildAccountStateWhere(state: string): Prisma.ParentWhereInput | null {
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

function buildLastLoginWhere(v: string): Prisma.ParentWhereInput | null {
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

function buildCreatedWhere(v: string): Prisma.ParentWhereInput | null {
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

function buildWhere(p: SearchParams): Prisma.ParentWhereInput {
  const and: Prisma.ParentWhereInput[] = [];

  if (p.q) {
    and.push({
      OR: [
        { fullName: { contains: p.q, mode: "insensitive" } },
        { email: { contains: p.q, mode: "insensitive" } },
        { phone: { contains: p.q } },
      ],
    });
  }
  if (p.access === "yes") and.push({ userId: { not: null } });
  if (p.access === "no") and.push({ userId: null });

  if (p.state) {
    const w = buildAccountStateWhere(p.state);
    if (w) and.push(w);
  }
  if (p.child === "yes") and.push({ students: { some: {} } });
  if (p.child === "no") and.push({ students: { none: {} } });

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
  if (p.relType && isParentRelationshipType(p.relType)) {
    and.push({
      students: { some: { relationshipType: p.relType as ParentRelationship } },
    });
  }

  return and.length === 0 ? {} : { AND: and };
}

// ─── Date helpers ───────────────────────────────────────────────────────

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

// ─── Page ───────────────────────────────────────────────────────────────

export default async function AdminParents({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp, {
    pageSize: 50,
    maxPageSize: 200,
  });
  const where = buildWhere(sp);

  const [total, parents] = await Promise.all([
    prisma.parent.count({ where }),
    prisma.parent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
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
        students: {
          select: {
            relationshipType: true,
            student: { select: { id: true, fullName: true, classLevel: true } },
          },
        },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Veliler"
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Veliler" },
        ]}
        subtitle={`${total} veli${sp.q ? ` · "${sp.q}"` : ""}`}
        right={
          <div className="od-list-toolbar">
            <SearchInput placeholder="Ad, email, telefon…" />
            <ExportButton entity="veliler" />
            <Link
              href="/panel/admin/veliler/yeni"
              className="od-btn dark sm"
            >
              + Yeni veli
            </Link>
          </div>
        }
      />

      {/* Saved views */}
      <div style={{ marginBottom: 8 }}>
        <SavedViewsBar
          scope="parents"
          presets={[
            { name: "Tüm veliler",                  filter: {} },
            { name: "Hesabı olmayan veliler",       filter: { access: "no" } },
            { name: "Davet bekleyenler",            filter: { state: "INVITE_PENDING" } },
            { name: "Daveti süresi dolanlar",       filter: { state: "INVITE_EXPIRED" } },
            { name: "Hiç giriş yapmayanlar",        filter: { access: "yes", lastLogin: "never" } },
            { name: "Şifre değiştirmesi gerekenler", filter: { state: "MUST_CHANGE_PASSWORD" } },
            { name: "Çocuğu bağlanmamış veliler",   filter: { child: "no" } },
            { name: "Aktif veliler",                filter: { state: "ACTIVE" } },
            { name: "Devre dışı hesaplar",          filter: { state: "DISABLED" } },
            { name: "İletişim bilgisi eksik",       filter: { missing: "email" } },
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
            { value: "NEEDS_PASSWORD",       label: "Şifre belirlemedi", tone: "warn"    },
            { value: "MUST_CHANGE_PASSWORD", label: "Şifre değiştirmeli", tone: "warn"   },
            { value: "ACTIVE",               label: "Aktif",             tone: "ok"      },
            { value: "DISABLED",             label: "Devre dışı",        tone: "bad"     },
          ]}
        />
        <QuickFilters
          param="child"
          label="Bağlı çocuk"
          options={[
            { value: "",    label: "Tümü" },
            { value: "yes", label: "Var",  tone: "ok"   },
            { value: "no",  label: "Yok",  tone: "warn" },
          ]}
        />
        <QuickFilters
          param="missing"
          label="Eksik bilgi"
          options={[
            { value: "",      label: "Tümü" },
            { value: "email", label: "Email yok", tone: "warn" },
            { value: "phone", label: "Telefon yok", tone: "warn" },
          ]}
        />
        <QuickFilters
          param="mustChange"
          label="Şifre değişimi"
          options={[
            { value: "",    label: "Tümü" },
            { value: "yes", label: "Gerekli", tone: "warn" },
            { value: "no",  label: "Gerekli değil" },
          ]}
        />
        <QuickFilters
          param="lastLogin"
          label="Son giriş"
          options={[
            { value: "",        label: "Tümü" },
            { value: "never",   label: "Hiç",      tone: "bad"  },
            { value: "7d",      label: "Son 7 gün", tone: "ok"  },
            { value: "30d",     label: "Son 30 gün" },
            { value: "older30", label: "30+ gün önce", tone: "warn" },
          ]}
        />
        <QuickFilters
          param="created"
          label="Oluşturulma"
          options={[
            { value: "",      label: "Tümü" },
            { value: "today", label: "Bugün" },
            { value: "7d",    label: "Son 7 gün" },
            { value: "30d",   label: "Son 30 gün" },
          ]}
        />
        <QuickFilters
          param="relType"
          label="Yakınlık"
          options={[
            { value: "",     label: "Tümü" },
            ...PARENT_RELATIONSHIP_TYPES.map((v) => ({
              value: v,
              label:
                v === "MOTHER"   ? "Anne" :
                v === "FATHER"   ? "Baba" :
                v === "GUARDIAN" ? "Vasi" :
                v === "SIBLING"  ? "Abla / Abi" : "Diğer",
            })),
          ]}
        />
      </div>

      {/* Table */}
      <Card>
        {parents.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--od-muted)",
              fontSize: 14,
            }}
          >
            {Object.keys(sp).length === 0
              ? "Henüz veli yok. + Yeni veli ile başlayabilirsiniz."
              : "Bu filtrelerle eşleşen veli bulunamadı. Filtreyi gevşetin veya kayıtlı bir görünüm seçin."}
          </div>
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Veli</th>
                <th>Hesap durumu</th>
                <th>Bağlı çocuklar</th>
                <th>İletişim</th>
                <th>Oluşturuldu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => {
                const state: UserAccountState = deriveUserAccountState(p.user);
                const stateTone = tone(getUserAccountStateTone(state));
                const stateLabel = getUserAccountStateLabel(state);
                const childCount = p.students.length;
                const missingEmail = !p.email;
                const missingPhone = !p.phone;

                let meta = "—";
                if (state === "ACTIVE" && p.user?.lastLoginAt) {
                  meta = `Son giriş: ${relTime(p.user.lastLoginAt)}`;
                } else if (state === "INVITE_PENDING" && p.user?.userInviteTokenExpiresAt) {
                  meta = `Davet: ${fmtDate(p.user.userInviteTokenExpiresAt)} sonuna kadar`;
                } else if (state === "INVITE_EXPIRED" && p.user?.userInviteTokenExpiresAt) {
                  meta = `Davet süresi: ${fmtDate(p.user.userInviteTokenExpiresAt)}`;
                } else if (state === "DISABLED" && p.user?.accountDisabledAt) {
                  meta = `Devre dışı: ${fmtDate(p.user.accountDisabledAt)}`;
                } else if (state === "MUST_CHANGE_PASSWORD") {
                  meta = "İlk girişte şifre değişimi";
                } else if (state === "NEEDS_PASSWORD") {
                  meta = "Şifre henüz belirlenmedi";
                } else if (state === "NO_ACCOUNT") {
                  meta = p.email ? "Davet üretilebilir" : "Email gerekli";
                }

                return (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/panel/admin/veliler/${p.id}/duzenle`}
                        className="od-cell-user"
                        style={{ display: "grid", gap: 2 }}
                      >
                        <span className="n" style={{ fontWeight: 600 }}>{p.fullName}</span>
                        <span className="od-muted" style={{ fontSize: 12 }}>
                          {p.email ?? "email yok"} · {p.phone ?? "telefon yok"}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <Badge tone={stateTone}>{stateLabel}</Badge>
                        <span className="od-muted" style={{ fontSize: 11 }}>{meta}</span>
                      </div>
                    </td>
                    <td>
                      {childCount === 0 ? (
                        <span className="od-muted">—</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {p.students.slice(0, 3).map((c) => (
                            <Link
                              key={c.student.id}
                              href={`/panel/admin/ogrenciler/${c.student.id}/duzenle`}
                            >
                              <Badge tone="teal">
                                {c.student.fullName}
                                {c.student.classLevel ? ` · ${c.student.classLevel}` : ""}
                              </Badge>
                            </Link>
                          ))}
                          {childCount > 3 ? (
                            <span className="od-muted" style={{ fontSize: 11 }}>
                              +{childCount - 3}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td>
                      {missingEmail || missingPhone ? (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {missingEmail ? <Badge tone="warn">Email yok</Badge> : null}
                          {missingPhone ? <Badge tone="warn">Telefon yok</Badge> : null}
                        </div>
                      ) : (
                        <span className="od-muted" style={{ fontSize: 12 }}>Tam</span>
                      )}
                    </td>
                    <td className="od-muted" style={{ fontSize: 12 }}>
                      {fmtDate(p.createdAt)}
                    </td>
                    <td>
                      <Link
                        href={`/panel/admin/veliler/${p.id}/duzenle`}
                        className="od-btn od-btn-ghost od-btn-sm"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div style={{ marginTop: 12 }}>
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          rowCount={parents.length}
        />
      </div>

      <ParentQuickDrawer />
      <StudentQuickDrawer />
    </>
  );
}
