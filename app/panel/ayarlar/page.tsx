import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/guards";
import { CONTACT_FORM_PATH, productLabel } from "@/lib/auth/roles";
import { loadAccountStatus } from "@/lib/account/account-status";
import { SettingsFrame } from "@/components/account/settings/settings-frame";
import { PanelCard, PanelCardTitle } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

/**
 * HESAP AYARLARI · GENEL BAKIŞ.
 *
 * Üründen bağımsızdır (`requireActiveUser`): paketi olmayan yeni kayıtlı
 * kullanıcı da hesabını buradan tamamlar. Eksik alanlar tek listede, her biri
 * ilgili bölüme bağlı.
 */
export default async function AccountSettingsPage() {
  const session = await requireActiveUser();
  const [status, memberships] = await Promise.all([
    loadAccountStatus(session.userId, session.role),
    session.role === "STUDENT" || session.role === "PARENT"
      ? prisma.productMembership.findMany({
          where: { userId: session.userId, revokedAt: null, product: { in: ["OD", "OK", "ODK"] } },
          select: { product: true, expiresAt: true },
          orderBy: { product: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const now = new Date();
  const activeMemberships = memberships.filter((membership) => membership.product && (!membership.expiresAt || membership.expiresAt > now));

  return (
    <SettingsFrame session={session} status={status} active={null}>
      {status ? (
        <PanelCard>
          <PanelCardTitle>Yapılacaklar</PanelCardTitle>
          <ul className="mt-3 flex flex-col divide-y divide-dc-line-soft">
            {status.registrationSource === "SELF_SIGNUP" ? (
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 text-[14px] text-dc-ink">
                  {status.contactFormSubmitted ? (
                    <CheckCircle2 size={16} aria-hidden="true" className="text-dc-brand-strong" />
                  ) : (
                    <Circle size={16} aria-hidden="true" className="text-dc-ink-ghost" />
                  )}
                  İletişim formu
                </span>
                <Link href={`${CONTACT_FORM_PATH}?tekrar=1`} className="text-[13px] font-semibold text-dc-brand-strong">
                  {status.contactFormSubmitted ? "Güncelle" : "Doldur"}
                </Link>
              </li>
            ) : null}
            {status.completion.requirements.map((requirement) => (
              <li key={requirement.key} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 text-[14px] text-dc-ink">
                  {requirement.done ? (
                    <CheckCircle2 size={16} aria-hidden="true" className="text-dc-brand-strong" />
                  ) : (
                    <Circle size={16} aria-hidden="true" className="text-dc-ink-ghost" />
                  )}
                  {requirement.label}
                </span>
                {requirement.done ? (
                  <span className="text-[12.5px] text-dc-ink-faint">Tamam</span>
                ) : (
                  <Link href={requirement.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-dc-brand-strong">
                    Ekle <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      {session.role === "STUDENT" || session.role === "PARENT" ? (
        <PanelCard className="mt-4">
          <PanelCardTitle>Paketlerin</PanelCardTitle>
          {activeMemberships.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {activeMemberships.map((membership) => (
                <li key={membership.product} className="flex flex-wrap justify-between gap-2 text-[14px] text-dc-ink">
                  <span className="font-semibold">{productLabel(membership.product!)}</span>
                  <span className="text-dc-brand-hover">Aktif{membership.expiresAt ? ` · dönem sonu ${DATE.format(membership.expiresAt)}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] leading-[1.6] text-dc-ink-muted">
              Aktif bir paketin yok. Paket satın aldığında erişimin otomatik açılır.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/paketler" className="rounded-lg bg-dc-brand-strong px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-dc-brand-hover">
              Ders paketleri
            </Link>
            <Link href="/odk-paketleri" className="rounded-lg border border-dc-line bg-white px-3.5 py-2 text-[13px] font-semibold text-dc-ink">
              Deneme kulübü paketleri
            </Link>
          </div>
        </PanelCard>
      ) : null}
    </SettingsFrame>
  );
}
