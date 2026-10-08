import "server-only";

import type { ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { userRequiresLoginMfa, effectiveStaffPermissions } from "@/lib/products/staff-permissions";
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
import type { MobileBootstrap, MobileMfaMethods, MobileWorkspace } from "@/lib/mobile-contracts/bootstrap";
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
  const workspace = gates.status === "READY" ? await loadWorkspace(session) : null;
  return projectBootstrap({
    identity: {
      userId: session.userId,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
      mfaVerifiedAt: session.mfaVerifiedAt,
    },
    gates,
    minSupportedVersion: options.minSupportedVersion,
    now,
    workspace,
  });
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
  const staffAccess = isStaff ? await effectiveStaffPermissions(session.userId) : null;
  const staffPermissions: StaffPermission[] = staffAccess ? (staffAccess.isAdmin ? [...STAFF_PERMISSIONS] : [...staffAccess.permissions]) : [];
  // Web kabuğu ile aynı kural (`PanelShell`): enforce modunda öğretmenin
  // Deneme Ligi menüsü personel izinlerinden kurulur.
  const staffOdkPermissions = session.role === "TEACHER" && activeProduct === "ODK" && staffAssignmentMode() === "enforce" && staffAccess && !staffAccess.isAdmin
    ? [...staffAccess.permissions]
    : null;

  const scope: ProductCode | null = activeProduct;
  const root = rolePath(session.role);
  const navigation = scope
    ? {
        primary: toMobileNavItems(mobilePrimaryNav(session.role, accessible, flags, root, scope, staffOdkPermissions)),
        sections: toMobileNavSections(panelNavSections(session.role, accessible, flags, root, scope, staffOdkPermissions)),
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
    capabilities: { staffPermissions },
    parent,
    unreadNotifications,
  };
}
