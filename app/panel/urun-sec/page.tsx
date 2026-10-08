import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { userRequiresLoginMfa } from "@/lib/products/staff-permissions";
import { resolveProductEntryPath } from "@/lib/products/product-entry";
import { PASSWORD_CHANGE_PATH, ACCOUNT_SETTINGS_PATH, productRolePath, roleLabel } from "@/lib/auth/roles";
import { PANEL_PRODUCTS, loadProductPanelStates } from "@/lib/auth/product-panels";
import { publicProducts } from "@/lib/product-architecture";
import { yonBrand } from "@/lib/yon-brand";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import { offlineSessionScope } from "@/lib/offline-scope";
import { OfflineSyncProvider } from "@/components/panel/offline-sync-provider";
import { LogoutButton } from "@/components/panel/logout-button";
import { AccountCompletionBanner } from "@/components/account/account-completion-banner";
import { ProductPanelCard, type ProductPanelCardModel } from "@/components/account/product-panel-card";

export const metadata: Metadata = {
  title: "Panel seçimi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Kilitli ürün kartının satın alma / tanışma bağlantısı. */
const LOCKED_CTA: Record<(typeof PANEL_PRODUCTS)[number], { href: string; label: string }> = {
  OD: { href: "/paketler", label: "Paketleri incele" },
  OK: { href: "/urunler/online-kocum", label: "İncele ve görüşme iste" },
  ODK: { href: "/odk-paketleri", label: "Deneme Ligi paketlerini incele" },
};

const PANEL_BRANDS: Record<(typeof PANEL_PRODUCTS)[number], ProductPanelCardModel["brand"]> = {
  OD: {
    displayName: "onlinedershanem.",
    logo: "/design/od-logo.png",
    tone: "OD",
  },
  OK: {
    displayName: yonBrand.shortName,
    parentName: yonBrand.parentName,
    logo: yonBrand.logo,
    tone: "YON",
  },
  ODK: {
    displayName: denemeLigiBrand.shortName,
    parentName: denemeLigiBrand.parentName,
    logo: denemeLigiBrand.logo,
    tone: "LEAGUE",
  },
};

/**
 * ÜRÜN PANELİ SEÇİCİ.
 *
 * Girişten sonra herkes (Yönetim, Öğretmen, Öğrenci, Veli) buraya gelir ve
 * OD / OK / ODK'dan gireceği paneli seçer. Seçim `Session.activeProduct`'a
 * yazılır ve panel menüsünü o ürüne daraltır; YETKİ VERMEZ — her sayfa kendi
 * ürün guard'ını çalıştırmaya devam eder.
 *
 * Sahip olunmayan ürünler kilitli kart olarak görünür ve satın alma ya da
 * tanışma akışına bağlanır.
 */
export default async function ProductSelectorPage() {
  const session = await requireSession();
  if (session.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  if (!session.mfaVerifiedAt && (await userRequiresLoginMfa(session.userId, session.role))) redirect("/giris/mfa");

  const states = await loadProductPanelStates(session.userId, session.role);
  // Personelin giriş yolu izinlerden gelir (ör. Deneme Ligi operatörü canlı operasyona iner).
  const entries = Object.fromEntries(
    await Promise.all(PANEL_PRODUCTS.map(async (code) => [code, await resolveProductEntryPath(session, code)] as const)),
  ) as Record<(typeof PANEL_PRODUCTS)[number], string | null>;
  const cards: ProductPanelCardModel[] = PANEL_PRODUCTS.map((code) => {
    const catalog = publicProducts.find((product) => product.registryCode === code);
    return {
      code,
      name: code === "OK" ? yonBrand.name : code === "ODK" ? denemeLigiBrand.name : catalog?.name ?? code,
      brand: PANEL_BRANDS[code],
      role: catalog?.role ?? "",
      description: catalog?.description ?? "",
      state: states[code] === "ACTIVE" && !entries[code] ? "LOCKED" : states[code],
      href: entries[code] ?? productRolePath(code, session.role),
      lastUsed: session.activeProduct === code,
      lockedCta: LOCKED_CTA[code],
    };
  });
  const anyActive = cards.some((card) => card.state === "ACTIVE");
  const isFamily = session.role === "STUDENT" || session.role === "PARENT";

  return (
    <OfflineSyncProvider scope={offlineSessionScope(session.sessionId)} available={false} enabled={false} lowDataMode={false}>
      <main id="main-content" tabIndex={-1} className="pn-scope min-h-dvh px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-[1040px]">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/design/od-logo.png" alt="" width={1254} height={1254} sizes="40px" priority className="h-10 w-10 rounded-[11px] object-cover" />
              <div>
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-dc-ink-ghost">{roleLabel(session.role)}</p>
                <p className="text-[14.5px] font-bold text-dc-ink">{session.fullName || session.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={isFamily ? ACCOUNT_SETTINGS_PATH : "/panel/guvenlik"}
                className="inline-flex items-center gap-1.5 rounded-full border border-dc-line bg-white px-3 py-1.5 text-[12px] font-semibold text-dc-ink"
              >
                <Settings size={13} aria-hidden="true" /> {isFamily ? "Hesap ayarları" : "Güvenlik"}
              </Link>
              <LogoutButton />
            </div>
          </header>

          <h1 className="mt-10 text-[26px] font-extrabold tracking-[-0.02em] text-dc-ink sm:text-[30px]">Hangi panele girmek istiyorsun?</h1>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-[1.6] text-dc-ink-muted">
            {anyActive
              ? "Panelini seç; istediğin zaman menüdeki “Panel değiştir” ile diğerine geçebilirsin."
              : isFamily
                ? "Henüz aktif bir paketin yok. Paket satın aldığında ilgili panel otomatik açılır; öğretmen ataması için seninle iletişime geçeriz."
                : "Hesabınız için açık bir ürün paneli yok."}
          </p>

          <div className="mt-6">
            <AccountCompletionBanner userId={session.userId} role={session.role} />
          </div>

          <ul className="mt-2 grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <li key={card.code} className="flex">
                <ProductPanelCard card={card} />
              </li>
            ))}
          </ul>
        </div>
      </main>
    </OfflineSyncProvider>
  );
}
