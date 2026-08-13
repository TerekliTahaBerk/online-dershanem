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

/**
 * Yetki kapıları.
 *
 * BURASI GERÇEK GÜVENLİK SINIRIDIR — middleware değil. `middleware.ts` yalnızca
 * çereze bakıp iyimser yönlendirme yapar; doğrudan route handler çağrısı veya
 * RSC payload isteğiyle atlatılabilir. Bu yüzden her panel sayfası ve her
 * mutasyon, veriye dokunmadan ÖNCE buradaki bir guard'ı çağırmak zorundadır.
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
 */
async function requireAuthorizedRole(...roles: UserRole[]): Promise<SessionUser> {
  const session = await requireSession();
  if (session.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  if (session.role === "ADMIN" && !session.mfaVerifiedAt) redirect(MFA_PATH);
  if (!roles.includes(session.role)) notFound();
  return session;
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

/** Mevcut panel sayfaları Online Dershanem ürün kapsamındadır. */
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
