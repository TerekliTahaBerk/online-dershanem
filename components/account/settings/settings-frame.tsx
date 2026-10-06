import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelProgress } from "@/components/panel/ui";
import type { SessionUser } from "@/lib/auth/session";
import type { AccountStatus } from "@/lib/account/account-status";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { userRequiresMfa } from "@/lib/products/staff-permissions";

export type SettingsSection = "profil" | "egitim" | "cocuklarim" | "iletisim" | "fatura" | "onaylar" | "guvenlik";

const SECTION_LABEL: Record<SettingsSection, string> = {
  profil: "Profil",
  egitim: "Eğitim bilgileri",
  cocuklarim: "Çocuklarım",
  iletisim: "İletişim tercihleri",
  fatura: "Fatura bilgileri",
  onaylar: "Onaylar",
  guvenlik: "Güvenlik",
};

/** Rolün görebildiği ayar bölümleri. Personel yalnız profil ve güvenliği görür. */
export function settingsSectionsFor(role: UserRole): SettingsSection[] {
  if (role === "STUDENT") return ["profil", "egitim", "iletisim", "fatura", "onaylar", "guvenlik"];
  if (role === "PARENT") return ["profil", "cocuklarim", "iletisim", "fatura", "onaylar", "guvenlik"];
  return ["profil", "guvenlik"];
}

export function settingsSectionLabel(section: SettingsSection): string {
  return SECTION_LABEL[section];
}

/**
 * Hesap ayarları ortak çerçevesi: panel kabuğu, başlık, tamamlama çubuğu ve
 * bölüm sekmeleri.
 */
/**
 * Panel tercihleri — menüden kaldırılan ortak öğeler burada toplanır
 * (docs/panel-design-roadmap.md §6.2). Bayrağa bağlı sayfalar bayrak kapalıyken
 * gösterilmez; MFA sayfası yalnız MFA gerektiren hesaplarda açılır.
 */
function panelPreferenceLinks(requiresMfa: boolean) {
  const flags = getPanelFeatureFlags();
  return [
    { href: "/panel/bildirimler", label: "Bildirimler ve tercihleri" },
    ...(flags.accessibilityProfile ? [{ href: "/panel/erisilebilirlik", label: "Erişilebilirlik" }] : []),
    ...(flags.offlineMode ? [{ href: "/panel/veri-kullanimi", label: "Veri kullanımı" }] : []),
    ...(requiresMfa ? [{ href: "/panel/guvenlik", label: "İki adımlı doğrulama" }] : []),
    { href: "/panel/oturumlar", label: "Aktif oturumlar" },
    { href: "/panel/parola", label: "Parola" },
  ];
}

export async function SettingsFrame({
  session,
  status,
  active,
  children,
}: {
  session: SessionUser;
  status: AccountStatus | null;
  active: SettingsSection | null;
  children: React.ReactNode;
}) {
  const sections = settingsSectionsFor(session.role);
  const preferenceLinks = panelPreferenceLinks(await userRequiresMfa(session.userId, session.role));
  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Hesap ayarları">
      <div className="max-w-[820px]">
        <PanelHeading
          title="Hesap ayarları"
          description="Bilgilerini tamamla; sana daha hızlı ve doğru destek verelim."
        />
        {status && (session.role === "STUDENT" || session.role === "PARENT") ? (
          <PanelProgress
            className="mt-4 max-w-md"
            label="Hesap tamamlama"
            value={status.completion.percent}
            text={status.completion.complete ? "Hesabın tamamlandı." : `Hesabın %${status.completion.percent} tamamlandı.`}
          />
        ) : null}
        <nav aria-label="Ayar bölümleri" className="mt-5 flex flex-wrap gap-2">
          {sections.map((section) => (
            <Link
              key={section}
              href={`/panel/ayarlar/${section}`}
              aria-current={active === section ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                active === section ? "border-dc-brand-strong bg-dc-brand-soft text-dc-brand-deep" : "border-dc-line bg-white text-dc-ink-muted hover:text-dc-ink"
              }`}
            >
              {SECTION_LABEL[section]}
            </Link>
          ))}
        </nav>
        <nav aria-label="Panel tercihleri" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
          <span className="text-dc-ink-muted">Panel tercihleri:</span>
          {preferenceLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-medium text-dc-brand-strong hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-5">{children}</div>
      </div>
    </PanelShell>
  );
}
