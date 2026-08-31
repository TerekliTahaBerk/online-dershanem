import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { productLabel } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelEmpty,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
} from "@/components/panel/ui";
import { UserRowActions } from "@/components/panel/user-row-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "dikkat", label: "Dikkat gerekenler" },
  { value: "askida", label: "Askıda" },
  { value: "parola", label: "Parola bekliyor" },
];

function chipHref(base: Record<string, string>, key: string, value: string): string {
  const next = { ...base, [key]: value };
  const qs = new URLSearchParams(
    Object.entries(next).filter(([, v]) => v) as [string, string][],
  ).toString();
  return qs ? `/panel/yonetim/ogrenciler?${qs}` : "/panel/yonetim/ogrenciler";
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

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; urun?: string; durum?: string; sayfa?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const urun = ["OD", "OK", "ODK"].includes(sp.urun ?? "") ? (sp.urun ?? "") : "";
  const durum = STATUS_FILTERS.some((s) => s.value === sp.durum) ? (sp.durum ?? "") : "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);
  const base = { q, urun, durum };

  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(urun
      ? {
          productMemberships: {
            some: {
              product: urun as "OD" | "OK" | "ODK",
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        }
      : {}),
    ...(durum === "askida" ? { status: "SUSPENDED" as const } : {}),
    ...(durum === "parola" ? { mustChangePassword: true } : {}),
    ...(durum === "dikkat"
      ? { odOrders: { some: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } } } }
      : {}),
  };

  const [total, students, attentionCount] = await Promise.all([
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
        mustChangePassword: true,
        productMemberships: {
          where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          select: { product: true },
        },
        odOrders: {
          where: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } },
          select: { id: true },
          take: 1,
        },
        studentProfile: {
          select: {
            targetGoal: true,
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
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "STUDENT",
        odOrders: { some: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } } },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğrenciler"
    >
      <div className="max-w-[1200px]">
        <PanelHeading
          title="Öğrenciler"
          description={`${total} öğrenci${
            attentionCount ? ` · ${attentionCount} tanesi erişim bekliyor` : ""
          }`}
          actions={
            <Link
              href="/panel/yonetim/kullanicilar#yeni-hesap"
              className="rounded-[10px] bg-dc-brand px-[18px] py-[11px] text-[14px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
            >
              Öğrenci hesabı aç
            </Link>
          }
        />

        <form method="get" role="search" className="mt-5 flex flex-wrap items-center gap-2.5">
          <label className="sr-only" htmlFor="ogrenci-ara">
            Ad, e-posta veya telefon ara
          </label>
          <input
            id="ogrenci-ara"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ad, e-posta ya da telefon ara"
            className="min-w-[240px] rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[14px] text-dc-ink placeholder:text-dc-ink-ghost"
          />
          {urun ? <input type="hidden" name="urun" value={urun} /> : null}
          {durum ? <input type="hidden" name="durum" value={durum} /> : null}
          <button
            type="submit"
            className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-dc-ink transition-colors hover:border-dc-brand"
          >
            Ara
          </button>
          {q || urun || durum ? (
            <Link
              href="/panel/yonetim/ogrenciler"
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

        {students.length === 0 ? (
          <PanelEmpty
            title="Bu filtrelerle öğrenci bulunamadı."
            body="Aramayı değiştirebilir ya da filtreleri temizleyebilirsin."
          />
        ) : (
          <div className="mt-5">
            <PanelTable
              caption="Öğrenci kayıtları"
              columns={["Öğrenci", "Hedef", "Ürünler", "Öğretmen / grup", "Durum", ""]}
            >
              {students.map((student) => {
                const products = student.productMemberships.map((m) => productLabel(m.product));
                const enrollment = student.studentProfile?.enrollments[0];
                const status = student.odOrders.length
                  ? { label: "Ödeme alındı, erişim yok", tone: "warn" as const }
                  : student.status === "SUSPENDED"
                    ? { label: "Askıda", tone: "warn" as const }
                    : student.mustChangePassword
                      ? { label: "Parola bekliyor", tone: "warn" as const }
                      : { label: "Aktif", tone: "ok" as const };

                return (
                  <PanelTableRow key={student.id}>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/kullanicilar/${student.id}`}
                        className="text-[14px] font-bold text-dc-ink underline-offset-2 hover:text-dc-brand-hover hover:underline"
                      >
                        {student.fullName || student.email}
                      </Link>
                      <span className="mt-0.5 block text-[12.5px] text-dc-ink-faint">
                        {student.email}
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>{student.studentProfile?.targetGoal || "—"}</PanelTableCell>
                    <PanelTableCell>{products.length ? products.join(" · ") : "—"}</PanelTableCell>
                    <PanelTableCell>
                      {enrollment
                        ? `${enrollment.group.teacher.fullName || enrollment.group.teacher.email} · ${enrollment.group.name}`
                        : "—"}
                    </PanelTableCell>
                    <PanelTableCell tone={status.tone}>{status.label}</PanelTableCell>
                    <PanelTableCell>
                      <UserRowActions
                        userId={student.id}
                        email={student.email}
                        fullName={student.fullName}
                        phone={student.phone}
                        status={student.status}
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
      </div>
    </PanelShell>
  );
}
