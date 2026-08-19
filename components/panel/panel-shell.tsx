import Link from "next/link";
import Image from "next/image";
import type { ProductCode, UserRole } from "@prisma/client";
import { ArrowLeftRight, Bell, ShieldCheck } from "lucide-react";
import { productRolePath, roleLabel } from "@/lib/auth/roles";
import { getAccessibleProducts } from "@/lib/auth/products";
import { getSession } from "@/lib/auth/session";
import { getBusinessAccess } from "@/lib/business/permissions";
import { prisma } from "@/lib/prisma";
import { AdminCommandSearch } from "@/components/panel/admin-command-search";
import { LogoutButton } from "@/components/panel/logout-button";
import { PanelNav } from "@/components/panel/panel-nav";
import { PanelMobileNav } from "@/components/panel/panel-mobile-nav";
import { AccessibilityPreferenceApplier } from "@/components/panel/accessibility-preference-applier";
import { defaultAccessibilityViewPreference } from "@/lib/accessibility-preferences";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { OfflineSyncProvider } from "@/components/panel/offline-sync-provider";
import { offlineSessionScope } from "@/lib/offline-scope";
import { PanelFeatureProvider } from "@/components/panel/panel-feature-provider";

/**
 * PANEL KABUĞU — onaylı tasarım (Panel.dc.html).
 *
 * 248px beyaz sidebar (marka, menü, altta rol + kullanıcı) + 64px topbar
 * (sayfa başlığı, bağlamsal kontroller, bildirim, avatar), zemin #F6F8F7.
 * Dört rol için TEK kabuk; değişen yalnız menü, veri ve bağlamsal kontroller.
 *
 * Mobilde sidebar drawer'a döner (`PanelMobileNav`).
 *
 * Bu bileşen yeniden yazılırken korunan davranışlar: feature flag sağlayıcı,
 * çevrimdışı senkron sağlayıcı, erişilebilirlik tercih uygulayıcı, ana içeriğe
 * geç bağlantısı, okunmamış bildirim sayacı, ürün/çalışma alanı değiştirme,
 * oturum yönetimi ve çıkış.
 */
export async function PanelShell({
  role,
  fullName,
  email,
  product = "OD",
  workspace = "PRODUCT",
  pageTitle,
  topbarSlot,
  nav,
  children,
}: {
  role: UserRole;
  fullName: string | null;
  email: string;
  product?: ProductCode;
  workspace?: "PRODUCT" | "BUSINESS";
  /** Topbar'da solda görünen sayfa başlığı. */
  pageTitle?: string;
  /** Role özgü bağlamsal kontrol (ör. velinin öğrenci seçici). */
  topbarSlot?: React.ReactNode;
  /**
   * Kendi menüsü olan çalışma alanları (ODK, İşletme) menülerini buradan
   * geçirir. Verilmezse rol × yetki menüsü (`PanelNav`) kullanılır.
   */
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isBusinessWorkspace = workspace === "BUSINESS";
  const session = await getSession();

  const unread = session
    ? await prisma.notification.count({ where: { userId: session.userId, readAt: null } })
    : 0;

  const flags = getPanelFeatureFlags();
  const accessibilityEnabled = flags.accessibilityProfile;
  const storedPreference =
    accessibilityEnabled && session
      ? await prisma.accessibilityPreference.findUnique({
          where: { userId: session.userId },
          select: {
            reducedMotion: true,
            highContrast: true,
            textScale: true,
            comfortableSpacing: true,
            captionsPreferred: true,
            transcriptPreferred: true,
          },
        })
      : null;
  const accessibilityPreference = storedPreference || defaultAccessibilityViewPreference;

  const networkPreference =
    flags.offlineMode && session
      ? await prisma.networkPreference.findUnique({
          where: { userId: session.userId },
          select: { lowDataMode: true, offlineWritesEnabled: true },
        })
      : null;
  const offlineScope = session ? offlineSessionScope(session.sessionId) : "";

  // Menü yetkiye göre daraltılır; asıl kontrol sunucu guard'larındadır.
  const products = session ? await getAccessibleProducts(session.userId, session.role) : [];
  void products;

  const homeHref = isBusinessWorkspace
    ? "/panel/yonetim/isletme/genel-bakis"
    : productRolePath(product, role);

  /*
   * ÇALIŞMA ALANI DEĞİŞTİRME.
   *
   * Eskiden bu bağlantı `/panel/urun-sec`e gidiyordu; o sayfa tek-panele
   * geçişte salt yönlendiriciye indirildiği için düğme kullanıcıyı geldiği
   * yere geri atıyordu — İşletme Paneli'ne arayüzden hiçbir yol kalmamıştı.
   * Artık gerçek hedefe bağlanıyor ve YALNIZ gidilecek bir alan varsa basılıyor.
   *
   * Görünürlük gerçek işletme atamasından türetilir (rol tahmininden değil),
   * böylece 404'e giden bir bağlantı gösterilmez.
   */
  const businessUnits =
    session && !isBusinessWorkspace && process.env.CRM_PANEL_ENABLED !== "false"
      ? await getBusinessAccess(session, "dashboard:read")
      : [];
  const workspaceSwitch = isBusinessWorkspace
    ? { href: productRolePath(product, role), label: "Eğitim paneline dön" }
    : businessUnits.length > 0
      ? { href: "/panel/yonetim/isletme/genel-bakis", label: "İşletme paneline geç" }
      : null;

  const displayName = fullName || email;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");

  const avatar = (size: "sm" | "md") => (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-dc-brand-soft font-bold text-dc-brand-hover ${
        size === "md" ? "h-8 w-8 text-[13px]" : "h-[30px] w-[30px] text-[12.5px]"
      }`}
    >
      {initials || "?"}
    </span>
  );

  return (
    <PanelFeatureProvider flags={flags}>
      <OfflineSyncProvider
        scope={offlineScope}
        available={flags.offlineMode}
        enabled={Boolean(flags.offlineMode && networkPreference?.offlineWritesEnabled)}
        lowDataMode={Boolean(flags.offlineMode && networkPreference?.lowDataMode)}
      >
        <div
          className={`site-scope dc-panel-bg flex min-h-dvh ${
            isBusinessWorkspace ? "business-panel-scope" : ""
          }`}
        >
          {accessibilityEnabled ? (
            <AccessibilityPreferenceApplier preference={accessibilityPreference} />
          ) : null}
          <a
            href="#panel-content"
            className="fixed left-4 top-3 z-[400] -translate-y-24 rounded-full bg-dc-ink px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
          >
            Ana içeriğe geç
          </a>

          {/* Sidebar — handoff: 248px, beyaz, sağ kenarlık */}
          <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-dc-line bg-white px-3.5 py-5 lg:flex">
            {/*
              Erişilebilir ad çalışma alanına göre değişir: aynı marka
              bağlantısı işletme alanında başka bir yere gidiyor, ekran
              okuyucuda ikisi aynı isimle duyurulmamalı.
            */}
            <Link
              href={homeHref}
              aria-label={isBusinessWorkspace ? "İşletme yönetim ana sayfası" : "Panel ana sayfası"}
              className="flex items-center gap-2.5 px-2 pb-[22px] pt-1"
            >
              <Image
                src="/design/od-logo.png"
                alt=""
                aria-hidden="true"
                width={1254}
                height={1254}
                priority
                sizes="30px"
                className="h-[30px] w-[30px] rounded-lg object-cover"
              />
              <span className="text-[14.5px] font-bold text-dc-ink">onlinedershanem</span>
            </Link>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {nav ?? <PanelNav role={role} products={products} />}
            </div>

            <div className="mt-auto border-t border-dc-line-soft pt-5">
              {workspaceSwitch ? (
                <Link
                  href={workspaceSwitch.href}
                  className="mb-3 flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[12px] font-semibold text-dc-ink-muted transition-colors hover:bg-dc-surface-muted hover:text-dc-ink"
                >
                  <ArrowLeftRight size={13} aria-hidden="true" /> {workspaceSwitch.label}
                </Link>
              ) : null}

              <p className="px-2.5 font-mono text-[10.5px] font-semibold uppercase text-dc-ink-ghost">
                {roleLabel(role)}
              </p>
              <div className="flex items-center gap-2.5 px-2.5 pb-1 pt-3">
                {avatar("md")}
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold text-dc-ink">
                    {displayName}
                  </span>
                  <span className="block truncate text-[12px] text-dc-ink-faint">{email}</span>
                </span>
              </div>
              <div className="mt-2 border-t border-dc-line-soft pt-2">
                <LogoutButton compact />
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Topbar — handoff: 64px, beyaz, alt kenarlık */}
            <header className="sticky top-0 z-40 flex h-16 flex-none items-center gap-4 border-b border-dc-line bg-white px-4 sm:px-7">
              <PanelMobileNav role={role} products={products} nav={nav} />

              {pageTitle ? (
                <h1 className="truncate text-[15px] font-bold text-dc-ink">{pageTitle}</h1>
              ) : null}

              {topbarSlot ? <div className="min-w-0 lg:ml-3">{topbarSlot}</div> : null}

              <div className="ml-auto flex items-center gap-3 sm:gap-[18px]">
                {role === "ADMIN" && !isBusinessWorkspace ? <AdminCommandSearch /> : null}

                <Link
                  href="/panel/oturumlar"
                  aria-label="Aktif oturumları yönet"
                  className="hidden text-dc-ink-muted transition-colors hover:text-dc-ink sm:block"
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                </Link>

                <Link
                  href="/panel/bildirimler"
                  aria-label={unread ? `${unread} okunmamış bildirimi aç` : "Bildirimleri aç"}
                  className="relative text-dc-ink-muted transition-colors hover:text-dc-ink"
                >
                  <Bell size={17} aria-hidden="true" />
                  {unread ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full bg-dc-brand ring-2 ring-white"
                    />
                  ) : null}
                </Link>

                {avatar("sm")}

                <div className="lg:hidden">
                  <LogoutButton compact />
                </div>
              </div>
            </header>

            <main
              id="panel-content"
              tabIndex={-1}
              className="flex-1 px-4 pb-10 pt-6 sm:px-8 sm:pb-10 sm:pt-7"
            >
              {children}
            </main>
          </div>
        </div>
      </OfflineSyncProvider>
    </PanelFeatureProvider>
  );
}
