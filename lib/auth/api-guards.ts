import "server-only";

import { NextResponse } from "next/server";
import type { ProductCode, UserRole } from "@prisma/client";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { getSession, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth/session";
import { checkPilotAccess } from "@/lib/pilot-access";
import { checkOdkPilotAccess } from "@/lib/odk/pilot-access";
import { hasProductAccess, hasProductCodeAccess } from "@/lib/auth/products";
import { asLegacyProductCode } from "@/lib/products/codes";
import { pilotProgramForProduct } from "@/lib/auth/product-pilot";
import { hasFreshStepUp } from "@/lib/auth/mfa-policy";
import {
  getResolvedAdminPreview,
  toEffectivePreviewSession,
} from "@/lib/auth/admin-preview";
import {
  getResolvedAdminTeacherMode,
  toAdminTeacherModeSession,
} from "@/lib/auth/admin-teacher-mode";
import { isPreviewableRole } from "@/lib/panel/preview-context";
import { hasStaffPermission, userRequiresMfa } from "@/lib/products/staff-permissions";
import { staffPermissionProduct } from "@/lib/products/staff-mode";
import type { StaffPermission } from "@/lib/products/staff-permission-matrix";

/**
 * API route'ları için yetki kapısı.
 *
 * `guards.ts`'ten AYRI: o dosya `redirect()`/`notFound()` kullanıyor — bunlar
 * sayfa render'ına özgü. Bir API route'unda redirect atmak, çağıran fetch'e
 * anlamsız bir HTML döndürür. Burada JSON dönüyoruz.
 *
 * Kullanım:
 *   const auth = await requireApiProductRole("OD", "ADMIN");
 *   if (!auth.ok) return auth.response;
 *   // auth.session güvenle kullanılabilir
 *
 * Admin öğretmen çalışma modu: TEACHER API'lerinde aynı userId ile yazılabilir.
 * Admin preview: okuma API'leri subject kimliği alır; yazma `guardMutation` ile engellenir.
 */
export type ApiAuth =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

async function requireApiAuthorizedRole(roles: UserRole[], requireMfa = true): Promise<ApiAuth> {
  if (!PANEL_ENABLED) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 }),
    };
  }

  const session = await getSession();
  if (!session) {
    const response = NextResponse.json(
      { error: "Oturumunuz sona ermiş. Tekrar giriş yapın." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.delete(SESSION_COOKIE_NAME);
    return {
      ok: false,
      response,
    };
  }

  // Geçici parolasını değiştirmemiş kullanıcı hiçbir iş yapamaz.
  if (session.mustChangePassword) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Devam etmeden önce parolanızı değiştirmeniz gerekiyor." },
        { status: 403 },
      ),
    };
  }

  // ADMIN ve ayrıcalıklı ürün personeli (Deneme Ligi editör / operatör / yayıncı,
  // ürün yöneticisi) ikinci faktör doğrulamadan iş yapamaz.
  if (requireMfa && !session.mfaVerifiedAt && (await userRequiresMfa(session.userId, session.role))) {
    return { ok: false, response: NextResponse.json({ error: "Bu hesap için ikinci faktörü doğrulayın.", code: "MFA_REQUIRED", redirect: "/giris/mfa" }, { status: 403 }) };
  }

  if (roles.includes(session.role)) {
    return { ok: true, session };
  }

  if (session.role === "ADMIN") {
    if (roles.includes("TEACHER")) {
      const teacherMode = await getResolvedAdminTeacherMode(session);
      if (teacherMode.enabled) {
        return { ok: true, session: toAdminTeacherModeSession(session) as SessionUser };
      }
    }

    const preview = await getResolvedAdminPreview(session);
    if (preview && roles.includes(preview.subject.role) && isPreviewableRole(preview.subject.role)) {
      return { ok: true, session: toEffectivePreviewSession(session, preview.subject) as SessionUser };
    }
  }

  // Sayfalarda 404 veriyoruz; API'de 403 yeterli — burada rota keşfi diye bir şey yok.
  return {
    ok: false,
    response: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }),
  };
}

/** Mutation API'lerinde gerçek ADMIN oturumunu (preview overlay'siz) almak için. */
export async function requireApiActorSession(...roles: UserRole[]): Promise<ApiAuth> {
  const auth = await requireApiAuthorizedRole(roles);
  if (!auth.ok) return auth;
  const actor = await getSession();
  if (!actor) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Oturumunuz sona ermiş. Tekrar giriş yapın." }, { status: 401 }),
    };
  }
  if (!roles.includes(actor.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }),
    };
  }
  return { ok: true, session: actor };
}

export async function requireApiRecentAdminStepUp(): Promise<ApiAuth> {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth;
  if (!hasFreshStepUp(auth.session.stepUpAt)) {
    return { ok: false, response: NextResponse.json({ error: "Bu hassas işlem için kimliğinizi yeniden doğrulayın.", code: "STEP_UP_REQUIRED", redirect: "/panel/guvenlik" }, { status: 428 }) };
  }
  return auth;
}

async function requireApiProductPilot(auth: { ok: true; session: SessionUser }, product: ProductCode): Promise<ApiAuth> {
  const program = pilotProgramForProduct(product);
  const pilot = program === "odk" ? await checkOdkPilotAccess(auth.session.userId, auth.session.role) : await checkPilotAccess(auth.session.userId, auth.session.role);
  if (pilot.allowed) return auth;
  return { ok: false, response: NextResponse.json({ error: pilot.reason === "KILL_SWITCH" ? "Pilot geçici olarak durduruldu." : "Bu pilot erişimi etkin değil." }, { status: pilot.reason === "KILL_SWITCH" ? 503 : 404 }) };
}

/** Bildirim ve görünüm tercihi gibi ürünler arasında ortak hesap işlemleri. */
export async function requireApiActiveUser(): Promise<ApiAuth> {
  return requireApiAuthorizedRole(["ADMIN", "TEACHER", "STUDENT", "PARENT"]);
}

export async function requireApiAccountRole(...roles: UserRole[]): Promise<ApiAuth> {
  return requireApiAuthorizedRole(roles);
}

/** Narrow pre-MFA boundary used only by ADMIN second-factor ceremonies. */
export async function requireApiPrimaryAdmin(): Promise<ApiAuth> {
  return requireApiAuthorizedRole(["ADMIN"], false);
}

/**
 * MFA törenleri için ön-MFA sınırı: ADMIN ya da MFA zorunlu (ayrıcalıklı)
 * ürün personeli. Diğer roller bu uçlara hiç giremez.
 */
export async function requireApiPrimaryMfaUser(): Promise<ApiAuth> {
  const auth = await requireApiAuthorizedRole(["ADMIN", "TEACHER"], false);
  if (!auth.ok) return auth;
  if (!(await userRequiresMfa(auth.session.userId, auth.session.role))) {
    return { ok: false, response: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }) };
  }
  return auth;
}

/**
 * Ürün PERSONEL API'leri: ADMIN / TEACHER + ürün pilot kapısı + personel izni.
 * İzinsiz → 403 JSON (API'lerde rota keşfi yok; mevcut rol kapılarıyla aynı).
 */
export async function requireApiStaffPermission(permission: StaffPermission): Promise<ApiAuth> {
  let auth = await requireApiAuthorizedRole(["ADMIN", "TEACHER"]);
  if (!auth.ok) return auth;
  auth = await requireApiProductPilot(auth, staffPermissionProduct(permission));
  if (!auth.ok) return auth;
  if (!(await hasStaffPermission(auth.session.userId, permission))) {
    return { ok: false, response: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }) };
  }
  return auth;
}

/** Personel izni + taze step-up (son 10 dk içinde ikinci faktör). */
export async function requireApiRecentStaffStepUp(permission: StaffPermission): Promise<ApiAuth> {
  const auth = await requireApiStaffPermission(permission);
  if (!auth.ok) return auth;
  if (!hasFreshStepUp(auth.session.stepUpAt)) {
    return { ok: false, response: NextResponse.json({ error: "Bu hassas işlem için kimliğinizi yeniden doğrulayın.", code: "STEP_UP_REQUIRED", redirect: "/panel/guvenlik" }, { status: 428 }) };
  }
  return auth;
}

/** API için rol kontrolüne ek olarak alt ürün üyeliğini doğrular. */
export async function requireApiProductRole(product: ProductCode, ...roles: UserRole[]): Promise<ApiAuth> {
  let auth = await requireApiAuthorizedRole(roles);
  if (!auth.ok) return auth;
  auth = await requireApiProductPilot(auth, product);
  if (!auth.ok) return auth;
  if (!(await hasProductAccess(auth.session.userId, auth.session.role, product))) {
    return { ok: false, response: NextResponse.json({ error: "Bu ürün için aktif erişiminiz yok." }, { status: 404 }) };
  }
  return auth;
}

/**
 * Registry farkında ürün kapısı: ürün kodu ENUM değil, `products.code` string'i.
 *
 * Pilot programı olan legacy kodlarda (OD/OK/ODK) doğrudan
 * `requireApiProductRole`'a devreder — o yolun davranışı birebir korunur.
 * Pilot programı olmayan registry ürünlerinde (KPSS) pilot kapısı YOKTUR;
 * `pilotProgramForProduct` böyle bir ürün için bilerek hata fırlatır. Kapı
 * `hasProductCodeAccess`tir: aktif üyelik + `Product.isActive`. Yani KPSS
 * satış kilidi (`is_active = false`) bu uçlarda da geçerlidir.
 */
export async function requireApiProductCodeRole(code: string, ...roles: UserRole[]): Promise<ApiAuth> {
  const legacy = asLegacyProductCode(code);
  if (legacy) return requireApiProductRole(legacy, ...roles);

  const auth = await requireApiAuthorizedRole(roles);
  if (!auth.ok) return auth;
  if (!(await hasProductCodeAccess(auth.session.userId, auth.session.role, code))) {
    return { ok: false, response: NextResponse.json({ error: "Bu ürün için aktif erişiminiz yok." }, { status: 404 }) };
  }
  return auth;
}

/**
 * Birden çok ürüne ait ortak uçlar (ör. dış deneme kayıtları OD ve Yön'de,
 * öğrenci başarısı verisi üç üründe de): rol + listelenen ürünlerden en az
 * birine erişim + o ürünün pilot kapısı. Hiçbirine erişim yoksa 404.
 */
export async function requireApiAnyProductRole(products: readonly ProductCode[], ...roles: UserRole[]): Promise<ApiAuth> {
  const auth = await requireApiAuthorizedRole(roles);
  if (!auth.ok) return auth;
  for (const product of products) {
    if (await hasProductAccess(auth.session.userId, auth.session.role, product)) {
      return requireApiProductPilot(auth, product);
    }
  }
  return { ok: false, response: NextResponse.json({ error: "Bu ürün için aktif erişiminiz yok." }, { status: 404 }) };
}

/** Online Dershanem'e ait legacy route'lar için açık ürün adı taşıyan kısayol. */
export async function requireApiOdRole(...roles: UserRole[]): Promise<ApiAuth> {
  return requireApiProductRole("OD", ...roles);
}
