import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { productLabel, roleLabel } from "@/lib/auth/roles";
import { ROLE_FILTERS, STATUS_FILTERS, buildUserWhere, parseUserListFilters } from "@/lib/panel/user-filters";
import {
  PEOPLE_VIEWS,
  pageWindow,
  parsePeopleView,
  peopleHref,
  peopleViewWhere,
  responsibilityBadges,
  viewAllowsRoleFilter,
  type PeopleQuery,
} from "@/lib/panel/people-views";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  StatusBadge,
  UrlDrawer,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { CreateUserForm } from "@/components/panel/create-user-form";
import { UserBulkOperations } from "@/components/panel/user-bulk-operations";
import { PendingMfaResetQueue } from "@/components/panel/pending-mfa-reset-queue";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";
import { USER_STATUS_PRESENTATION } from "@/lib/panel/status-vocabulary";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const PAGE_SIZE = 30;
const VIEW_ROLE = { ogrenciler: "STUDENT", veliler: "PARENT", ogretmenler: "TEACHER" } as const;
const SELECT_CLASS = "min-h-9 rounded-md border border-pn-border-strong bg-white px-2 text-[14px] text-pn-text";

/**
 * KİŞİLER & ERİŞİM (docs/panel-design-roadmap.md §14.1) — görünümler
 * (`?sekme=` Tümü · Öğrenciler · Veliler · Öğretmenler · Koçlar · Personel),
 * erişilemeyen eski `kullanicilar` listesinin süzgeçleri (rol, ürün, durum,
 * arama, sayfalama; sunucu tarafı) ve sorumluluk rozetleri. "Yeni kişi" yan
 * panelde (`?yeni=1`). Toplu işlem yalnız süzgeçle birebir eşleşen
 * görünümlerde (Koçlar/Personel'de uç görünüm kuralını bilmez, gösterilmez).
 */
export default async function PeopleHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sekme?: string; sayfa?: string; rol?: string; urun?: string; durum?: string; yeni?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const view = parsePeopleView(sp.sekme, sp.rol);
  const filters = parseUserListFilters(sp);
  const rol = viewAllowsRoleFilter(view) ? filters.rol : view in VIEW_ROLE ? VIEW_ROLE[view as keyof typeof VIEW_ROLE] : "";
  const query: PeopleQuery = { view, q: filters.q, rol: viewAllowsRoleFilter(view) ? filters.rol : "", urun: filters.urun, durum: filters.durum };
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);
  const where: Prisma.UserWhereInput = { AND: [buildUserWhere({ ...filters, rol }), peopleViewWhere(view)] };
  const bulkApplies = view === "tumu" || view in VIEW_ROLE;
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

  const [total, users, activeGroups, activeTeachers, interventionOwners] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ fullName: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        inviteAcceptedAt: true,
        productMemberships: { where: { revokedAt: null }, select: { product: true, source: true } },
        productStaffAssignments: { where: { revokedAt: null }, select: { role: true } },
        studentProfile: {
          select: {
            id: true,
            classLevel: true,
            examType: true,
            parents: { where: { active: true }, select: { parent: { select: { fullName: true, email: true } } }, take: 2 },
            enrollments: {
              where: { endedAt: null },
              select: { group: { select: { name: true, teacher: { select: { fullName: true, email: true } } } } },
              take: 2,
            },
            teacherAssignments: { where: { active: true }, select: { subject: true, teacher: { select: { fullName: true, email: true } } }, take: 3 },
            coachAssignments: { where: { endedAt: null }, select: { coach: { select: { user: { select: { fullName: true, email: true } } } } }, take: 1 },
          },
        },
        teacherProfile: {
          select: { subjects: true, isCoach: true, coachCapacity: true, _count: { select: { coachAssignments: { where: { endedAt: null } } } } },
        },
        taughtGroups: { where: { isActive: true }, select: { id: true, _count: { select: { enrollments: { where: { endedAt: null } } } } } },
        studentTeacherAssignments: { where: { active: true }, select: { id: true } },
        taughtLessons: { where: { status: "PLANNED", startsAt: { gte: dayStart, lt: dayEnd } }, select: { id: true } },
        parentStudents: { where: { active: true }, select: { student: { select: { user: { select: { fullName: true, email: true } } } } }, take: 3 },
      },
    }),
    bulkApplies
      ? prisma.group.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          take: 200,
          select: { id: true, name: true, subject: true, teacher: { select: { fullName: true, email: true } } },
        })
      : Promise.resolve([]),
    bulkApplies
      ? prisma.user.findMany({
          where: { role: "TEACHER", status: "ACTIVE" },
          orderBy: { fullName: "asc" },
          take: 200,
          select: { id: true, fullName: true, email: true, teacherProfile: { select: { isCoach: true } } },
        })
      : Promise.resolve([]),
    bulkApplies
      ? prisma.user.findMany({
          where: { role: { in: ["ADMIN", "TEACHER"] }, status: "ACTIVE" },
          orderBy: [{ role: "asc" }, { fullName: "asc" }],
          take: 200,
          select: { id: true, fullName: true, email: true, role: true },
        })
      : Promise.resolve([]),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const name = (user: { fullName: string | null; email: string }) => user.fullName || user.email;
  const products = (user: (typeof users)[number]) =>
    user.productMemberships.flatMap((m) => (m.product ? [productLabel(m.product)] : [])).join(", ") || "—";
  const statusCell = (user: (typeof users)[number]) => (
    <>
      <StatusBadge presentation={USER_STATUS_PRESENTATION[user.status]} />
      {!user.inviteAcceptedAt ? <span className="ml-1 text-[12.5px] text-pn-text-muted">davet bekliyor</span> : null}
    </>
  );
  const personLink = (user: (typeof users)[number]) => {
    const href = user.role === "STUDENT" && user.studentProfile ? `/panel/yonetim/ogrenciler/${user.studentProfile.id}` : `/panel/yonetim/kullanicilar/${user.id}`;
    return (
      <>
        <Link href={href} className="font-medium text-pn-text underline-offset-2 hover:underline">
          {name(user)}
        </Link>
        <span className="block text-[12.5px] text-pn-text-muted">{user.email}</span>
      </>
    );
  };
  const lastLogin = (user: (typeof users)[number]) => <span className="tabular-nums">{user.lastLoginAt ? DATE.format(user.lastLoginAt) : "—"}</span>;

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle={PANEL_DOMAIN.kisiler}>
      <PageHeader
        title={PANEL_DOMAIN.kisiler}
        description="Öğrenci, veli, öğretmen, koç ve personeli tek listeden yönetin. Ayrıntı ve erişim için satıra gidin."
        actions={
          <>
            <Link href="/panel/yonetim/basvurular" className={buttonClass("secondary", "md")}>
              Yeni kayıtlar
            </Link>
            <Link href={`${peopleHref(query)}&yeni=1`} scroll={false} className={buttonClass("primary", "md")}>
              Yeni kişi
            </Link>
          </>
        }
      />

      <PendingMfaResetQueue viewerUserId={session.userId} className="mt-4" />

      <div className="mt-4">
        <ViewTabs
          label="Kişi görünümleri"
          activeId={view}
          tabs={PEOPLE_VIEWS.map((item) => ({ id: item.id, label: item.label, href: peopleHref({ ...query, view: item.id, rol: "" }) }))}
        />
      </div>

      <form method="get" action="/panel/yonetim/kisiler" className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="sekme" value={view} />
        <label className="grid min-w-[200px] flex-1 gap-1 text-[12.5px] font-medium text-pn-text-muted sm:max-w-xs">
          Ara
          <input name="q" defaultValue={filters.q} placeholder="Ad, e-posta veya telefon" className={`${SELECT_CLASS} px-3`} />
        </label>
        {viewAllowsRoleFilter(view) ? (
          <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-muted">
            Rol
            <select name="rol" defaultValue={filters.rol} className={SELECT_CLASS}>
              {ROLE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-muted">
          Ürün
          <select name="urun" defaultValue={filters.urun} className={SELECT_CLASS}>
            <option value="">Tümü</option>
            {(["OD", "OK", "ODK"] as const).map((code) => (
              <option key={code} value={code}>
                {productLabel(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-muted">
          Durum
          <select name="durum" defaultValue={filters.durum} className={SELECT_CLASS}>
            {STATUS_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button className={buttonClass("secondary", "sm", "min-h-9")}>Süz</button>
        {filters.q || query.rol || filters.urun || filters.durum ? (
          <Link href={peopleHref({ view, q: "", rol: "", urun: "", durum: "" })} className={buttonClass("ghost", "sm", "min-h-9")}>
            Süzgeci temizle
          </Link>
        ) : null}
        <span className="ml-auto text-[13px] tabular-nums text-pn-text-muted">{total} kişi</span>
      </form>

      {users.length === 0 ? (
        <EmptyState className="mt-5" title="Eşleşen kişi yok." body="Süzgeci değiştirin ya da başka bir görünüm seçin." />
      ) : view === "ogrenciler" ? (
        <PanelTable caption="Öğrenciler" columns={["Ad soyad", "Sınıf · sınav", "Ürünler", "Grup / öğretmen", "Koç", "Veli", "Durum", "Son giriş"]}>
          {users.map((user) => {
            const profile = user.studentProfile;
            const group = profile?.enrollments[0]?.group;
            const teachers = [
              ...(group ? [`${group.name}: ${name(group.teacher)}`] : []),
              ...(profile?.teacherAssignments.map((link) => `${link.subject} → ${name(link.teacher)}`) ?? []),
            ];
            const coach = profile?.coachAssignments[0]?.coach.user;
            return (
              <PanelTableRow key={user.id}>
                <PanelTableCell>{personLink(user)}</PanelTableCell>
                <PanelTableCell>{[profile?.classLevel, profile?.examType].filter(Boolean).join(" · ") || "—"}</PanelTableCell>
                <PanelTableCell>{products(user)}</PanelTableCell>
                <PanelTableCell>{teachers.slice(0, 2).join(" · ") || "—"}</PanelTableCell>
                <PanelTableCell>{coach ? name(coach) : "—"}</PanelTableCell>
                <PanelTableCell>{profile?.parents.map((link) => name(link.parent)).join(", ") || "—"}</PanelTableCell>
                <PanelTableCell>{statusCell(user)}</PanelTableCell>
                <PanelTableCell>{lastLogin(user)}</PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
      ) : view === "ogretmenler" ? (
        <PanelTable caption="Öğretmenler" columns={["Ad soyad", "Branş", "Sorumluluklar", "Öğrenci", "Grup", "Bugün ders", "Durum"]}>
          {users.map((user) => {
            const studentCount = user.taughtGroups.reduce((sum, group) => sum + group._count.enrollments, 0) + user.studentTeacherAssignments.length;
            return (
              <PanelTableRow key={user.id}>
                <PanelTableCell>{personLink(user)}</PanelTableCell>
                <PanelTableCell>{user.teacherProfile?.subjects.join(", ") || "—"}</PanelTableCell>
                <PanelTableCell>{responsibilityBadges(user.productStaffAssignments.map((row) => row.role)).join(" · ") || "—"}</PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{studentCount}</span>
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{user.taughtGroups.length}</span>
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{user.taughtLessons.length}</span>
                </PanelTableCell>
                <PanelTableCell>{statusCell(user)}</PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
      ) : view === "veliler" ? (
        <PanelTable caption="Veliler" columns={["Ad soyad", "Bağlı öğrenciler", "İletişim", "Durum", "Son giriş"]}>
          {users.map((user) => (
            <PanelTableRow key={user.id}>
              <PanelTableCell>{personLink(user)}</PanelTableCell>
              <PanelTableCell>{user.parentStudents.map((link) => name(link.student.user)).join(", ") || "—"}</PanelTableCell>
              <PanelTableCell>{[user.phone, user.email].filter(Boolean).join(" · ")}</PanelTableCell>
              <PanelTableCell>{statusCell(user)}</PanelTableCell>
              <PanelTableCell>{lastLogin(user)}</PanelTableCell>
            </PanelTableRow>
          ))}
        </PanelTable>
      ) : view === "koclar" ? (
        <PanelTable caption="Koçlar" columns={["Ad soyad", "Aktif öğrenci", "Kapasite", "Sorumluluklar", "Durum", "Son giriş"]}>
          {users.map((user) => {
            const load = user.teacherProfile?._count.coachAssignments ?? 0;
            const capacity = user.teacherProfile?.coachCapacity ?? null;
            return (
              <PanelTableRow key={user.id}>
                <PanelTableCell>{personLink(user)}</PanelTableCell>
                <PanelTableCell tone={capacity !== null && load > capacity ? "warn" : "default"}>
                  <span className="tabular-nums">{load}</span>
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{capacity ?? "Sınırsız"}</span>
                </PanelTableCell>
                <PanelTableCell>{responsibilityBadges(user.productStaffAssignments.map((row) => row.role)).join(" · ") || "—"}</PanelTableCell>
                <PanelTableCell>{statusCell(user)}</PanelTableCell>
                <PanelTableCell>{lastLogin(user)}</PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
      ) : (
        <PanelTable caption={view === "personel" ? "Personel" : "Tüm kişiler"} columns={["Ad soyad", "Rol", "Ürünler", "Sorumluluklar", "Durum", "Son giriş"]}>
          {users.map((user) => (
            <PanelTableRow key={user.id}>
              <PanelTableCell>{personLink(user)}</PanelTableCell>
              <PanelTableCell>{roleLabel(user.role)}</PanelTableCell>
              <PanelTableCell>{products(user)}</PanelTableCell>
              <PanelTableCell>
                {user.role === "ADMIN" ? "Tam yetki" : responsibilityBadges(user.productStaffAssignments.map((row) => row.role)).join(" · ") || "—"}
              </PanelTableCell>
              <PanelTableCell>{statusCell(user)}</PanelTableCell>
              <PanelTableCell>{lastLogin(user)}</PanelTableCell>
            </PanelTableRow>
          ))}
        </PanelTable>
      )}

      {pages > 1 ? (
        <nav aria-label="Sayfalar" className="mt-4 flex flex-wrap items-center gap-1.5">
          {pageWindow(page, pages).map((n, index) =>
            n === null ? (
              <span key={`gap-${index}`} className="px-1 text-pn-text-muted">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={peopleHref(query, { sayfa: n })}
                aria-current={n === page ? "page" : undefined}
                className={buttonClass(n === page ? "primary" : "ghost", "sm", "min-w-8 justify-center")}
              >
                {n}
              </Link>
            ),
          )}
        </nav>
      ) : null}

      {bulkApplies ? (
        <div className="mt-8">
          <UserBulkOperations
            filters={{ ...filters, rol }}
            total={total}
            groups={activeGroups.map((group) => ({ id: group.id, name: `${group.name} · ${group.subject}`, teacherName: name(group.teacher) }))}
            teachers={activeTeachers.map((teacher) => ({ id: teacher.id, name: name(teacher), email: teacher.email, isCoach: teacher.teacherProfile?.isCoach ?? false }))}
            interventionOwners={interventionOwners.map((owner) => ({ id: owner.id, role: owner.role, name: name(owner), email: owner.email }))}
          />
        </div>
      ) : null}

      <p className="mt-4 text-[12.5px] text-pn-text-muted">
        Ayrıntılı eski listeler:{" "}
        <Link href="/panel/yonetim/ogrenciler" className="underline">
          {roleLabel("STUDENT")}
        </Link>
        ,{" "}
        <Link href="/panel/yonetim/egitmenler" className="underline">
          {roleLabel("TEACHER")}
        </Link>
        ,{" "}
        <Link href="/panel/yonetim/veliler" className="underline">
          {roleLabel("PARENT")}
        </Link>
        .
      </p>

      {sp.yeni ? (
        <UrlDrawer param="yeni" title="Yeni kişi" description="Hesap geçici parolayla açılır; davet bağlantısını kişiye iletin. Hesap açmak ürün erişimi vermez.">
          <CreateUserForm />
        </UrlDrawer>
      ) : null}
    </PanelShell>
  );
}
