import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelCard,
  PanelCardTitle,
  PanelEmpty,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
} from "@/components/panel/ui";
import { UserRowActions } from "@/components/panel/user-row-actions";
import { StudentParentLinkForm } from "@/components/panel/student-parent-link-form";
import { RelationshipRemoveButton } from "@/components/panel/relationship-remove-button";
import { RelationshipUpdateForm } from "@/components/panel/relationship-update-form";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "baglantisiz", label: "Öğrenci bağlantısı yok" },
  { value: "davet", label: "Davet bekliyor" },
  { value: "askida", label: "Askıda" },
  { value: "arsiv", label: "Arşivde" },
  { value: "parola", label: "Parola bekliyor" },
];

function chipHref(base: Record<string, string>, key: string, value: string): string {
  const next = { ...base, [key]: value };
  const qs = new URLSearchParams(
    Object.entries(next).filter(([, v]) => v) as [string, string][],
  ).toString();
  return qs ? `/panel/yonetim/veliler?${qs}` : "/panel/yonetim/veliler";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-[10px] border px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
        active
          ? "border-dc-brand bg-dc-brand-soft text-dc-brand-hover"
          : "border-[#DDE4E0] bg-white text-dc-ink hover:border-dc-brand"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string; sayfa?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const durum = STATUS_FILTERS.some((s) => s.value === sp.durum) ? (sp.durum ?? "") : "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);
  const base = { q, durum };

  const where: Prisma.UserWhereInput = {
    role: "PARENT",
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(durum === "askida" ? { status: "SUSPENDED" as const } : {}),
    ...(durum === "arsiv" ? { status: "ARCHIVED" as const } : {}),
    ...(durum === "davet" ? { inviteAcceptedAt: null } : {}),
    ...(durum === "parola" ? { mustChangePassword: true, NOT: { inviteAcceptedAt: null } } : {}),
    ...(durum === "baglantisiz" ? { parentStudents: { none: {} } } : {}),
  };

  const [total, parents, withoutRelationshipCount, activeRelationships, relationshipHistory, studentOptions, parentOptions] =
    await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        inviteAcceptedAt: true,
        mustChangePassword: true,
        parentStudents: {
          select: {
            relationship: true,
            student: { select: { user: { select: { fullName: true, email: true } } } },
          },
          take: 3,
        },
      },
    }),
      prisma.user.count({
        where: {
          role: "PARENT",
          parentStudents: { none: {} },
        },
      }),
      prisma.parentStudent.findMany({
        orderBy: { createdAt: "desc" },
        take: 80,
        include: {
          parent: { select: { fullName: true, email: true } },
          student: { include: { user: { select: { fullName: true, email: true } } } },
        },
      }),
      prisma.parentStudentHistory.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
        include: {
          parent: { select: { fullName: true, email: true } },
          student: { include: { user: { select: { fullName: true, email: true } } } },
          actor: { select: { fullName: true, email: true } },
        },
      }),
      prisma.studentProfile.findMany({
        orderBy: { user: { fullName: "asc" } },
        take: 300,
        select: {
          id: true,
          user: { select: { fullName: true, email: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "PARENT", status: { in: ["ACTIVE", "SUSPENDED"] } },
        orderBy: { fullName: "asc" },
        take: 300,
        select: { id: true, fullName: true, email: true },
      }),
    ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Veliler"
    >
      <div className="max-w-[1200px]">
        <PanelHeading
          title="Veliler"
          description={`${total} veli${
            withoutRelationshipCount ? ` · ${withoutRelationshipCount} tanesi bağlantısız` : ""
          }`}
          actions={
            <Link
              href="/panel/yonetim/kullanicilar#yeni-hesap"
              className="rounded-[10px] bg-dc-brand px-[18px] py-[11px] text-[14px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
            >
              Veli hesabı aç
            </Link>
          }
        />

        <form method="get" role="search" className="mt-5 flex flex-wrap items-center gap-2.5">
          <label className="sr-only" htmlFor="veli-ara">
            Ad, e-posta veya telefon ara
          </label>
          <input
            id="veli-ara"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ad, e-posta ya da telefon ara"
            className="min-w-[240px] rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[14px] text-dc-ink placeholder:text-dc-ink-ghost"
          />
          {durum ? <input type="hidden" name="durum" value={durum} /> : null}
          <button
            type="submit"
            className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-dc-ink transition-colors hover:border-dc-brand"
          >
            Ara
          </button>
          {q || durum ? (
            <Link
              href="/panel/yonetim/veliler"
              className="text-[13.5px] font-semibold text-dc-brand hover:underline"
            >
              Filtreleri temizle
            </Link>
          ) : null}
        </form>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-semibold text-dc-ink-faint">Durum:</span>
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s.value || "all"}
              href={chipHref(base, "durum", s.value)}
              active={durum === s.value}
            >
              {s.label}
            </Chip>
          ))}
        </div>

        {parents.length === 0 ? (
          <PanelEmpty
            title="Bu filtrelerle veli bulunamadı."
            body="Aramayı değiştirebilir ya da filtreleri temizleyebilirsin."
          />
        ) : (
          <div className="mt-5">
            <PanelTable
              caption="Veli kayıtları"
              columns={["Veli", "Bağlı öğrenci", "Öğrenci listesi", "Durum", ""]}
            >
              {parents.map((parent) => {
                const status = parent.status === "SUSPENDED"
                  ? { label: "Askıda", tone: "warn" as const }
                  : parent.status === "ARCHIVED"
                    ? { label: "Arşivde", tone: "warn" as const }
                    : !parent.inviteAcceptedAt
                      ? { label: "Davet bekliyor", tone: "warn" as const }
                  : parent.mustChangePassword
                    ? { label: "Parola bekliyor", tone: "warn" as const }
                    : parent.parentStudents.length === 0
                      ? { label: "Öğrenci bağlantısı yok", tone: "warn" as const }
                      : { label: "Aktif", tone: "ok" as const };

                const relatedStudents = parent.parentStudents.map((link) => {
                  const studentName = link.student.user.fullName || link.student.user.email;
                  return link.relationship ? `${studentName} (${link.relationship})` : studentName;
                });

                return (
                  <PanelTableRow key={parent.id}>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/kullanicilar/${parent.id}`}
                        className="text-[14px] font-bold text-dc-ink underline-offset-2 hover:text-dc-brand-hover hover:underline"
                      >
                        {parent.fullName || parent.email}
                      </Link>
                      <span className="mt-0.5 block text-[12.5px] text-dc-ink-faint">
                        {parent.email}
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>{parent.parentStudents.length}</PanelTableCell>
                    <PanelTableCell>{relatedStudents.length ? relatedStudents.join(" · ") : "—"}</PanelTableCell>
                    <PanelTableCell tone={status.tone}>{status.label}</PanelTableCell>
                    <PanelTableCell>
                      <UserRowActions
                        userId={parent.id}
                        email={parent.email}
                        fullName={parent.fullName}
                        phone={parent.phone}
                        status={parent.status}
                        inviteAcceptedAt={parent.inviteAcceptedAt?.toISOString() ?? null}
                        isSelf={false}
                      />
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-dc-ink-faint">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
              </span>
              {pageCount > 1 ? (
                <nav className="flex items-center gap-2" aria-label="Sayfalama">
                  {page > 1 ? (
                    <Link
                      href={chipHref(base, "sayfa", String(page - 1))}
                      className="rounded-lg border border-[#DDE4E0] bg-white px-3 py-1.5 font-semibold text-dc-ink hover:border-dc-brand"
                    >
                      Önceki
                    </Link>
                  ) : null}
                  <span>
                    Sayfa {page} / {pageCount}
                  </span>
                  {page < pageCount ? (
                    <Link
                      href={chipHref(base, "sayfa", String(page + 1))}
                      className="rounded-lg border border-[#DDE4E0] bg-white px-3 py-1.5 font-semibold text-dc-ink hover:border-dc-brand"
                    >
                      Sonraki
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          <PanelCard>
            <PanelCardTitle>İlişki işlemleri</PanelCardTitle>
            <p className="mt-2 text-[12.5px] text-dc-ink-faint">
              Veli–öğrenci bağlantısı ekleyin, yakınlık bilgisini güncelleyin veya bağlantıyı kaldırın.
            </p>
            <StudentParentLinkForm
              parents={parentOptions.map((parent) => ({ id: parent.id, name: parent.fullName || parent.email }))}
              students={studentOptions.map((student) => ({
                id: student.id,
                name: student.user.fullName || student.user.email,
              }))}
            />
            <div className="mt-3.5 flex max-h-[360px] flex-col gap-2 overflow-auto pr-1">
              {activeRelationships.map((relationship) => (
                <div
                  key={relationship.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dc-line p-3"
                >
                  <div className="min-w-[220px] flex-1">
                    <p className="text-[13px] font-bold text-dc-ink">
                      {relationship.parent.fullName || relationship.parent.email}
                    </p>
                    <p className="mt-1 text-[12px] text-dc-ink-muted">
                      {relationship.relationship || "Veli"} →{" "}
                      {relationship.student.user.fullName || relationship.student.user.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RelationshipUpdateForm id={relationship.id} initialRelationship={relationship.relationship} />
                    <RelationshipRemoveButton id={relationship.id} />
                  </div>
                </div>
              ))}
              {!activeRelationships.length ? (
                <p className="text-[13px] text-dc-ink-muted">Aktif veli bağlantısı yok.</p>
              ) : null}
            </div>
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>İlişki geçmişi</PanelCardTitle>
            <div className="mt-3.5 flex max-h-[420px] flex-col gap-2 overflow-auto pr-1">
              {relationshipHistory.map((item) => (
                <div key={item.id} className="rounded-[10px] border border-dc-line p-3">
                  <p className="text-[12.5px] font-semibold text-dc-ink">
                    {item.parent.fullName || item.parent.email} ·{" "}
                    {item.student.user.fullName || item.student.user.email}
                  </p>
                  <p className="mt-1 text-[12px] text-dc-ink-muted">
                    {item.action === "LINKED"
                      ? "Bağlantı eklendi"
                      : item.action === "UPDATED"
                        ? "Yakınlık güncellendi"
                        : "Bağlantı kaldırıldı"}
                    {item.relationship ? ` · ${item.relationship}` : ""}
                  </p>
                  <p className="mt-1 text-[11.5px] text-dc-ink-faint">
                    {DATE_TIME.format(item.createdAt)} ·{" "}
                    {item.actor?.fullName || item.actor?.email || "Sistem"}
                  </p>
                </div>
              ))}
              {!relationshipHistory.length ? (
                <p className="text-[13px] text-dc-ink-muted">Henüz ilişki geçmişi kaydı yok.</p>
              ) : null}
            </div>
          </PanelCard>
        </div>
      </div>
    </PanelShell>
  );
}
