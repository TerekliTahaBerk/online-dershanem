import "server-only";

import type { ProductCode, UserRole } from "@prisma/client";
import { productRolePath, rolePath } from "@/lib/auth/roles";
import { effectiveStaffPermissions } from "@/lib/products/staff-permissions";
import { staffAssignmentMode } from "@/lib/products/staff-mode";
import { YON_COACH_TODAY, YON_STUDENT_TODAY } from "@/lib/panel/navigation";
import { ODK_STAFF_HOME, resolveOdkStaffHome } from "@/lib/products/staff-permission-matrix";

/**
 * Ürün çalışma alanına giriş yolu.
 *
 * Öğrenci / veli: rol tabanlı saf yol (`productRolePath`); Yön Koçluk öğrencisi
 * Yön Bugün'e (`/panel/ogrenci/yon`) iner.
 * Personel: global rol DEĞİL ürün personel izinleri belirler. Bir TEACHER
 * Deneme Ligi'nde rapor okuyucu, editör, operatör ya da yayıncı olabilir; her
 * biri kendi modülüne iner (`resolveOdkStaffHome`). ADMIN tam çalışma alanına.
 *
 * `null` → bu kullanıcı için o ürünün çalışma alanı yok.
 * `STAFF_PRODUCT_ASSIGNMENTS` enforce değilse personel girişi eski yoldur.
 */
export async function resolveProductEntryPath(session: { userId: string; role: UserRole }, product: ProductCode): Promise<string | null> {
  // Yön Koçluk öğrencisi kendi "Bugün"üne iner (§10.1); veli Yön ana sayfası mevcut koçluk sayfasıdır.
  if (session.role === "STUDENT" && product === "OK") return YON_STUDENT_TODAY;
  if (session.role === "STUDENT" || session.role === "PARENT") return productRolePath(product, session.role);
  if (session.role === "ADMIN") return product === "ODK" ? ODK_STAFF_HOME : rolePath("ADMIN");
  if (staffAssignmentMode() !== "enforce") return productRolePath(product, session.role);

  if (product === "OD") return rolePath("TEACHER");
  // Yön koç çalışma alanı (§10.5).
  if (product === "OK") return YON_COACH_TODAY;
  if (product === "ODK") {
    const { isAdmin, permissions } = await effectiveStaffPermissions(session.userId);
    return resolveOdkStaffHome({ isAdmin, permissions });
  }
  return productRolePath(product, session.role);
}
