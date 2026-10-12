import "server-only";

import { headers } from "next/headers";
import { readAdminOverlayTransport } from "@/lib/auth/admin-overlay";
import { toEffectivePreviewSession } from "@/lib/auth/admin-preview-core";
import { toAdminTeacherModeSession } from "@/lib/auth/admin-teacher-mode-core";
import type { ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { userRequiresLoginMfa, userRequiresMfa, effectiveStaffPermissions } from "@/lib/products/staff-permissions";
import { STAFF_PERMISSIONS, type StaffPermission } from "@/lib/products/staff-permission-matrix";
import { staffAssignmentMode } from "@/lib/products/staff-mode";
import { getAccessibleProducts } from "@/lib/auth/products";
import { loadProductPanelStates, PANEL_PRODUCTS } from "@/lib/auth/product-panels";
import { productLabel, rolePath } from "@/lib/auth/roles";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { mobilePrimaryNav, panelNavSections } from "@/lib/panel/navigation";
import { listParentVisibleChildren } from "@/lib/panel/parent-product-policy";
import { getResolvedAdminPreview } from "@/lib/auth/admin-preview";
import { getResolvedAdminTeacherMode } from "@/lib/auth/admin-teacher-mode";
import type { MobileBootstrap, MobileBusinessWorkspace, MobileMfaMethods, MobileSecurityCapabilities, MobileWorkspace } from "@/lib/mobile-contracts/bootstrap";
import { businessFlags } from "@/lib/business/flags";
import { getUserBusinessPermissions } from "@/lib/business/access";
import { BUSINESS_SECTION_GROUPS, SECTION_LABELS, visibleSections } from "@/lib/business/sections";
import { STEP_UP_MAX_AGE_MS, hasFreshStepUp } from "@/lib/auth/mfa-policy";
import { bootstrapGates, projectBootstrap, selectActiveWorkspace, toMobileNavItems, toMobileNavSections } from "@/lib/mobile/bootstrap";

/**
 * `GET /api/panel/me` verisi. Her karar mevcut alan servisine aittir:
 * MFA politikası `userRequiresLoginMfa`, ürün durumları
 * `loadProductPanelStates` (üyelik + pilot), menü `panelNavSections` /
 * `mobilePrimaryNav`, personel izni `effectiveStaffPermissions`, veli kapsamı
 * `listParentVisibleChildren`. Burada yeni iş kuralı yoktur.
 *
 * Kapılar açık değilken YALNIZ kimlik + kapı bilgisi okunur; ürün, menü,
 * izin, çocuk ve bildirim sorguları hiç çalışmaz.
 */
export async function buildMobileBootstrap(
  session: SessionUser,
  options: {
    minSupportedVersion: string | null;
    now?: Date;
    /** Test kancası; varsayılan admin önizleme / öğretmen modu çerezlerini okur. */
    resolveAdminOverlay?: (session: SessionUser) => Promise<boolean>;
  },
): Promise<MobileBootstrap> {
  const now = options.now ?? new Date();
  const loginMfaRequired = await userRequiresLoginMfa(session.userId, session.role);
  const mfaPending = !session.mustChangePassword && loginMfaRequired && !session.mfaVerifiedAt;
  const [mfaMethods, previewActive] = await Promise.all([
    mfaPending ? loadMfaMethods(session.userId) : Promise.resolve(null),
    session.role === "ADMIN" ? (options.resolveAdminOverlay ?? isAdminOverlayActive)(session) : Promise.resolve(false),
  ]);
  const gates = bootstrapGates({
    mustChangePassword: session.mustChangePassword,
    mfaVerifiedAt: session.mfaVerifiedAt,
    loginMfaRequired,
    mfaMethods,
    previewActive,
  });
  let effective = session;
  let adminOverlay: MobileBootstrap["adminOverlay"] = null;
  const transport = session.role === "ADMIN" && !options.resolveAdminOverlay
    ? await readAdminOverlayTransport(session) : { kind: "none" as const };
  if (gates.status === "READY" && transport.kind === "preview") {
    const preview = await getResolvedAdminPreview(session);
    if (!preview) throw new Error("Preview subject no longer available");
    effective = { ...session, ...toEffectivePreviewSession(session, preview.subject) };
    adminOverlay = { mode: "PREVIEW", actorUserId: session.userId, expiresAt: preview.context.expiresAt };
  } else if (gates.status === "READY" && transport.kind === "teacher") {
    effective = toAdminTeacherModeSession(session);
    adminOverlay = { mode: "TEACHER", actorUserId: session.userId, expiresAt: new Date(transport.payload.exp).toISOString() };
  }
  // Preview workspace selection lives in memory; never writes the subject/session.
  if (adminOverlay) {
    const selected = (await headers()).get("x-od-workspace");
    effective = { ...effective, activeProduct: selected === "OD" || selected === "OK" || selected === "ODK" ? selected : null };
  }
  const workspace = gates.status === "READY" ? await loadWorkspace(effective) : null;
  const result = projectBootstrap({
    identity: {
      userId: effective.userId,
      email: effective.email,
      fullName: effective.fullName,
      role: effective.role,
      mustChangePassword: session.mustChangePassword,
      mfaVerifiedAt: session.mfaVerifiedAt,
    },
    gates,
    minSupportedVersion: options.minSupportedVersion,
    now,
    workspace,
  });
  // İşletme alanı gerçek kullanıcının atamasından; mod açıkken gösterilmez.
  const business = gates.status === "READY" && !adminOverlay ? await loadBusinessWorkspace(session) : null;
  return { ...result, adminOverlay, business };
}

async function loadBusinessWorkspace(session: SessionUser): Promise<MobileBusinessWorkspace | null> {
  if (!businessFlags.panel) return null;
  const allowed = visibleSections(await getUserBusinessPermissions(session), { financeEnabled: businessFlags.finance });
  if (!allowed.length) return null;
  const groupOf = new Map(BUSINESS_SECTION_GROUPS.flatMap((group) => group.sections.map((slug) => [slug, group] as const)));
  return { sections: allowed.map((slug) => ({ slug, label: SECTION_LABELS[slug], group: groupOf.get(slug)?.id ?? "genel", groupLabel: groupOf.get(slug)?.label ?? "Genel" })) };
}

/** `/api/auth/mfa/status` ile aynı kaynak; yalnız var/yok bilgisi döner. */
async function loadMfaMethods(userId: string): Promise<MobileMfaMethods> {
  const [config, passkeyCount, recoveryCodeCount] = await Promise.all([
    prisma.adminMfa.findUnique({ where: { userId }, select: { totpEnabledAt: true } }),
    prisma.passkeyCredential.count({ where: { userId, revokedAt: null } }),
    prisma.mfaRecoveryCode.count({ where: { userId, usedAt: null } }),
  ]);
  const totp = Boolean(config?.totpEnabledAt);
  return { enrolled: totp || passkeyCount > 0, totp, recoveryCodes: totp && recoveryCodeCount > 0, passkey: passkeyCount > 0 };
}

/**
 * ADMIN ve MFA zorunlu personel: native step-up için kayıtlı yöntemler +
 * mevcut step-up penceresi. Politika `userRequiresMfa`; burada icat edilmez.
 */
/** Taze step-up isteyen işletme izinleri (finans kaydı / ters kayıt / dönem kilidi, işletme rolleri). */
const STEP_UP_BUSINESS_PERMISSIONS = ["finance:write", "finance:reverse", "role:write"] as const;

async function needsBusinessStepUp(session: SessionUser): Promise<boolean> {
  if (!businessFlags.panel) return false;
  const granted = await getUserBusinessPermissions(session);
  return STEP_UP_BUSINESS_PERMISSIONS.some((permission) => granted.has(permission));
}

async function loadSecurityCapabilities(session: SessionUser): Promise<MobileSecurityCapabilities | null> {
  // İşletme finans / rol yetkisi olan yönetici dışı kullanıcı da mobilde step-up yapabilmeli (P2.7c).
  if (session.role !== "ADMIN" && !(await userRequiresMfa(session.userId, session.role)) && !(await needsBusinessStepUp(session))) return null;
  const mfa = await loadMfaMethods(session.userId);
  const stepUpExpiresAt = session.stepUpAt && hasFreshStepUp(session.stepUpAt) ? new Date(session.stepUpAt.getTime() + STEP_UP_MAX_AGE_MS).toISOString() : null;
  return { mfa, stepUpExpiresAt };
}

async function isAdminOverlayActive(session: SessionUser): Promise<boolean> {
  const [preview, teacherMode] = await Promise.all([getResolvedAdminPreview(session), getResolvedAdminTeacherMode(session)]);
  return Boolean(preview) || teacherMode.enabled;
}

async function loadWorkspace(session: SessionUser): Promise<MobileWorkspace> {
  const flags = getPanelFeatureFlags();
  const [states, accessible, unreadNotifications] = await Promise.all([
    loadProductPanelStates(session.userId, session.role),
    getAccessibleProducts(session.userId, session.role),
    prisma.notification.count({ where: { userId: session.userId, readAt: null, inAppVisible: true } }),
  ]);
  const products = PANEL_PRODUCTS.map((code) => ({ code, label: productLabel(code), state: states[code] }));
  const { activeProduct, selectionRequired } = selectActiveWorkspace({ products, sessionActiveProduct: session.activeProduct });

  const isStaff = session.role === "TEACHER" || session.role === "ADMIN";
  const [staffAccess, security] = await Promise.all([
    isStaff ? effectiveStaffPermissions(session.userId) : Promise.resolve(null),
    isStaff ? loadSecurityCapabilities(session) : Promise.resolve(null),
  ]);
  const staffPermissions: StaffPermission[] = staffAccess ? (staffAccess.isAdmin ? [...STAFF_PERMISSIONS] : [...staffAccess.permissions]) : [];
  // Web kabuğu ile aynı kural (`PanelShell`): enforce modunda öğretmenin
  // Deneme Ligi menüsü personel izinlerinden kurulur.
  const staffOdkPermissions = session.role === "TEACHER" && activeProduct === "ODK" && staffAssignmentMode() === "enforce" && staffAccess && !staffAccess.isAdmin
    ? [...staffAccess.permissions]
    : null;

  const scope: ProductCode | null = activeProduct;
  const root = rolePath(session.role);
  // Yönetim arka ofisi (sipariş / paket yönetimi) yalnız ADMIN menüsünde.
  const navOptions = { backOffice: session.role === "ADMIN" };
  const navigation = scope
    ? {
        primary: toMobileNavItems(mobilePrimaryNav(session.role, accessible, flags, root, scope, staffOdkPermissions), navOptions),
        sections: toMobileNavSections(panelNavSections(session.role, accessible, flags, root, scope, staffOdkPermissions), navOptions),
      }
    : { primary: [], sections: [] };

  const parent = session.role === "PARENT"
    ? { children: (await listParentVisibleChildren(session.userId, "academic")).map((child) => ({ studentId: child.id, name: child.name })) }
    : null;

  return {
    products,
    activeProduct,
    selectionRequired,
    navigation,
    flags: { ...flags },
    capabilities: { staffPermissions, security },
    parent,
    unreadNotifications,
  };
}
