import "server-only";

import type { ProductCode, UserRole } from "@prisma/client";
import { productRolePath, rolePath } from "@/lib/auth/roles";
import { effectiveStaffPermissions } from "@/lib/products/staff-permissions";
import { staffAssignmentMode } from "@/lib/products/staff-mode";
import { ODK_STAFF_HOME, resolveOdkStaffHome } from "@/lib/products/staff-permission-matrix";

/**
 * Ürün çalışma alanına giriş yolu.
 *
 * Öğrenci / veli: rol tabanlı saf yol (`productRolePath`), değişmedi.
 * Personel: global rol DEĞİL ürün personel izinleri belirler. Bir TEACHER
 * Deneme Ligi'nde rapor okuyucu, editör, operatör ya da yayıncı olabilir; her
 * biri kendi modülüne iner (`resolveOdkStaffHome`). ADMIN tam çalışma alanına.
 *
 * `null` → bu kullanıcı için o ürünün çalışma alanı yok.
 * `STAFF_PRODUCT_ASSIGNMENTS` enforce değilse personel girişi eski yoldur.
 */
export async function resolveProductEntryPath(session: { userId: string; role: UserRole }, product: ProductCode): Promise<string | null> {
  if (session.role === "STUDENT" || session.role === "PARENT") return productRolePath(product, session.role);
  if (session.role === "ADMIN") return product === "ODK" ? ODK_STAFF_HOME : rolePath("ADMIN");
  if (staffAssignmentMode() !== "enforce") return productRolePath(product, session.role);

  if (product === "OD") return rolePath("TEACHER");
  // Yön koç masası (Phase 3'te koç ana sayfasıyla değişecek).
  if (product === "OK") return "/panel/ogretmen/plan";
  if (product === "ODK") {
    const { isAdmin, permissions } = await effectiveStaffPermissions(session.userId);
    return resolveOdkStaffHome({ isAdmin, permissions });
  }
  return productRolePath(product, session.role);
}
