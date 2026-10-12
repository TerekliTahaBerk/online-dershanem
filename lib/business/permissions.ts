import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasFreshStepUp, STEP_UP_PATH } from "@/lib/auth/mfa-policy";
import { getBusinessAccess, type BusinessAccess, type BusinessPermission } from "@/lib/business/access";

/**
 * İşletme Paneli sayfa guard'ları. Erişim çözümleme çekirdeği
 * `access.ts`'tedir (bkz. oradaki açıklama); bu dosya geriye dönük uyum için
 * hepsini yeniden dışa aktarır.
 */
export * from "@/lib/business/access";

/**
 * Sayfa guard'ı. Yetkisiz kullanıcıya işletme alanının varlığını sızdırmamak
 * için 403 yerine 404 döner.
 */
export async function requireBusinessPage(permission: BusinessPermission): Promise<BusinessAccess> {
  const session = await getSession();
  if (!session || session.mustChangePassword) notFound();
  const units = await getBusinessAccess(session, permission);
  if (units.length === 0) notFound();
  return { session, units };
}

/** High-risk finance and role mutations require a recent second-factor ceremony. */
export async function requireRecentBusinessPage(permission: BusinessPermission): Promise<BusinessAccess> {
  const access = await requireBusinessPage(permission);
  if (!hasFreshStepUp(access.session.stepUpAt)) redirect(STEP_UP_PATH);
  return access;
}
