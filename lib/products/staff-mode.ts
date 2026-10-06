import type { ProductCode, UserRole } from "@prisma/client";
import type { StaffPermission, StaffProductCode } from "@/lib/products/staff-permission-matrix";

/**
 * Personel ürün yetkisi geçiş modu (`STAFF_PRODUCT_ASSIGNMENTS`).
 *
 *  - `legacy`  — eski kural; karşılaştırma ve log yok.
 *  - `shadow`  — (varsayılan) yetki ESKİ kurala göre verilir; yeni atama kuralı
 *                yalnız hesaplanır, fark loglanır. Kimse erişim kaybetmez.
 *  - `enforce` — yetki `ProductStaffAssignment` satırlarından gelir.
 *
 * Geri dönüş tek bir ortam değişkenidir (`enforce` → `shadow`); veri değişmez.
 */
export type StaffAssignmentMode = "legacy" | "shadow" | "enforce";

export function staffAssignmentMode(env: Record<string, string | undefined> = process.env): StaffAssignmentMode {
  const value = env.STAFF_PRODUCT_ASSIGNMENTS?.trim().toLowerCase();
  return value === "legacy" || value === "enforce" ? value : "shadow";
}

/** Eski kural: ADMIN ve TEACHER üç ürüne de koşulsuz erişir (`STAFF_PRODUCTS`). */
export const LEGACY_STAFF_PRODUCTS: readonly StaffProductCode[] = ["OD", "OK", "ODK"];

/**
 * Eski kuralın izin karşılığı. Eskiden:
 *  - OD / Yön personel uçları `requireRole("TEACHER")` / `requireApiProductRole("OK","TEACHER")`
 *    idi → her TEACHER (ilişki kontrolleri ayrıca yapılır).
 *  - Deneme Ligi yönetimi `requireProductRole("ODK","ADMIN")` → yalnız ADMIN.
 *  - Deneme Ligi öğretmen raporları `requireProductRole("ODK","TEACHER")` → her TEACHER.
 *  - Koç atama (`/panel/yonetim/kocluk`) yalnız ADMIN.
 */
const LEGACY_TEACHER_PERMISSIONS: ReadonlySet<StaffPermission> = new Set<StaffPermission>([
  "od:lesson:teach",
  "od:student:read",
  "ok:coaching:write",
  "ok:note:read_private",
  "odk:report:read_related",
]);

export function legacyStaffPermission(platformRole: UserRole, permission: StaffPermission): boolean {
  if (platformRole === "ADMIN") return true;
  if (platformRole !== "TEACHER") return false;
  return LEGACY_TEACHER_PERMISSIONS.has(permission);
}

/** Ürün izni hangi ürünün pilot kapısından geçer? */
export function staffPermissionProduct(permission: StaffPermission): ProductCode {
  if (permission.startsWith("odk:")) return "ODK";
  if (permission.startsWith("ok:")) return "OK";
  return "OD";
}
