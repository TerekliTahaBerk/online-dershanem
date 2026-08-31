import Link from "next/link";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { productLabel, roleLabel } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelCard,
  PanelCardTitle,
  PanelHeading,
  PanelEmpty,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
} from "@/components/panel/ui";
import { CreateUserForm } from "@/components/panel/create-user-form";
import { UserRowActions } from "@/components/panel/user-row-actions";
import { ApproveMfaResetButton } from "@/components/panel/mfa-reset-controls";

export const dynamic = "force-dynamic";

/**
 * ADMIN · KİŞİLER — onaylı tasarım (Panel.dc.html → astudents).
 *
 * Tasarımın istediği üç şey eski sürümde YOKTU ve burada gerçek olarak
 * kuruldu: arama, filtreler ve sayfalama. Hepsi SUNUCUDA çalışır
 * (`searchParams` → Prisma `where`), istemcide liste süzme yapılmaz; 1.000+
 * kayıtta tarayıcıya bütün tabloyu göndermek doğru olmaz.
 *
 * Tasarımdaki "Koç" sütunu YOK: şemada koç ataması modeli bulunmuyor
 * (koçluk `WeeklyPlan` onayı olarak yaşıyor). Boş bir sütun çizmek yerine
 * sütun hiç basılmadı.
 *
 * "Durum" gerçek sinyalden türetilir — askıya alınmış hesap, parola bekleyen
 * ilk giriş ve ödenmiş ama erişimi açılmamış sipariş. Tasarımdaki kırmızı
 * "Ödeme alındı, erişim yok" satırı budur ve kişi detayına bağlanır.
 *
 * Korunan bölümler: yeni hesap formu ve MFA sıfırlama onay kuyruğu.
 */

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });
const PAGE_SIZE = 25;

const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "STUDENT", label: "Öğrenci" },
  { value: "TEACHER", label: "Eğitmen" },
  { value: "PARENT", label: "Veli" },
  { value: "ADMIN", label: "Yönetici" },
];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "dikkat", label: "Dikkat gerekenler" },
  { value: "profil", label: "Profil eksik" },
  { value: "erisim-yok", label: "Erişim eksik" },
  { value: "davet", label: "Davet bekliyor" },
  { value: "askida", label: "Askıda" },
  { value: "arsiv", label: "Arşivde" },
  { value: "parola", label: "Parola bekliyor" },
];

function formatDate(value: Date | null): string {
  return value ? DATE.format(value) : "—";
}

/** Filtre çipi — seçili değeri koruyarak yeni sorgu dizesi kurar. */
function chipHref(base: Record<string, string>, key: string, value: string): string {
  const next = { ...base, [key]: value };
  const qs = new URLSearchParams(
    Object.entries(next).filter(([, v]) => v) as [string, string][],
  ).toString();
  return qs ? `/panel/yonetim/kullanicilar?${qs}` : "/panel/yonetim/kullanicilar";
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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rol?: string; urun?: string; durum?: string; sayfa?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const rol = ROLE_FILTERS.some((r) => r.value === sp.rol) ? (sp.rol ?? "") : "";
  const urun = ["OD", "OK", "ODK"].includes(sp.urun ?? "") ? (sp.urun ?? "") : "";
  const durum = STATUS_FILTERS.some((s) => s.value === sp.durum) ? (sp.durum ?? "") : "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);
  const base = { q, rol, urun, durum };

  const where: Prisma.UserWhereInput = {
    ...(rol ? { role: rol as UserRole } : {}),
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
    ...(durum === "arsiv" ? { status: "ARCHIVED" as const } : {}),
    ...(durum === "davet" ? { inviteAcceptedAt: null } : {}),
    ...(durum === "parola" ? { mustChangePassword: true, NOT: { inviteAcceptedAt: null } } : {}),
    ...(durum === "profil"
      ? {
          OR: [
            { role: "STUDENT", studentProfile: null },
            { role: "TEACHER", teacherProfile: null },
          ],
        }
      : {}),
    ...(durum === "erisim-yok"
      ? {
          role: "STUDENT",
          NOT: {
            productMemberships: {
              some: {
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        }
      : {}),
    // "Dikkat gerekenler": ödenmiş ama erişimi açılmamış siparişi olanlar.
    ...(durum === "dikkat"
      ? { odOrders: { some: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } } } }
      : {}),
  };

  const [total, users, pendingMfaResets, attentionCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        mustChangePassword: true,
        inviteAcceptedAt: true,
        lastLoginAt: true,
        createdAt: true,
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
                group: { select: { name: true, teacher: { select: { fullName: true, email: true } } } },
              },
              take: 2,
            },
          },
        },
        teacherProfile: { select: { id: true } },
      },
    }),
    // Çift kontrollü MFA sıfırlama kuyruğu — onayı isteği açandan BAŞKA bir
    // yönetici verir, o yüzden liste tüm yöneticilere gösterilir.
    prisma.mfaResetRequest.findMany({
      where: { status: "PENDING", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: {
        target: { select: { id: true, fullName: true, email: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.user.count({
      where: { odOrders: { some: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } } } },
    }),
  ]);
  const [studentsWithoutProfile, teachersWithoutProfile, studentsWithoutActiveProduct] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", studentProfile: null } }),
      prisma.user.count({ where: { role: "TEACHER", teacherProfile: null } }),
      prisma.user.count({
        where: {
          role: "STUDENT",
          NOT: {
            productMemberships: {
              some: {
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        },
      }),
    ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const integrityCount = studentsWithoutProfile + teachersWithoutProfile + studentsWithoutActiveProduct;

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Kişiler"
    >
      <div className="max-w-[1200px]">
        <PanelHeading
          title="Kişiler"
          description={`${total} kayıt${
            attentionCount ? ` · ${attentionCount} tanesi erişim bekliyor` : ""
          }`}
          actions={
            <Link
              href="#yeni-hesap"
              className="rounded-[10px] bg-dc-brand px-[18px] py-[11px] text-[14px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
            >
              Hesap ekle
            </Link>
          }
        />

        {integrityCount > 0 ? (
          <PanelCard className="mt-5 border-amber-200 bg-amber-50/50">
            <PanelCardTitle>Veri bütünlüğü sinyali</PanelCardTitle>
            <p className="mt-2 text-[13px] leading-[1.6] text-dc-ink-body">
              Rol ve profil verileri tam eşleşmeyen hesaplar var. Bu kayıtlar operasyon akışında
              sessiz hataya yol açabilir.
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-dc-ink-body">
              {studentsWithoutProfile > 0 ? (
                <li>
                  • <Link href="/panel/yonetim/kullanicilar?durum=profil&rol=STUDENT" className="font-semibold text-dc-brand hover:underline">Profili olmayan öğrenci</Link>: {studentsWithoutProfile}
                </li>
              ) : null}
              {teachersWithoutProfile > 0 ? (
                <li>
                  • <Link href="/panel/yonetim/kullanicilar?durum=profil&rol=TEACHER" className="font-semibold text-dc-brand hover:underline">Profili olmayan öğretmen</Link>: {teachersWithoutProfile}
                </li>
              ) : null}
              {studentsWithoutActiveProduct > 0 ? (
                <li>
                  • <Link href="/panel/yonetim/kullanicilar?durum=erisim-yok" className="font-semibold text-dc-brand hover:underline">Aktif ürün erişimi olmayan öğrenci</Link>: {studentsWithoutActiveProduct}
                </li>
              ) : null}
            </ul>
          </PanelCard>
        ) : null}

        {/* ── Arama ve filtreler ── */}
        <form method="get" role="search" className="mt-5 flex flex-wrap items-center gap-2.5">
          <label className="sr-only" htmlFor="kisi-ara">
            Ad, e-posta veya telefon ara
          </label>
          <input
            id="kisi-ara"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ad, e-posta ya da telefon ara"
            className="min-w-[240px] rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[14px] text-dc-ink placeholder:text-dc-ink-ghost"
          />
          {rol ? <input type="hidden" name="rol" value={rol} /> : null}
          {urun ? <input type="hidden" name="urun" value={urun} /> : null}
          {durum ? <input type="hidden" name="durum" value={durum} /> : null}
          <button
            type="submit"
            className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-dc-ink transition-colors hover:border-dc-brand"
          >
            Ara
          </button>
          {q || rol || urun || durum ? (
            <Link
              href="/panel/yonetim/kullanicilar"
              className="text-[13.5px] font-semibold text-dc-brand hover:underline"
            >
              Filtreleri temizle
            </Link>
          ) : null}
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-semibold text-dc-ink-faint">Rol:</span>
          {ROLE_FILTERS.map((r) => (
            <Chip key={r.value || "all"} href={chipHref(base, "rol", r.value)} active={rol === r.value}>
              {r.label}
            </Chip>
          ))}
        </div>

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

        {/* ── Liste ── */}
        {users.length === 0 ? (
          <PanelEmpty
            title="Bu filtrelerle kayıt bulunamadı."
            body="Aramayı değiştirebilir ya da filtreleri temizleyebilirsin."
          />
        ) : (
          <div className="mt-5">
            <PanelTable
              caption="Kişi kayıtları"
              columns={["Kişi", "Rol", "Sınav", "Ürünler", "Öğretmen / grup", "Durum", ""]}
            >
              {users.map((user) => {
                const products = user.productMemberships.map((m) => productLabel(m.product));
                const enrollment = user.studentProfile?.enrollments[0];
                const status = user.odOrders.length
                  ? { label: "Ödeme alındı, erişim yok", tone: "warn" as const }
                  : user.status === "ARCHIVED"
                    ? { label: "Arşivde", tone: "warn" as const }
                  : user.status === "SUSPENDED"
                    ? { label: "Askıda", tone: "warn" as const }
                    : !user.inviteAcceptedAt
                      ? { label: "Davet bekliyor", tone: "warn" as const }
                    : user.mustChangePassword
                      ? { label: "Parola bekliyor", tone: "warn" as const }
                      : user.role === "STUDENT" && !user.studentProfile
                        ? { label: "Profil eksik", tone: "warn" as const }
                        : user.role === "TEACHER" && !user.teacherProfile
                          ? { label: "Profil eksik", tone: "warn" as const }
                          : user.role === "STUDENT" && products.length === 0
                            ? { label: "Erişim eksik", tone: "warn" as const }
                      : { label: "Aktif", tone: "ok" as const };

                return (
                  <PanelTableRow key={user.id}>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/kullanicilar/${user.id}`}
                        className="text-[14px] font-bold text-dc-ink underline-offset-2 hover:text-dc-brand-hover hover:underline"
                      >
                        {user.fullName || user.email}
                      </Link>
                      <span className="mt-0.5 block text-[12.5px] text-dc-ink-faint">
                        {user.email}
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>{roleLabel(user.role)}</PanelTableCell>
                    <PanelTableCell>{user.studentProfile?.targetGoal || "—"}</PanelTableCell>
                    <PanelTableCell>{products.length ? products.join(" · ") : "—"}</PanelTableCell>
                    <PanelTableCell>
                      {enrollment
                        ? `${enrollment.group.teacher.fullName || enrollment.group.teacher.email} · ${enrollment.group.name}`
                        : "—"}
                    </PanelTableCell>
                    <PanelTableCell tone={status.tone}>{status.label}</PanelTableCell>
                    <PanelTableCell>
                      <UserRowActions
                        userId={user.id}
                        email={user.email}
                        fullName={user.fullName}
                        phone={user.phone}
                        status={user.status}
                        inviteAcceptedAt={user.inviteAcceptedAt?.toISOString() ?? null}
                        isSelf={user.id === session.userId}
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

        {/* ── Bekleyen MFA sıfırlama onayları ── */}
        {pendingMfaResets.length ? (
          <section className="mt-7 rounded-[14px] border border-dc-line border-l-[3px] border-l-[#C2493D] bg-white p-[22px]">
            <h2 className="text-[16px] font-bold text-dc-ink">
              Bekleyen MFA sıfırlama onayı ({pendingMfaResets.length})
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-dc-ink-muted">
              Onayı, isteği açan ve hedef yöneticiden farklı bir yönetici vermelidir.
              Onaylandığında hedefin tüm doğrulama yöntemleri silinir ve oturumları kapatılır.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {pendingMfaResets.map((reset) => {
                const blocked =
                  reset.targetUserId === session.userId || reset.requestedById === session.userId;
                return (
                  <li
                    key={reset.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-dc-line p-4"
                  >
                    <div className="min-w-[220px] flex-1">
                      <p className="text-[13.5px] font-bold text-dc-ink">
                        {reset.target.fullName || reset.target.email}
                      </p>
                      <p className="mt-1 text-[12.5px] text-dc-ink-faint">
                        İsteyen: {reset.requestedBy.fullName || reset.requestedBy.email} · son
                        geçerlilik {formatDate(reset.expiresAt)}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-[1.6] text-dc-ink-body">
                        {reset.reason}
                      </p>
                    </div>
                    {blocked ? (
                      <p className="text-[12.5px] font-semibold text-[#C2493D]">
                        Bu isteği siz onaylayamazsınız.
                      </p>
                    ) : (
                      <ApproveMfaResetButton requestId={reset.id} />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ── Yeni hesap ── */}
        <PanelCard id="yeni-hesap" className="mt-7 scroll-mt-28">
          <PanelCardTitle>Yeni hesap aç</PanelCardTitle>
          <div className="mt-4">
            <CreateUserForm />
          </div>
        </PanelCard>

        {/* ── Veli operasyonları ── */}
        <PanelCard className="mt-5">
          <PanelCardTitle>Veli ve ilişki operasyonları</PanelCardTitle>
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-dc-line p-4">
            <p className="text-[13px] text-dc-ink-muted">
              Veli dizini, öğrenci bağlantıları ve ilişki geçmişi artık ayrı operasyon ekranında yönetilir.
            </p>
            <Link
              href="/panel/yonetim/veliler"
              className="rounded-[10px] bg-dc-brand px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
            >
              Veliler ekranını aç
            </Link>
          </div>
        </PanelCard>
      </div>
    </PanelShell>
  );
}
