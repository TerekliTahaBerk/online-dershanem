import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { productLabel, roleLabel } from "@/lib/auth/roles";
import { buildUserWhere } from "@/lib/panel/user-filters";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelCard,
  PanelEmpty,
  PanelHeading,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
} from "@/components/panel/ui";
import { CreateUserForm } from "@/components/panel/create-user-form";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

export const dynamic = "force-dynamic";

/**
 * ADMIN · KİŞİLER — tek merkez, rol sekmeleri.
 * Az sayfa / güçlü detay: liste karar bilgisi; derin işlem Student 360 / kişi detayında.
 */

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const PAGE_SIZE = 30;

type PeopleTab = "STUDENT" | "TEACHER" | "PARENT";

function parseTab(raw: string | undefined): PeopleTab {
  if (raw === "TEACHER" || raw === "ogretmenler") return "TEACHER";
  if (raw === "PARENT" || raw === "veliler") return "PARENT";
  return "STUDENT";
}

function tabHref(tab: PeopleTab, q: string) {
  const params = new URLSearchParams();
  params.set("sekme", tab === "STUDENT" ? "ogrenciler" : tab === "TEACHER" ? "ogretmenler" : "veliler");
  if (q) params.set("q", q);
  return `/panel/yonetim/kisiler?${params.toString()}`;
}

export default async function PeopleHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sekme?: string; sayfa?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const tab = parseTab(sp.sekme);
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);
  const where = buildUserWhere({
    q,
    rol: tab,
    urun: "",
    durum: "",
  });

  const [total, users] = await Promise.all([
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
        productMemberships: {
          where: { revokedAt: null },
          select: { product: true },
        },
        studentProfile: {
          select: {
            id: true,
            classLevel: true,
            examType: true,
            parents: {
              where: { active: true },
              select: { parent: { select: { fullName: true, email: true } } },
              take: 2,
            },
            enrollments: {
              where: { endedAt: null },
              select: {
                group: {
                  select: {
                    name: true,
                    teacher: { select: { fullName: true, email: true } },
                  },
                },
              },
              take: 2,
            },
            teacherAssignments: {
              where: { active: true },
              select: {
                subject: true,
                teacher: { select: { fullName: true, email: true } },
              },
              take: 3,
            },
          },
        },
        teacherProfile: {
          select: {
            subjects: true,
            maxStudentCapacity: true,
          },
        },
        taughtGroups: {
          where: { isActive: true },
          select: { id: true, _count: { select: { enrollments: { where: { endedAt: null } } } } },
        },
        studentTeacherAssignments: {
          where: { active: true },
          select: { id: true },
        },
        taughtLessons: {
          where: {
            status: "PLANNED",
            startsAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(24, 0, 0, 0)),
            },
          },
          select: { id: true },
        },
        parentStudents: {
          where: { active: true },
          select: {
            student: {
              select: { user: { select: { fullName: true, email: true } } },
            },
          },
          take: 3,
        },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabs: { id: PeopleTab; label: string; sekme: string }[] = [
    { id: "STUDENT", label: PANEL_DOMAIN.ogrenciler, sekme: "ogrenciler" },
    { id: "TEACHER", label: PANEL_DOMAIN.ogretmenler, sekme: "ogretmenler" },
    { id: "PARENT", label: PANEL_DOMAIN.veliler, sekme: "veliler" },
  ];

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle={PANEL_DOMAIN.kisiler}>
      <PanelHeading
        title={PANEL_DOMAIN.kisiler}
        description="Öğrenci, öğretmen ve velileri tek ekrandan yönetin. Detay için satıra gidin."
      />

      <PanelCard className="mt-6">
        <CreateUserForm />
      </PanelCard>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={tabHref(item.id, q)}
            aria-current={tab === item.id ? "true" : undefined}
            className={`rounded-[10px] border px-3.5 py-2.5 text-[13.5px] font-semibold ${
              tab === item.id
                ? "border-dc-brand bg-dc-brand-soft text-dc-brand-hover"
                : "border-[#DDE4E0] bg-white text-dc-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <form className="ml-auto flex gap-2" action="/panel/yonetim/kisiler" method="get">
          <input type="hidden" name="sekme" value={tabs.find((t) => t.id === tab)?.sekme ?? "ogrenciler"} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Hızlı ara…"
            className="rounded-[10px] border border-[#DDE4E0] px-3.5 py-2.5 text-[13.5px]"
          />
          <button className="site-btn site-btn-secondary site-btn-sm">Ara</button>
        </form>
      </div>

      <PanelCard className="mt-4 overflow-x-auto">
        {users.length === 0 ? (
          <PanelEmpty title="Kayıt yok" body="Bu sekmede eşleşen kişi bulunamadı." />
        ) : tab === "STUDENT" ? (
          <PanelTable
            caption="Öğrenciler"
            columns={[
              "Ad soyad",
              "Sınıf",
              "Sınav",
              "Ürünler",
              "Grup",
              "Öğretmen",
              "Veli",
              "Durum",
              "Son aktivite",
            ]}
          >
            {users.map((user) => {
              const profile = user.studentProfile;
              const detailHref = profile
                ? `/panel/yonetim/ogrenciler/${profile.id}`
                : `/panel/yonetim/kullanicilar/${user.id}`;
              const group = profile?.enrollments[0]?.group;
              const teachers = [
                ...(profile?.teacherAssignments.map(
                  (link) => `${link.subject} → ${link.teacher.fullName || link.teacher.email}`,
                ) ?? []),
                ...(group ? [`${group.name}: ${group.teacher.fullName || group.teacher.email}`] : []),
              ];
              return (
                <PanelTableRow key={user.id}>
                  <PanelTableCell>
                    <Link href={detailHref} className="font-semibold text-dc-ink hover:underline">
                      {user.fullName || user.email}
                    </Link>
                    <div className="text-[12px] text-dc-ink-muted">{user.email}</div>
                  </PanelTableCell>
                  <PanelTableCell>{profile?.classLevel || "—"}</PanelTableCell>
                  <PanelTableCell>{profile?.examType || "—"}</PanelTableCell>
                  <PanelTableCell>
                    {user.productMemberships.map((m) => productLabel(m.product)).join(", ") || "—"}
                  </PanelTableCell>
                  <PanelTableCell>{group?.name || "—"}</PanelTableCell>
                  <PanelTableCell>{teachers.slice(0, 2).join(" · ") || "—"}</PanelTableCell>
                  <PanelTableCell>
                    {profile?.parents
                      .map((p) => p.parent.fullName || p.parent.email)
                      .join(", ") || "—"}
                  </PanelTableCell>
                  <PanelTableCell>
                    {user.status}
                    {!user.inviteAcceptedAt ? " · davet" : ""}
                  </PanelTableCell>
                  <PanelTableCell>
                    {user.lastLoginAt ? DATE.format(user.lastLoginAt) : "—"}
                  </PanelTableCell>
                </PanelTableRow>
              );
            })}
          </PanelTable>
        ) : tab === "TEACHER" ? (
          <PanelTable
            caption="Öğretmenler"
            columns={["Ad soyad", "Branş", "Öğrenci", "Grup", "Bugün ders", "Durum"]}
          >
            {users.map((user) => {
              const studentCount =
                user.taughtGroups.reduce((sum, g) => sum + g._count.enrollments, 0) +
                user.studentTeacherAssignments.length;
              return (
                <PanelTableRow key={user.id}>
                  <PanelTableCell>
                    <Link
                      href={`/panel/yonetim/kullanicilar/${user.id}`}
                      className="font-semibold text-dc-ink hover:underline"
                    >
                      {user.fullName || user.email}
                    </Link>
                  </PanelTableCell>
                  <PanelTableCell>
                    {user.teacherProfile?.subjects.join(", ") || "—"}
                  </PanelTableCell>
                  <PanelTableCell>{studentCount}</PanelTableCell>
                  <PanelTableCell>{user.taughtGroups.length}</PanelTableCell>
                  <PanelTableCell>{user.taughtLessons.length}</PanelTableCell>
                  <PanelTableCell>{user.status}</PanelTableCell>
                </PanelTableRow>
              );
            })}
          </PanelTable>
        ) : (
          <PanelTable
            caption="Veliler"
            columns={["Ad soyad", "Bağlı öğrenciler", "İletişim", "Durum", "Son giriş"]}
          >
            {users.map((user) => (
              <PanelTableRow key={user.id}>
                <PanelTableCell>
                  <Link
                    href={`/panel/yonetim/kullanicilar/${user.id}`}
                    className="font-semibold text-dc-ink hover:underline"
                  >
                    {user.fullName || user.email}
                  </Link>
                </PanelTableCell>
                <PanelTableCell>
                  {user.parentStudents
                    .map((link) => link.student.user.fullName || link.student.user.email)
                    .join(", ") || "—"}
                </PanelTableCell>
                <PanelTableCell>
                  {[user.phone, user.email].filter(Boolean).join(" · ")}
                </PanelTableCell>
                <PanelTableCell>{user.status}</PanelTableCell>
                <PanelTableCell>
                  {user.lastLoginAt ? DATE.format(user.lastLoginAt) : "—"}
                </PanelTableCell>
              </PanelTableRow>
            ))}
          </PanelTable>
        )}
      </PanelCard>

      {pages > 1 ? (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: pages }, (_, index) => {
            const n = index + 1;
            const params = new URLSearchParams();
            params.set(
              "sekme",
              tab === "STUDENT" ? "ogrenciler" : tab === "TEACHER" ? "ogretmenler" : "veliler",
            );
            if (q) params.set("q", q);
            params.set("sayfa", String(n));
            return (
              <Link
                key={n}
                href={`/panel/yonetim/kisiler?${params.toString()}`}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  n === page ? "border-dc-brand bg-dc-brand-soft" : "border-[#DDE4E0]"
                }`}
              >
                {n}
              </Link>
            );
          })}
        </div>
      ) : null}

      <p className="mt-4 text-[12.5px] text-dc-ink-muted">
        Eski listeler:{" "}
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
    </PanelShell>
  );
}
