import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { productLabel } from "@/lib/auth/roles";
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
import { PanelCard, PanelCardTitle } from "@/components/panel/ui";

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

/**
 * Yönetim · kullanıcı detayı: kayıt formu, iletişim formu (Tally) ve
 * velinin bildirdiği çocuklar. Kaydı olmayan (admin açtığı) hesaplarda basılmaz.
 */
export async function SignupProfileCard({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      registrationSource: true,
      kvkkAcceptedAt: true,
      marketingConsentAt: true,
      contactFormSubmittedAt: true,
      signupProfile: true,
      pendingChildren: { orderBy: { createdAt: "asc" }, select: { id: true, fullName: true, classLevel: true, examType: true, status: true } },
      contactFormSubmissions: { orderBy: { receivedAt: "desc" }, take: 1, select: { receivedAt: true, payload: true } },
    },
  });
  if (!user || (!user.signupProfile && !user.pendingChildren.length && user.registrationSource !== "SELF_SIGNUP")) return null;
  const profile = user.signupProfile;
  const tally = user.contactFormSubmissions[0];
  const tallyFields = tally
    ? ((tally.payload as { data?: { fields?: Array<{ label?: string | null; type?: string; value?: unknown }> } }).data?.fields ?? []).filter(
        (field) => field.type !== "HIDDEN_FIELDS" && field.value !== null && field.value !== undefined && field.value !== "",
      )
    : [];

  const rows: Array<[string, string | null | undefined]> = [
    ["Kayıt kaynağı", user.registrationSource === "SELF_SIGNUP" ? "Kendi kaydı" : user.registrationSource === "PURCHASE" ? "Ödeme sonrası" : "Yönetim daveti"],
    ["İlgilendiği ürünler", profile?.interestedProducts.map(productLabel).join(", ")],
    ["Satın alım durumu", optionLabel(PURCHASE_STATUS_OPTIONS, profile?.purchaseStatus)],
    ["Sipariş referansı", profile?.existingOrderRef],
    ["Ulaşım tercihi", [optionLabel(CONTACT_CHANNEL_OPTIONS, profile?.preferredChannel), optionLabel(CONTACT_TIME_OPTIONS, profile?.preferredContactTime)].filter(Boolean).join(" · ")],
    ["Konum", [profile?.city, profile?.district].filter(Boolean).join(" / ")],
    ["Veli (beyan)", [profile?.guardianName, profile?.guardianPhone, profile?.guardianEmail].filter(Boolean).join(" · ")],
    ["Kaynak", optionLabel(HEARD_FROM_OPTIONS, profile?.heardFrom)],
    ["İletişim durumu", optionLabel(CONTACT_STATUS_OPTIONS, profile?.contactStatus)],
    ["KVKK onayı", user.kvkkAcceptedAt ? DATE.format(user.kvkkAcceptedAt) : "Yok"],
    ["Ticari ileti izni", user.marketingConsentAt ? `Var (${DATE.format(user.marketingConsentAt)})` : "Yok"],
    ["İletişim formu", user.contactFormSubmittedAt ? DATE.format(user.contactFormSubmittedAt) : "Doldurulmadı"],
  ];

  return (
    <PanelCard className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PanelCardTitle>Kayıt ve iletişim bilgileri</PanelCardTitle>
        <Link href="/panel/yonetim/basvurular" className="text-[13px] font-semibold text-dc-brand-strong">
          Yeni kayıtlar
        </Link>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12px] text-dc-ink-faint">{label}</dt>
              <dd className="text-dc-ink">{value}</dd>
            </div>
          ))}
      </dl>
      {profile?.note ? <p className="mt-3 rounded-lg bg-dc-surface-soft px-3 py-2 text-[13px] text-dc-ink">“{profile.note}”</p> : null}
      {user.pendingChildren.length ? (
        <div className="mt-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-dc-ink-ghost">Bildirilen çocuklar</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13.5px] text-dc-ink">
            {user.pendingChildren.map((child) => (
              <li key={child.id}>
                {child.fullName} · {optionLabel(CLASS_LEVEL_OPTIONS, child.classLevel) ?? "—"} · {optionLabel(EXAM_TYPE_OPTIONS, child.examType) ?? "—"} ·{" "}
                {child.status === "PENDING" ? "hesap bekliyor" : child.status === "ACCOUNT_CREATED" ? "hesap açıldı" : "iptal"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {tallyFields.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-dc-ink">İletişim formu yanıtları</summary>
          <dl className="mt-2 flex flex-col gap-1.5 text-[13px]">
            {tallyFields.slice(0, 40).map((field, index) => (
              <div key={index}>
                <dt className="text-[12px] text-dc-ink-faint">{field.label ?? "Soru"}</dt>
                <dd className="text-dc-ink">{Array.isArray(field.value) ? field.value.join(", ") : String(field.value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </PanelCard>
  );
}
