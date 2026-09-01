import "server-only";

import { notFound, redirect } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { LOGIN_PATH, PASSWORD_CHANGE_PATH } from "@/lib/auth/roles";
import { checkPilotAccess } from "@/lib/pilot-access";
import { checkOdkPilotAccess } from "@/lib/odk/pilot-access";
import { hasProductAccess } from "@/lib/auth/products";
import { MFA_PATH, STEP_UP_PATH, hasFreshStepUp } from "@/lib/auth/mfa-policy";
import {
  getResolvedAdminPreview,
  toEffectivePreviewSession,
} from "@/lib/auth/admin-preview";
import {
  getResolvedAdminTeacherMode,
  toAdminTeacherModeSession,
} from "@/lib/auth/admin-teacher-mode";
import { isPreviewableRole } from "@/lib/panel/preview-context";

/**
 * Yetki kapıları.
 *
 * BURASI GERÇEK GÜVENLİK SINIRIDIR — middleware değil. `middleware.ts` yalnızca
 * çereze bakıp iyimser yönlendirme yapar; doğrudan route handler çağrısı veya
 * RSC payload isteğiyle atlatılabilir. Bu yüzden her panel sayfası ve her
 * mutasyon, veriye dokunmadan ÖNCE buradaki bir guard'ı çağırmak zorundadır.
 *
 * Admin öğretmen çalışma modu: ADMIN oturumu kendi TeacherProfile'ı ile
 * öğretmen panelinde YAZABİLİR (View As değildir).
 *
 * Admin panel önizlemesi: gerçek oturum ADMIN kalır; subject kimliği döner;
 * mutation'lar engellenir.
 */

/** Panel kapalıyken `/panel/*` hiç var olmamış gibi davranır. */
export function requirePanelEnabled(): void {
  if (!PANEL_ENABLED) notFound();
}

/**
 * Oturum şart; yoksa girişe yollar.
 *
 * `mustChangePassword` KONTROL ETMEZ — parola değiştirme sayfasının kendisi
 * bunu kullanır, yoksa sonsuz yönlendirme döngüsü oluşur.
 */
export async function requireSession(): Promise<SessionUser> {
  requirePanelEnabled();
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}

/**
 * Oturum + geçici parola kontrolü + rol kontrolü. Panel sayfalarının
 * (parola sayfası hariç) kullanacağı guard budur.
 *
 * Yanlış rolde 403 değil 404 döner: "burada bir sayfa var ama giremezsin"
 * bilgisi bile sızmasın.
 *
 * Overlay sırası:
 * 1. Gerçek rol eşleşmesi (ADMIN sayfaları öğretmen modunda da açılır)
 * 2. Admin öğretmen çalışma modu → TEACHER (aynı userId, yazılabilir)
 * 3. Admin View As preview → subject kimliği (salt okunur)
 */
async function requireAuthorizedRole(...roles: UserRole[]): Promise<SessionUser> {
  const session = await requireSession();
  if (session.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  if (session.role === "ADMIN" && !session.mfaVerifiedAt) redirect(MFA_PATH);
  if (roles.includes(session.role)) return session;

  if (session.role === "ADMIN") {
    if (roles.includes("TEACHER")) {
      const teacherMode = await getResolvedAdminTeacherMode(session);
      if (teacherMode.enabled) {
        return toAdminTeacherModeSession(session) as SessionUser;
      }
    }

    const preview = await getResolvedAdminPreview(session);
    if (preview && roles.includes(preview.subject.role) && isPreviewableRole(preview.subject.role)) {
      return toEffectivePreviewSession(session, preview.subject) as SessionUser;
    }
  }

  notFound();
}

export async function requireRecentAdminStepUp(): Promise<SessionUser> {
  const session = await requireAuthorizedRole("ADMIN");
  if (!hasFreshStepUp(session.stepUpAt)) redirect(STEP_UP_PATH);
  return session;
}

async function requireProductPilot(session: SessionUser, product: ProductCode) {
  const pilot = product === "ODK" ? await checkOdkPilotAccess(session.userId, session.role) : await checkPilotAccess(session.userId, session.role);
  if (!pilot.allowed) notFound();
}

/**
 * TEK PANEL kapısı — yalnız rol doğrular, ÜRÜN ŞART KOŞMAZ.
 *
 * Panel tek panele geçtiği için her kullanıcı hangi ürünü almış olursa olsun
 * kendi paneline girebilmeli; satın alınan ürünler panelin İÇİNDE bölüm
 * olarak açılır. Ürün bağımsız sayfalar (panel ana sayfası, bildirimler,
 * erişilebilirlik, veri kullanımı, oturumlar) bu kapıyı kullanır.
 *
 * DİKKAT: ürün verisi gösteren sayfalar bunu KULLANMAZ — onlar
 * `requireProductRole(product, ...)` ile korunur. Bu kapı "panele girebilir"
 * demektir, "o ürünün verisini görebilir" demek DEĞİLDİR.
 */
export async function requirePanelRole(...roles: UserRole[]): Promise<SessionUser> {
  return requireAuthorizedRole(...roles);
}

/**
 * Online Dershanem (OD) ürün kapsamındaki sayfalar.
 * Ders, ödev, materyal, haftalık plan gibi OD verisi gösteren her sayfa.
 */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const session = await requireAuthorizedRole(...roles);
  await requireProductPilot(session, "OD");
  if (!(await hasProductAccess(session.userId, session.role, "OD"))) notFound();
  return session;
}

/** Rol farketmeksizin, parolasını değiştirmiş her kullanıcı. */
export async function requireActiveUser(): Promise<SessionUser> {
  return requireAuthorizedRole("ADMIN", "TEACHER", "STUDENT", "PARENT");
}

/** Rol ve ürün erişimini aynı güvenlik kapısında doğrular. */
export async function requireProductRole(product: ProductCode, ...roles: UserRole[]): Promise<SessionUser> {
  const session = await requireAuthorizedRole(...roles);
  await requireProductPilot(session, product);
  if (!(await hasProductAccess(session.userId, session.role, product))) notFound();
  return session;
}
