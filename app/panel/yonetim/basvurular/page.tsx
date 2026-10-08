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
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  StatusBadge,
  UrlDrawer,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
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
  searchParams: Promise<{ sekme?: string; filtre?: string; sayfa?: string; onizle?: string }>;
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
      <PageHeader
        title="Yeni kayıtlar"
        description="Kendi kaydını açan öğrenci ve veliler. Ara, durumunu işaretle, velinin çocuğu için öğrenci hesabını aç."
      />
      <div className="mt-2">
        <ViewTabs
          label="Yeni kayıt görünümleri"
          activeId={tab}
          tabs={[
            { id: "kayitlar", label: "Kayıtlar", href: "/panel/yonetim/basvurular", count: newCount },
            { id: "cocuklar", label: "Hesabı bekleyen çocuklar", href: "/panel/yonetim/basvurular?sekme=cocuklar", count: pendingCount },
          ]}
        />
      </div>
      {tab === "kayitlar" ? <SignupList filter={filter} page={page} preview={params.onizle} /> : <PendingChildren />}
    </PanelShell>
  );
}

function signupHref(filter: Filter, page: number, preview?: string) {
  const params = new URLSearchParams();
  if (filter !== "tumu") params.set("filtre", filter);
  if (page > 1) params.set("sayfa", String(page));
  if (preview) params.set("onizle", preview);
  const text = params.toString();
  return text ? `/panel/yonetim/basvurular?${text}` : "/panel/yonetim/basvurular";
}

/**
 * Kayıt listesi: karar bilgisi tabloda (kim, ne istiyor, satın aldı mı, form,
 * iletişim durumu); ayrıntı ve durum işaretleme satırın yan panelinde
 * (`?onizle=kayit:<id>`). Ara / WhatsApp satırda ve panelde.
 */
async function SignupList({ filter, page, preview }: { filter: Filter; page: number; preview?: string }) {
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

  const previewId = preview?.startsWith("kayit:") ? preview.slice("kayit:".length) : null;
  const selected = previewId ? users.find((user) => user.id === previewId) ?? null : null;
  const callLinks = (user: (typeof users)[number], size: "sm" | "md" = "sm") => {
    const tel = telHref(user.phone);
    return (
      <span className="flex flex-wrap gap-1.5">
        {tel ? (
          <a href={tel} className={buttonClass("secondary", size)}>
            <Phone size={14} aria-hidden="true" /> Ara<span className="sr-only"> · {user.fullName || user.email}</span>
          </a>
        ) : null}
        {user.phone ? (
          <a
            href={whatsAppLink(user.phone, `Merhaba ${user.fullName ?? ""}, onlinedershanem.'den ulaşıyoruz.`)}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("ghost", size)}
          >
            <MessageCircle size={14} aria-hidden="true" /> WhatsApp<span className="sr-only"> · {user.fullName || user.email}</span>
          </a>
        ) : null}
      </span>
    );
  };

  return (
    <section className="mt-4">
      <nav aria-label="Kayıt süzgeci" className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <Link
            key={item.value}
            href={signupHref(item.value, 1)}
            aria-current={filter === item.value ? "page" : undefined}
            className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[13px] ${
              filter === item.value ? "border-pn-text bg-pn-text font-semibold text-white" : "border-pn-border text-pn-text-secondary hover:bg-pn-hover"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-[13px] tabular-nums text-pn-text-muted">{total} kayıt</p>

      {users.length === 0 ? (
        <EmptyState className="mt-3" title="Bu süzgeçte kayıt yok." body="Kendi kaydını açan kullanıcılar burada listelenir." />
      ) : (
        <PanelTable caption="Yeni kayıtlar" columns={["Ad", "Tür", "İlgilendiği", "Satın alma", "Form", "İletişim", "Kayıt", ""]}>
          {users.map((user) => {
            const profile = user.signupProfile;
            const paid = user._count.paidOdOrders + user._count.paidOdkOrders;
            const matched = matchedEmails.has(user.email.toLowerCase());
            const formDone = Boolean(user.contactFormSubmittedAt || user._count.contactFormSubmissions);
            return (
              <PanelTableRow key={user.id}>
                <PanelTableCell>
                  <Link href={signupHref(filter, page, `kayit:${user.id}`)} scroll={false} className="font-medium text-pn-text underline-offset-2 hover:underline">
                    {user.fullName || user.email}
                  </Link>
                  <span className="block text-[12.5px] text-pn-text-muted">{user.phone ?? user.email}</span>
                </PanelTableCell>
                <PanelTableCell>{user.role === "PARENT" ? "Veli" : "Öğrenci"}</PanelTableCell>
                <PanelTableCell>{profile?.interestedProducts.length ? profile.interestedProducts.map(productLabel).join(", ") : "—"}</PanelTableCell>
                <PanelTableCell>
                  {paid ? (
                    <StatusBadge tone="success" label={`${paid} ödeme`} />
                  ) : matched ? (
                    <StatusBadge tone="warning" label="Ödenmiş sipariş eşleşti" />
                  ) : profile?.purchaseStatus === "ALREADY_PURCHASED" ? (
                    <StatusBadge tone="warning" label="Satın aldığını belirtti" />
                  ) : (
                    optionLabel(PURCHASE_STATUS_OPTIONS, profile?.purchaseStatus) ?? "—"
                  )}
                </PanelTableCell>
                <PanelTableCell>{formDone ? <StatusBadge tone="success" label="Dolduruldu" /> : <span className="text-pn-text-muted">Yok</span>}</PanelTableCell>
                <PanelTableCell>{optionLabel(CONTACT_STATUS_OPTIONS, profile?.contactStatus ?? "NEW") ?? "—"}</PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{DATE.format(user.createdAt)}</span>
                </PanelTableCell>
                <PanelTableCell label="Eylem">{callLinks(user)}</PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
      )}

      {total > PAGE_SIZE ? (
        <nav aria-label="Sayfalar" className="mt-4 flex gap-2">
          {page > 1 ? (
            <Link href={signupHref(filter, page - 1)} className={buttonClass("secondary", "sm")}>
              Önceki
            </Link>
          ) : null}
          {page * PAGE_SIZE < total ? (
            <Link href={signupHref(filter, page + 1)} className={buttonClass("secondary", "sm")}>
              Sonraki
            </Link>
          ) : null}
        </nav>
      ) : null}

      {selected ? (
        <UrlDrawer title={selected.fullName || selected.email} description={`${selected.role === "PARENT" ? "Veli" : "Öğrenci"} · ${DATE.format(selected.createdAt)}`}>
          {(() => {
            const profile = selected.signupProfile;
            return (
              <div className="space-y-5">
                {callLinks(selected, "md")}
                <PropertyList>
                  <PropertyRow label="İletişim">{[selected.email, selected.phone].filter(Boolean).join(" · ")}</PropertyRow>
                  <PropertyRow label="İlgilendiği">{profile?.interestedProducts.length ? profile.interestedProducts.map(productLabel).join(", ") : "—"}</PropertyRow>
                  <PropertyRow label="Satın alma">{optionLabel(PURCHASE_STATUS_OPTIONS, profile?.purchaseStatus) ?? "—"}</PropertyRow>
                  {profile?.existingOrderRef ? <PropertyRow label="Sipariş referansı">{profile.existingOrderRef}</PropertyRow> : null}
                  <PropertyRow label="Ulaşım">
                    {optionLabel(CONTACT_CHANNEL_OPTIONS, profile?.preferredChannel) ?? "—"} · {optionLabel(CONTACT_TIME_OPTIONS, profile?.preferredContactTime) ?? "—"}
                  </PropertyRow>
                  <PropertyRow label="Konum">{[profile?.city, profile?.district].filter(Boolean).join(" / ") || "—"}</PropertyRow>
                  {selected.role === "STUDENT" ? (
                    <PropertyRow label="Eğitim">
                      {optionLabel(CLASS_LEVEL_OPTIONS, selected.studentProfile?.classLevel) ?? "—"} · {optionLabel(EXAM_TYPE_OPTIONS, selected.studentProfile?.examType) ?? "—"}
                      {selected.studentProfile?.schoolName ? ` · ${selected.studentProfile.schoolName}` : ""}
                    </PropertyRow>
                  ) : (
                    <PropertyRow label="Çocuklar">
                      {selected.pendingChildren.length ? `${selected.pendingChildren.map((child) => child.fullName).join(", ")} (hesap bekliyor)` : "—"}
                    </PropertyRow>
                  )}
                  {selected.role === "STUDENT" && profile?.guardianName ? (
                    <PropertyRow label="Veli">
                      {profile.guardianName}
                      {profile.guardianPhone ? ` · ${profile.guardianPhone}` : ""}
                    </PropertyRow>
                  ) : null}
                  <PropertyRow label="Aktif ürün">
                    {selected.productMemberships.length ? selected.productMemberships.map((m) => productLabel(m.product!)).join(", ") : "Yok"}
                  </PropertyRow>
                  {profile?.heardFrom ? <PropertyRow label="Kaynak">{optionLabel(HEARD_FROM_OPTIONS, profile.heardFrom)}</PropertyRow> : null}
                </PropertyList>
                {profile?.note ? <p className="rounded-md bg-pn-surface-subtle px-3 py-2 text-[13.5px] text-pn-text">“{profile.note}”</p> : null}
                <div className="border-t border-pn-border pt-4">
                  <h3 className="mb-2 text-[13.5px] font-semibold text-pn-text">İletişim durumu</h3>
                  <SignupContactControl userId={selected.id} status={profile?.contactStatus ?? "NEW"} note={profile?.contactNote ?? null} />
                  {profile?.contactedAt ? (
                    <p className="mt-1 text-[12.5px] text-pn-text-muted">
                      Son durum: {optionLabel(CONTACT_STATUS_OPTIONS, profile.contactStatus)} · {DATE.format(profile.contactedAt)}
                    </p>
                  ) : null}
                </div>
                <Link href={`/panel/yonetim/kullanicilar/${selected.id}`} className={buttonClass("secondary", "md")}>
                  Kişi detayını aç
                </Link>
              </div>
            );
          })()}
        </UrlDrawer>
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
      <EmptyState className="mt-5" title="Bekleyen çocuk yok." body="Velilerin bildirdiği bütün çocukların hesabı açılmış." />
    );
  }

  return (
    <ul aria-label="Hesabı bekleyen çocuklar" className="mt-5 divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
      {sorted.map((child) => {
        const paidOrders = [...child.odOrders.map((order) => order.packageName), ...child.odkOrders.map((order) => order.package.title)];
        const tel = telHref(child.parent.phone);
        return (
          <li key={child.id} className={`px-4 py-4 ${paidOrders.length ? "bg-(--pn-tone-warning-soft)" : ""}`}>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-pn-text">{child.fullName}</p>
                    {paidOrders.length ? <StatusBadge tone="warning" label="Ödeme alındı · hesap bekliyor" /> : null}
                  </div>
                  <p className="mt-1 text-[13px] text-pn-text-muted">
                    {optionLabel(CLASS_LEVEL_OPTIONS, child.classLevel) ?? "—"} · {optionLabel(EXAM_TYPE_OPTIONS, child.examType) ?? "—"}
                    {child.schoolName ? ` · ${child.schoolName}` : ""} · bildirildi {DATE.format(child.createdAt)}
                  </p>
                  <p className="mt-1 text-[13px] text-pn-text">
                    Veli:{" "}
                    <Link href={`/panel/yonetim/kullanicilar/${child.parent.id}`} className="font-semibold hover:underline">
                      {child.parent.fullName || child.parent.email}
                    </Link>{" "}
                    · {child.parent.phone ?? "telefon yok"} · {child.parent.email}
                  </p>
                  {paidOrders.length ? <p className="mt-1 text-[13px] text-pn-text">Paketler: {paidOrders.join(", ")}</p> : null}
                  {child.email || child.phone ? (
                    <p className="mt-1 text-[12.5px] text-pn-text-muted">Çocuğun iletişimi: {[child.email, child.phone].filter(Boolean).join(" · ")}</p>
                  ) : null}
                </div>
                {tel ? (
                  <a href={tel} className={buttonClass("secondary", "sm")}>
                    <Phone size={14} aria-hidden="true" /> Veliyi ara<span className="sr-only"> · {child.fullName}</span>
                  </a>
                ) : null}
              </div>
              <div className="mt-4 border-t border-pn-border pt-3">
                <ChildAccountForm childId={child.id} defaultEmail={child.email} defaultName={child.fullName} parentPhone={child.parent.phone} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
