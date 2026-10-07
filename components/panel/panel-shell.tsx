import Link from "next/link";
import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import type { ProductCode, UserRole } from "@prisma/client";
import { ArrowLeftRight, Bell, Settings, ShieldCheck } from "lucide-react";
import { ACCOUNT_SETTINGS_PATH, PRODUCT_SELECTOR_PATH, productLabel, productRolePath, roleLabel, rolePath } from "@/lib/auth/roles";
import { getAccessibleProducts } from "@/lib/auth/products";
import { getSession } from "@/lib/auth/session";
import { getResolvedAdminPreview } from "@/lib/auth/admin-preview";
import { getResolvedAdminTeacherMode } from "@/lib/auth/admin-teacher-mode";
import { getBusinessAccess } from "@/lib/business/permissions";
import { prisma } from "@/lib/prisma";
import { AdminCommandSearch } from "@/components/panel/admin-command-search";
import { AdminPreviewBanner } from "@/components/panel/admin-preview-banner";
import { AdminPreviewPicker } from "@/components/panel/admin-preview-picker";
import {
  AdminTeacherModeBanner,
  AdminTeacherModeSwitchButton,
} from "@/components/panel/admin-teacher-mode-controls";
import { LogoutButton } from "@/components/panel/logout-button";
import { PanelNav } from "@/components/panel/panel-nav";
import { ContextBreadcrumb } from "@/components/panel/context-breadcrumb";
import { WorkspaceSwitcher, type WorkspaceOption } from "@/components/panel/workspace-switcher";
import { SidebarToggle } from "@/components/panel/sidebar-toggle";
import { SIDEBAR_COOKIE, parseSidebarState } from "@/lib/panel/sidebar-preference";
import { PanelMobileNav } from "@/components/panel/panel-mobile-nav";
import { AccessibilityPreferenceApplier } from "@/components/panel/accessibility-preference-applier";
import { defaultAccessibilityViewPreference } from "@/lib/accessibility-preferences";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { OfflineSyncProvider } from "@/components/panel/offline-sync-provider";
import { offlineSessionScope } from "@/lib/offline-scope";
import { PanelFeatureProvider } from "@/components/panel/panel-feature-provider";
import { visibleGlobalSearchCommands } from "@/lib/panel/global-search";
import { panelNavSections, resolveNavScope, staffOdkNavItems, type PanelNavItem } from "@/lib/panel/navigation";
import { effectiveStaffPermissions } from "@/lib/products/staff-permissions";
import { staffAssignmentMode } from "@/lib/products/staff-mode";
import { AccountCompletionBanner } from "@/components/account/account-completion-banner";
import { yonBrand } from "@/lib/yon-brand";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";

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
  mobileQuickItems,
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
  /** İşletme gibi özel menülü alanlarda mobil alt çubuk kısayolları. */
  mobileQuickItems?: PanelNavItem[];
  children: React.ReactNode;
}) {
  const isBusinessWorkspace = workspace === "BUSINESS";
  const session = await getSession();
  const preview =
    session?.role === "ADMIN" ? await getResolvedAdminPreview(session) : null;
  const teacherMode =
    session?.role === "ADMIN" && !preview
      ? await getResolvedAdminTeacherMode(session)
      : { enabled: false as const };
  if (preview || teacherMode.enabled) noStore();

  const flags = getPanelFeatureFlags();
  const sidebarState = parseSidebarState((await cookies()).get(SIDEBAR_COOKIE)?.value);
  const accessibilityEnabled = flags.accessibilityProfile;
  const effectiveRole: UserRole = preview ? preview.subject.role : role;
  const effectiveUserId = preview ? preview.subject.userId : session?.userId;
  const shellFullName = preview ? preview.subject.fullName : fullName;
  const shellEmail = preview ? preview.subject.email : email;

  const [
    unread,
    storedPreference,
    networkPreference,
    products,
    businessUnits,
    leadUnits,
  ] = session
    ? await Promise.all([
        // Bildirimler her zaman gerçek actor'a aittir; View As'ta subject'e side-effect yok.
        preview
          ? Promise.resolve(0)
          : prisma.notification.count({
              where: { userId: session.userId, readAt: null, inAppVisible: true },
            }),
        accessibilityEnabled
          ? prisma.accessibilityPreference.findUnique({
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
          : Promise.resolve(null),
        flags.offlineMode
          ? prisma.networkPreference.findUnique({
              where: { userId: session.userId },
              select: { lowDataMode: true, offlineWritesEnabled: true },
            })
          : Promise.resolve(null),
        getAccessibleProducts(
          effectiveUserId ?? session.userId,
          preview
            ? preview.subject.role
            : role === "TEACHER" && teacherMode.enabled
              ? "TEACHER"
              : session.role,
        ),
        !isBusinessWorkspace &&
        !preview &&
        process.env.CRM_PANEL_ENABLED !== "false"
          ? getBusinessAccess(session, "dashboard:read")
          : Promise.resolve([]),
        !isBusinessWorkspace &&
        !preview &&
        (role === "ADMIN" || role === "TEACHER")
          ? getBusinessAccess(session, "lead:read")
          : Promise.resolve([]),
      ])
    : [0, null, null, [], [], []];

  const accessibilityPreference =
    storedPreference || defaultAccessibilityViewPreference;
  const offlineScope = session ? offlineSessionScope(session.sessionId) : "";

  /*
   * ÜRÜN PANELİ KAPSAMI.
   *
   * Girişte seçilen ürün (`Session.activeProduct`) menüyü daraltır. ODK'nın
   * kendi route ağacı olduğu için ODK sayfası açıksa kapsam ODK'dır; OD/OK
   * sayfalarında seçim ODK ise kapsam kullanıcının sahip olduğu OD/OK'ye
   * döner. Kapsam yalnız SUNUMDUR — sayfalar kendi guard'larını çalıştırır.
   */
  const navScope = (() => {
    if (isBusinessWorkspace || nav) return null;
    if (product === "ODK") return resolveNavScope(effectiveRole, products, "ODK");
    const selected = session?.activeProduct;
    const candidates: ProductCode[] = [...(selected && selected !== "ODK" ? [selected] : []), "OD", "OK"];
    for (const candidate of candidates) {
      const resolved = resolveNavScope(effectiveRole, products, candidate);
      if (resolved) return resolved;
    }
    return null;
  })();
  // Enforce modunda öğretmenin Deneme Ligi menüsü personel izinlerinden kurulur
  // (editör / operatör / yayıncı / rapor okuyucu). Menü yetki değildir.
  const staffOdkPermissions = await (async () => {
    if (effectiveRole !== "TEACHER" || navScope !== "ODK" || !effectiveUserId) return null;
    if (staffAssignmentMode() !== "enforce") return null;
    const access = await effectiveStaffPermissions(effectiveUserId);
    return access.isAdmin ? null : [...access.permissions];
  })();
  /*
   * KOMUT MENÜSÜ (⌘K). Rol komutları sunucuda süzülür: rol, bayrak, işletme
   * izni ve personel izinleri (`effectiveStaffPermissions`, guard'larla aynı
   * mod kuralı). Sayfa komutları kullanıcının KENDİ menüsünden türetilir, bu
   * yüzden açılamayacak bir sayfaya giden komut üretilmez.
   */
  const commandStaffPermissions =
    session && !preview && effectiveRole === "TEACHER" && effectiveUserId
      ? (await effectiveStaffPermissions(effectiveUserId)).permissions
      : undefined;
  const roleCommands =
    session && !preview && !isBusinessWorkspace
      ? visibleGlobalSearchCommands({
          role: effectiveRole,
          flags,
          businessPermissions: leadUnits.length ? (["lead:read"] as const) : [],
          staffPermissions: commandStaffPermissions,
        }).map((command) => ({
          id: command.id,
          label: command.label,
          detail: command.detail,
          href: command.href,
        }))
      : [];
  const navCommands =
    session && !preview && !isBusinessWorkspace && !nav
      ? [
          ...panelNavSections(effectiveRole, products, flags, rolePath(effectiveRole), navScope, staffOdkPermissions).flatMap(
            (navSection) =>
              navSection.items.map((item) => ({
                id: `nav:${item.id}`,
                label: item.label,
                detail: `Sayfa · ${navSection.title.toLocaleLowerCase("tr-TR").replace(/^./, (c) => c.toLocaleUpperCase("tr-TR"))}`,
                href: item.href,
              })),
          ),
          { id: "nav:notifications", label: "Bildirimler", detail: "Sayfa · Genel", href: "/panel/bildirimler" },
          { id: "nav:settings", label: "Ayarlar", detail: "Hesap ve panel tercihleri", href: ACCOUNT_SETTINGS_PATH },
        ]
      : [];
  const searchCommands = [...roleCommands, ...navCommands].filter(
    (command, index, all) => all.findIndex((other) => other.href === command.href) === index,
  );
  const entitySearch = effectiveRole === "ADMIN" || effectiveRole === "TEACHER";

  // Ürün vurgusu (`.pn-scope[data-product]`) — yalnız sunum; yetki değildir.
  const accentProduct =
    navScope === "OK" ? "yon" : navScope === "ODK" || product === "ODK" ? "dl" : "od";
  const productSwitch =
    !isBusinessWorkspace && !preview && navScope
      ? { href: PRODUCT_SELECTOR_PATH, label: `${productLabel(navScope)} · Panel değiştir` }
      : null;

  const homeHref = isBusinessWorkspace
    ? "/panel/yonetim/isletme/genel-bakis"
    : staffOdkPermissions
      ? (staffOdkNavItems(staffOdkPermissions)[0]?.href ?? productRolePath("ODK", effectiveRole))
      : productRolePath(navScope ?? product, effectiveRole);

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
  const workspaceSwitch =
    preview || isBusinessWorkspace
      ? isBusinessWorkspace
        ? {
            href: productRolePath(product, effectiveRole),
            label: "Eğitim paneline dön",
          }
        : null
      : businessUnits.length > 0
        ? {
            href: "/panel/yonetim/isletme/genel-bakis",
            label: "İşletme paneline geç",
          }
        : null;

  /*
   * HESAP SAYFASI — tasarımda (Panel.dc.html → sProfile / pacc) profil ekranı
   * menüde değil, sağ üstteki avatar üzerinden açılıyor. Yalnız gerçekten var
   * olan rotalar bağlanır. Öğretmen ve yönetici avatarı güvenlik merkezine
   * gider; MFA/oturum yönetimi bu roller için özellikle görünür kalır.
   */
  const accountHref: string | null =
    isBusinessWorkspace || preview
      ? null
      : effectiveRole === "STUDENT" || effectiveRole === "PARENT"
        ? ACCOUNT_SETTINGS_PATH
        : "/panel/guvenlik";

  /*
   * ÇALIŞMA ALANI DEĞİŞTİRİCİ verisi. Seçenekler kullanıcının ERİŞEBİLDİĞİ
   * ürünlerdir (getAccessibleProducts); pilot kapısı ve son karar
   * `/api/panel/active-product` ucundadır. İşletme alanı gerçek işletme
   * atamasından türetilir.
   */
  const WORKSPACE_LOGO: Record<"OD" | "OK" | "ODK" | "BUSINESS", string> = {
    OD: "/design/od-logo.png",
    OK: yonBrand.logo,
    ODK: denemeLigiBrand.logo,
    BUSINESS: "/design/od-logo.png",
  };
  const workspaceOptions: WorkspaceOption[] = [
    ...(["OD", "OK", "ODK"] as const)
      .filter((code) => products.includes(code))
      .map((code) => ({
        key: code,
        label: productLabel(code),
        logo: WORKSPACE_LOGO[code],
        href: productRolePath(code, effectiveRole),
      })),
    ...(businessUnits.length > 0 || isBusinessWorkspace
      ? [{ key: "BUSINESS" as const, label: "İşletme", logo: WORKSPACE_LOGO.BUSINESS, href: "/panel/yonetim/isletme/genel-bakis" }]
      : []),
  ];
  const currentWorkspaceKey: WorkspaceOption["key"] | null = isBusinessWorkspace
    ? "BUSINESS"
    : navScope === "OD" || navScope === "OK" || navScope === "ODK"
      ? navScope
      : product === "ODK"
        ? "ODK"
        : null;
  const currentWorkspace: WorkspaceOption | null = currentWorkspaceKey
    ? (workspaceOptions.find((option) => option.key === currentWorkspaceKey) ?? {
        key: currentWorkspaceKey,
        label: currentWorkspaceKey === "BUSINESS" ? "İşletme" : productLabel(currentWorkspaceKey),
        logo: WORKSPACE_LOGO[currentWorkspaceKey],
        href: homeHref,
      })
    : null;
  const breadcrumbWorkspace = {
    label: currentWorkspace?.label ?? "Panel",
    href: homeHref,
  };

  const displayName = shellFullName || shellEmail;
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
        size === "md"
          ? "h-8 w-8 text-[13px]"
          : "h-[30px] w-[30px] text-[12.5px]"
      }`}
    >
      {initials || "?"}
    </span>
  );

  return (
    <PanelFeatureProvider flags={flags}>
      <OfflineSyncProvider
        scope={offlineScope}
        available={flags.offlineMode && !preview}
        enabled={Boolean(
          !preview &&
            flags.offlineMode &&
            networkPreference?.offlineWritesEnabled,
        )}
        lowDataMode={Boolean(
          flags.offlineMode && networkPreference?.lowDataMode,
        )}
      >
        <div
          className={`site-scope pn-scope flex min-h-dvh ${
            isBusinessWorkspace ? "business-panel-scope" : ""
          }`}
          data-product={accentProduct}
          data-pn-shell=""
          data-sidebar={sidebarState}
        >
          {accessibilityEnabled ? (
            <AccessibilityPreferenceApplier
              preference={accessibilityPreference}
            />
          ) : null}
          <a
            href="#panel-content"
            className="fixed left-4 top-3 z-400 -translate-y-24 rounded-full bg-dc-ink px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
          >
            Ana içeriğe geç
          </a>

          {/* Kenar çubuğu — 240px, sakin gri zemin, ince ayraç (roadmap §6.2) */}
          <aside className="pn-sidebar sticky top-0 hidden h-dvh w-[232px] flex-none flex-col border-r border-pn-border bg-pn-sidebar px-2.5 pb-3 pt-3 lg:flex xl:w-[240px]">
            {/*
              Erişilebilir ad çalışma alanına göre değişir: aynı marka
              bağlantısı işletme alanında başka bir yere gidiyor, ekran
              okuyucuda ikisi aynı isimle duyurulmamalı.
            */}
            {/*
              Ürün çalışma alanlarında değiştirici zaten marka ve alan adını
              gösterir; marka satırı yalnız İşletme alanında ve alan
              belirsizken basılır (aynı adı iki kez göstermemek için).
            */}
            {isBusinessWorkspace || !currentWorkspace ? (
            <Link
              href={homeHref}
              aria-label={
                isBusinessWorkspace
                  ? "İşletme yönetim ana sayfası"
                  : "Panel ana sayfası"
              }
              className="mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-pn-hover"
            >
              <Image
                src="/design/od-logo.png"
                alt=""
                aria-hidden="true"
                width={1254}
                height={1254}
                priority
                sizes="20px"
                className="h-5 w-5 rounded-[5px] object-cover"
              />
              <span className="text-[13px] font-bold text-pn-text">
                onlinedershanem
              </span>
            </Link>
            ) : null}

            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
              <WorkspaceSwitcher
                current={currentWorkspace}
                subtitle={displayName}
                options={workspaceOptions}
                selectorHref={PRODUCT_SELECTOR_PATH}
                disabled={Boolean(preview)}
              />
              </div>
              <div className="pt-1.5">
                <SidebarToggle mode="close" />
              </div>
            </div>

            {!preview ? (
              <div className="mt-3 flex flex-col gap-px">
                <Link
                  href="/panel/bildirimler"
                  aria-label={
                    unread
                      ? `Bildirimler, ${unread} okunmamış`
                      : "Bildirimler"
                  }
                  className="flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] font-medium text-pn-text-secondary transition-colors hover:bg-pn-hover hover:text-pn-text"
                >
                  <Bell size={15} aria-hidden="true" />
                  <span className="flex-1">Bildirimler</span>
                  {unread ? (
                    <span
                      aria-hidden="true"
                      className="min-w-5 rounded-full bg-pn-accent-soft px-1.5 text-center text-[11px] font-semibold text-pn-accent"
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </Link>
              </div>
            ) : null}

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {nav ?? <PanelNav role={effectiveRole} products={products} scope={navScope} staffOdkPermissions={staffOdkPermissions} />}
            </div>

            <div className="mt-3 flex flex-col gap-px border-t border-pn-border pt-3">
              {workspaceSwitch ? (
                <Link
                  href={workspaceSwitch.href}
                  className="flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-pn-text-secondary transition-colors hover:bg-pn-hover hover:text-pn-text"
                >
                  <ArrowLeftRight size={14} aria-hidden="true" />
                  {workspaceSwitch.label}
                </Link>
              ) : null}
              {!preview && !isBusinessWorkspace ? (
                <Link
                  href={ACCOUNT_SETTINGS_PATH}
                  className="flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-pn-text-secondary transition-colors hover:bg-pn-hover hover:text-pn-text"
                >
                  <Settings size={14} aria-hidden="true" />
                  Ayarlar
                </Link>
              ) : null}

              <div className="mt-2 flex items-center gap-2.5 rounded-md px-2 py-1.5">
                {avatar("md")}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-pn-text">
                    {displayName}
                  </span>
                  <span className="block truncate text-[11.5px] text-pn-text-muted">
                    {roleLabel(effectiveRole)}
                    {preview
                      ? " · önizleme"
                      : teacherMode.enabled
                        ? " · yönetici"
                        : ""}
                  </span>
                </span>
              </div>
              <div className="px-0.5">
                <LogoutButton compact />
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {preview ? (
              <AdminPreviewBanner
                previewRole={preview.subject.role}
                subjectName={preview.subject.fullName || preview.subject.email}
                notices={preview.subject.notices}
              />
            ) : teacherMode.enabled ? (
              <AdminTeacherModeBanner />
            ) : null}

            {/* Bağlam çubuğu — 48px: breadcrumb solda, araçlar sağda (roadmap §6.3) */}
            <header className="sticky top-0 z-40 flex h-12 flex-none items-center gap-2 border-b border-pn-border bg-pn-canvas px-3 sm:gap-3 sm:px-6">
              <PanelMobileNav
                role={effectiveRole}
                products={products}
                scope={navScope}
                staffOdkPermissions={staffOdkPermissions}
                nav={nav}
                mobileQuickItems={mobileQuickItems}
                drawerAccount={{
                  displayName,
                  email: shellEmail,
                  initials: initials || "?",
                  roleLine: `${roleLabel(effectiveRole)}${preview ? " · önizleme" : teacherMode.enabled ? " · yönetici" : ""}`,
                  workspaceSwitch,
                  productSwitch,
                  accountHref,
                  showSessionsLink: !preview,
                }}
              />

              <SidebarToggle mode="open" />

              <div className="min-w-0 flex-1 lg:flex-none">
                <ContextBreadcrumb
                  workspace={breadcrumbWorkspace}
                  pageTitle={pageTitle}
                  role={effectiveRole}
                  products={products}
                  scope={navScope}
                  staffOdkPermissions={staffOdkPermissions}
                  useRoleNav={!nav}
                />
              </div>

              {topbarSlot ? (
                <div className="panel-topbar-slot min-w-0 flex-1 overflow-x-auto lg:ml-3 lg:flex-none lg:overflow-visible">
                  {topbarSlot}
                </div>
              ) : null}

              <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                {!preview &&
                !teacherMode.enabled &&
                !isBusinessWorkspace &&
                role === "ADMIN" ? (
                  <div className="hidden md:flex md:items-center md:gap-2">
                    <AdminTeacherModeSwitchButton compact />
                    <AdminPreviewPicker compact />
                  </div>
                ) : null}

                {!isBusinessWorkspace && !preview && searchCommands.length ? (
                  <AdminCommandSearch commands={searchCommands} entitySearch={entitySearch} />
                ) : null}

                {!preview ? (
                  <Link
                    href="/panel/oturumlar"
                    aria-label="Aktif oturumları yönet"
                    className="hidden min-h-9 min-w-9 items-center justify-center rounded-md text-pn-text-muted transition-colors hover:bg-pn-hover hover:text-pn-text sm:inline-flex"
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                  </Link>
                ) : null}

                {!preview ? (
                  <Link
                    href="/panel/bildirimler"
                    aria-label={
                      unread
                        ? `${unread} okunmamış bildirimi aç`
                        : "Bildirimleri aç"
                    }
                    className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-pn-text-muted transition-colors hover:bg-pn-hover hover:text-pn-text lg:hidden"
                  >
                    <Bell size={17} aria-hidden="true" />
                    {unread ? (
                      <span
                        aria-hidden="true"
                        className="absolute right-2.5 top-2.5 h-[7px] w-[7px] rounded-full bg-pn-accent ring-2 ring-white"
                      />
                    ) : null}
                  </Link>
                ) : null}

                {accountHref ? (
                  <Link
                    href={accountHref}
                    aria-label="Profil, hesap ve güvenlik sayfasını aç"
                    className="hidden sm:block"
                  >
                    {avatar("sm")}
                  </Link>
                ) : (
                  <span className="hidden sm:block">{avatar("sm")}</span>
                )}

                <div className="hidden sm:block lg:hidden">
                  <LogoutButton compact />
                </div>
              </div>
            </header>

            <main
              id="panel-content"
              tabIndex={-1}
              className="flex-1 px-4 pb-32 pt-6 sm:px-8 sm:pb-10 sm:pt-7"
            >
              {session && !preview && !isBusinessWorkspace ? (
                <AccountCompletionBanner userId={session.userId} role={session.role} />
              ) : null}
              {children}
            </main>
          </div>
        </div>
      </OfflineSyncProvider>
    </PanelFeatureProvider>
  );
}
