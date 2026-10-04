import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { productLabel } from "@/lib/auth/roles";
import { whatsAppLink } from "@/lib/phone";
import {
  CLASS_LEVEL_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CONTACT_TIME_OPTIONS,
  EXAM_TYPE_OPTIONS,
  HEARD_FROM_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  optionLabel,
} from "@/lib/account/dictionaries";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelEmpty, PanelFilterLink, PanelHeading, PanelStatusBadge } from "@/components/panel/ui";
import { SignupContactControl } from "@/components/panel/signups/signup-contact-control";
import { ChildAccountForm } from "@/components/panel/signups/child-account-form";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const PAGE_SIZE = 40;

type Tab = "kayitlar" | "cocuklar";
type Filter = "tumu" | "yeni" | "satin-aldi" | "form-yok" | "veli" | "ogrenci";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "tumu", label: "Tümü" },
  { value: "yeni", label: "Aranmadı" },
  { value: "satin-aldi", label: "Satın aldığını belirtti" },
  { value: "form-yok", label: "Form doldurulmadı" },
  { value: "ogrenci", label: "Öğrenciler" },
  { value: "veli", label: "Veliler" },
];

function filterWhere(filter: Filter): Prisma.UserWhereInput {
  switch (filter) {
    case "yeni":
      return { OR: [{ signupProfile: { contactStatus: "NEW" } }, { signupProfile: null }] };
    case "satin-aldi":
      return { signupProfile: { purchaseStatus: "ALREADY_PURCHASED" } };
    case "form-yok":
      return { contactFormSubmittedAt: null };
    case "ogrenci":
      return { role: "STUDENT" };
    case "veli":
      return { role: "PARENT" };
    default:
      return {};
  }
}

function telHref(phone: string | null) {
  return phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
}

/**
 * YÖNETİM · YENİ KAYITLAR.
 *
 * Kendi kendine kayıt olan öğrenci ve veliler: kim, neyle ilgileniyor, satın
 * aldı mı, iletişim formunu doldurdu mu. Ekip buradan hızlıca arar (tel: /
 * WhatsApp), durumu işaretler ve velinin bildirdiği çocuklar için öğrenci
 * hesabını tek tıkla açar. Ödenmiş siparişi olan çocuklar en üstte.
 */
export default async function SignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string; filtre?: string; sayfa?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const params = await searchParams;
  const tab: Tab = params.sekme === "cocuklar" ? "cocuklar" : "kayitlar";
  const filter = (FILTERS.find((item) => item.value === params.filtre)?.value ?? "tumu") as Filter;
  const page = Math.max(1, Number.parseInt(params.sayfa ?? "1", 10) || 1);

  const [pendingCount, newCount] = await Promise.all([
    prisma.pendingChild.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { registrationSource: "SELF_SIGNUP", OR: [{ signupProfile: { contactStatus: "NEW" } }, { signupProfile: null }] } }),
  ]);

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Yeni kayıtlar">
      <PanelHeading
        title="Yeni kayıtlar"
        description="Kendi kaydını açan öğrenci ve veliler. Ara, durumunu işaretle, velinin çocuğu için öğrenci hesabını aç ve öğretmen ata."
      />
      <nav aria-label="Sekmeler" className="mt-5 flex flex-wrap gap-2">
        <PanelFilterLink href="/panel/yonetim/basvurular" active={tab === "kayitlar"}>
          Kayıtlar · {newCount} aranmadı
        </PanelFilterLink>
        <PanelFilterLink href="/panel/yonetim/basvurular?sekme=cocuklar" active={tab === "cocuklar"}>
          Hesabı bekleyen çocuklar · {pendingCount}
        </PanelFilterLink>
      </nav>
      {tab === "kayitlar" ? <SignupList filter={filter} page={page} /> : <PendingChildren />}
    </PanelShell>
  );
}

async function SignupList({ filter, page }: { filter: Filter; page: number }) {
  const where: Prisma.UserWhereInput = { registrationSource: "SELF_SIGNUP", ...filterWhere(filter) };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        contactFormSubmittedAt: true,
        marketingConsentAt: true,
        signupProfile: true,
        studentProfile: { select: { classLevel: true, examType: true, schoolName: true } },
        pendingChildren: { where: { status: "PENDING" }, select: { id: true, fullName: true } },
        productMemberships: { where: { revokedAt: null, product: { in: ["OD", "OK", "ODK"] } }, select: { product: true } },
        _count: { select: { paidOdOrders: { where: { status: "PAID" } }, paidOdkOrders: { where: { status: "PAID" } }, contactFormSubmissions: true } },
      },
    }),
  ]);

  // "Zaten satın aldım" diyen ya da e-postası ödenmiş bir siparişle eşleşen
  // kayıtları işaretle: ekip önce bunları arar.
  const emails = users.map((user) => user.email);
  const matchedOrders = emails.length
    ? await prisma.odOrder.findMany({
        where: { status: "PAID", OR: emails.map((email) => ({ buyerInfo: { path: ["email"], equals: email } })) },
        select: { id: true, buyerInfo: true },
      })
    : [];
  const matchedEmails = new Set(
    matchedOrders.map((order) => String((order.buyerInfo as Record<string, unknown> | null)?.email ?? "").toLowerCase()),
  );

  return (
    <section className="mt-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <PanelFilterLink
            key={item.value}
            href={`/panel/yonetim/basvurular${item.value === "tumu" ? "" : `?filtre=${item.value}`}`}
            active={filter === item.value}
          >
            {item.label}
          </PanelFilterLink>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-dc-ink-faint">{total} kayıt</p>

      {users.length === 0 ? (
        <PanelEmpty title="Kayıt yok" body="Bu filtrede kendi kaydını açan kullanıcı bulunmuyor." />
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {users.map((user) => {
            const profile = user.signupProfile;
            const tel = telHref(user.phone);
            const paid = user._count.paidOdOrders + user._count.paidOdkOrders;
            const matched = matchedEmails.has(user.email.toLowerCase());
            return (
              <li key={user.id}>
                <PanelCard>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/panel/yonetim/kullanicilar/${user.id}`} className="text-[15.5px] font-bold text-dc-ink hover:underline">
                          {user.fullName || user.email}
                        </Link>
                        <PanelStatusBadge tone={user.role === "PARENT" ? "info" : "neutral"} label={user.role === "PARENT" ? "Veli" : "Öğrenci"} />
                        {profile?.purchaseStatus === "ALREADY_PURCHASED" || matched ? (
                          <PanelStatusBadge tone="warning" label={matched ? "Ödenmiş sipariş eşleşti" : "Satın aldığını belirtti"} />
                        ) : null}
                        {paid ? <PanelStatusBadge tone="success" label={`${paid} ödeme`} /> : null}
                        {user.contactFormSubmittedAt || user._count.contactFormSubmissions ? (
                          <PanelStatusBadge tone="success" label="Form dolduruldu" />
                        ) : (
                          <PanelStatusBadge tone="neutral" label="Form yok" />
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-dc-ink-muted">
                        {user.email} · {user.phone ?? "telefon yok"} · {DATE.format(user.createdAt)}
                      </p>
                      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                        <div>
                          <dt className="inline text-dc-ink-faint">İlgilendiği: </dt>
                          <dd className="inline text-dc-ink">
                            {profile?.interestedProducts.length ? profile.interestedProducts.map(productLabel).join(", ") : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-dc-ink-faint">Durum: </dt>
                          <dd className="inline text-dc-ink">{optionLabel(PURCHASE_STATUS_OPTIONS, profile?.purchaseStatus) ?? "—"}</dd>
                        </div>
                        {profile?.existingOrderRef ? (
                          <div>
                            <dt className="inline text-dc-ink-faint">Sipariş referansı: </dt>
                            <dd className="inline text-dc-ink">{profile.existingOrderRef}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="inline text-dc-ink-faint">Ulaşım: </dt>
                          <dd className="inline text-dc-ink">
                            {optionLabel(CONTACT_CHANNEL_OPTIONS, profile?.preferredChannel) ?? "—"} ·{" "}
                            {optionLabel(CONTACT_TIME_OPTIONS, profile?.preferredContactTime) ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-dc-ink-faint">Konum: </dt>
                          <dd className="inline text-dc-ink">{[profile?.city, profile?.district].filter(Boolean).join(" / ") || "—"}</dd>
                        </div>
                        {user.role === "STUDENT" ? (
                          <div>
                            <dt className="inline text-dc-ink-faint">Eğitim: </dt>
                            <dd className="inline text-dc-ink">
                              {optionLabel(CLASS_LEVEL_OPTIONS, user.studentProfile?.classLevel) ?? "—"} ·{" "}
                              {optionLabel(EXAM_TYPE_OPTIONS, user.studentProfile?.examType) ?? "—"}
                              {user.studentProfile?.schoolName ? ` · ${user.studentProfile.schoolName}` : ""}
                            </dd>
                          </div>
                        ) : (
                          <div>
                            <dt className="inline text-dc-ink-faint">Çocuklar: </dt>
                            <dd className="inline text-dc-ink">
                              {user.pendingChildren.length ? `${user.pendingChildren.map((child) => child.fullName).join(", ")} (hesap bekliyor)` : "—"}
                            </dd>
                          </div>
                        )}
                        {user.role === "STUDENT" && profile?.guardianName ? (
                          <div>
                            <dt className="inline text-dc-ink-faint">Veli: </dt>
                            <dd className="inline text-dc-ink">
                              {profile.guardianName}
                              {profile.guardianPhone ? ` · ${profile.guardianPhone}` : ""}
                            </dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="inline text-dc-ink-faint">Aktif ürün: </dt>
                          <dd className="inline text-dc-ink">
                            {user.productMemberships.length ? user.productMemberships.map((m) => productLabel(m.product!)).join(", ") : "Yok"}
                          </dd>
                        </div>
                        {profile?.heardFrom ? (
                          <div>
                            <dt className="inline text-dc-ink-faint">Kaynak: </dt>
                            <dd className="inline text-dc-ink">{optionLabel(HEARD_FROM_OPTIONS, profile.heardFrom)}</dd>
                          </div>
                        ) : null}
                      </dl>
                      {profile?.note ? <p className="mt-2 rounded-lg bg-dc-surface-soft px-3 py-2 text-[13px] text-dc-ink">“{profile.note}”</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {tel ? (
                        <a href={tel} className="inline-flex items-center gap-1.5 rounded-lg border border-dc-line bg-white px-3 py-2 text-[13px] font-semibold text-dc-ink">
                          <Phone size={14} aria-hidden="true" /> Ara
                        </a>
                      ) : null}
                      {user.phone ? (
                        <a
                          href={whatsAppLink(user.phone, `Merhaba ${user.fullName ?? ""}, onlinedershanem.'den ulaşıyoruz.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dc-line bg-white px-3 py-2 text-[13px] font-semibold text-dc-ink"
                        >
                          <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-dc-line-soft pt-3">
                    <SignupContactControl userId={user.id} status={profile?.contactStatus ?? "NEW"} note={profile?.contactNote ?? null} />
                    {profile?.contactedAt ? (
                      <p className="mt-1 text-[12px] text-dc-ink-faint">
                        Son durum: {optionLabel(CONTACT_STATUS_OPTIONS, profile.contactStatus)} · {DATE.format(profile.contactedAt)}
                      </p>
                    ) : null}
                  </div>
                </PanelCard>
              </li>
            );
          })}
        </ul>
      )}

      {total > PAGE_SIZE ? (
        <nav aria-label="Sayfalar" className="mt-4 flex gap-2">
          {page > 1 ? (
            <PanelFilterLink active={false} href={`/panel/yonetim/basvurular?filtre=${filter}&sayfa=${page - 1}`}>Önceki</PanelFilterLink>
          ) : null}
          {page * PAGE_SIZE < total ? (
            <PanelFilterLink active={false} href={`/panel/yonetim/basvurular?filtre=${filter}&sayfa=${page + 1}`}>Sonraki</PanelFilterLink>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}

async function PendingChildren() {
  const children = await prisma.pendingChild.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      fullName: true,
      classLevel: true,
      schoolName: true,
      examType: true,
      email: true,
      phone: true,
      relationship: true,
      createdAt: true,
      parent: { select: { id: true, fullName: true, email: true, phone: true } },
      odOrders: { where: { status: "PAID" }, select: { id: true, packageName: true } },
      odkOrders: { where: { status: "PAID" }, select: { id: true, package: { select: { title: true } } } },
    },
  });
  // Ödemesi alınmış çocuklar önce: hem velinin hem öğrencinin beklediği iş.
  const sorted = [...children].sort((a, b) => Number(b.odOrders.length + b.odkOrders.length > 0) - Number(a.odOrders.length + a.odkOrders.length > 0));

  if (!sorted.length) {
    return (
      <div className="mt-5">
        <PanelEmpty title="Bekleyen çocuk yok" body="Velilerin bildirdiği bütün çocukların hesabı açılmış." />
      </div>
    );
  }

  return (
    <ul className="mt-5 flex flex-col gap-3">
      {sorted.map((child) => {
        const paidOrders = [...child.odOrders.map((order) => order.packageName), ...child.odkOrders.map((order) => order.package.title)];
        const tel = telHref(child.parent.phone);
        return (
          <li key={child.id}>
            <PanelCard variant={paidOrders.length ? "emphasis" : "default"}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15.5px] font-bold text-dc-ink">{child.fullName}</p>
                    {paidOrders.length ? <PanelStatusBadge tone="warning" label="Ödeme alındı · hesap bekliyor" /> : null}
                  </div>
                  <p className="mt-1 text-[13px] text-dc-ink-muted">
                    {optionLabel(CLASS_LEVEL_OPTIONS, child.classLevel) ?? "—"} · {optionLabel(EXAM_TYPE_OPTIONS, child.examType) ?? "—"}
                    {child.schoolName ? ` · ${child.schoolName}` : ""} · bildirildi {DATE.format(child.createdAt)}
                  </p>
                  <p className="mt-1 text-[13px] text-dc-ink">
                    Veli:{" "}
                    <Link href={`/panel/yonetim/kullanicilar/${child.parent.id}`} className="font-semibold hover:underline">
                      {child.parent.fullName || child.parent.email}
                    </Link>{" "}
                    · {child.parent.phone ?? "telefon yok"} · {child.parent.email}
                  </p>
                  {paidOrders.length ? <p className="mt-1 text-[13px] text-dc-ink">Paketler: {paidOrders.join(", ")}</p> : null}
                  {child.email || child.phone ? (
                    <p className="mt-1 text-[12.5px] text-dc-ink-muted">Çocuğun iletişimi: {[child.email, child.phone].filter(Boolean).join(" · ")}</p>
                  ) : null}
                </div>
                {tel ? (
                  <a href={tel} className="inline-flex items-center gap-1.5 rounded-lg border border-dc-line bg-white px-3 py-2 text-[13px] font-semibold text-dc-ink">
                    <Phone size={14} aria-hidden="true" /> Veliyi ara
                  </a>
                ) : null}
              </div>
              <div className="mt-4 border-t border-dc-line-soft pt-3">
                <ChildAccountForm childId={child.id} defaultEmail={child.email} defaultName={child.fullName} parentPhone={child.parent.phone} />
              </div>
            </PanelCard>
          </li>
        );
      })}
    </ul>
  );
}
