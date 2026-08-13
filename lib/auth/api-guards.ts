import "server-only";

import { NextResponse } from "next/server";
import type { ProductCode, UserRole } from "@prisma/client";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { getSession, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth/session";
import { checkPilotAccess } from "@/lib/pilot-access";
import { checkOdkPilotAccess } from "@/lib/odk/pilot-access";
import { hasProductAccess } from "@/lib/auth/products";
import { hasFreshStepUp } from "@/lib/auth/mfa-policy";

/**
 * API route'ları için yetki kapısı.
 *
 * `guards.ts`'ten AYRI: o dosya `redirect()`/`notFound()` kullanıyor — bunlar
 * sayfa render'ına özgü. Bir API route'unda redirect atmak, çağıran fetch'e
 * anlamsız bir HTML döndürür. Burada JSON dönüyoruz.
 *
 * Kullanım:
 *   const auth = await requireApiRole("ADMIN");
 *   if (!auth.ok) return auth.response;
 *   // auth.session güvenle kullanılabilir
 */
export type ApiAuth =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

async function requireApiAuthorizedRole(roles: UserRole[], requireAdminMfa = true): Promise<ApiAuth> {
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

  if (!roles.includes(session.role)) {
    // Sayfalarda 404 veriyoruz; API'de 403 yeterli — burada rota keşfi diye bir şey yok.
    return {
      ok: false,
      response: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }),
    };
  }

  if (requireAdminMfa && session.role === "ADMIN" && !session.mfaVerifiedAt) {
    return { ok: false, response: NextResponse.json({ error: "Yönetici erişimi için ikinci faktörü doğrulayın.", code: "MFA_REQUIRED", redirect: "/giris/mfa" }, { status: 403 }) };
  }

  return { ok: true, session };
}

export async function requireApiRecentAdminStepUp(): Promise<ApiAuth> {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth;
  if (!hasFreshStepUp(auth.session.stepUpAt)) {
    return { ok: false, response: NextResponse.json({ error: "Bu hassas işlem için kimliğinizi yeniden doğrulayın.", code: "STEP_UP_REQUIRED", redirect: "/panel/guvenlik" }, { status: 428 }) };
  }
  return auth;
}

async function requireApiProductPilot(auth: { ok: true; session: SessionUser }, product: ProductCode): Promise<ApiAuth> {
  const pilot = product === "ODK" ? await checkOdkPilotAccess(auth.session.userId, auth.session.role) : await checkPilotAccess(auth.session.userId, auth.session.role);
  if (pilot.allowed) return auth;
  return { ok: false, response: NextResponse.json({ error: pilot.reason === "KILL_SWITCH" ? "Pilot geçici olarak durduruldu." : "Bu pilot erişimi etkin değil." }, { status: pilot.reason === "KILL_SWITCH" ? 503 : 404 }) };
}

/** Mevcut panel API'leri Online Dershanem ürün kapsamındadır. */
export async function requireApiRole(...roles: UserRole[]): Promise<ApiAuth> {
  let auth = await requireApiAuthorizedRole(roles);
  if (!auth.ok) return auth;
  auth = await requireApiProductPilot(auth, "OD");
  if (!auth.ok) return auth;
  if (!(await hasProductAccess(auth.session.userId, auth.session.role, "OD"))) {
    return { ok: false, response: NextResponse.json({ error: "Bu ürün için aktif erişiminiz yok." }, { status: 404 }) };
  }
  return auth;
}

/** Bildirim ve görünüm tercihi gibi iki üründe ortak hesap işlemleri. */
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
