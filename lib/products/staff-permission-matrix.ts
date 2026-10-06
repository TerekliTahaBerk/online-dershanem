import type { UserRole } from "@prisma/client";

/**
 * ÜRÜN PERSONEL YETKİSİ — rol → izin matrisi (saf, sunucudan bağımsız).
 *
 * Üç kavram ayrıdır:
 *  - Platform rolü (`UserRole`: ADMIN / TEACHER / STUDENT / PARENT) — kimlik.
 *  - Ürün üyeliği (`ProductMembership`) — öğrenci / velinin TÜKETİM hakkı.
 *  - Ürün personel sorumluluğu (`ProductStaffAssignment`) — bu dosya.
 *
 * Bir TEACHER aynı anda OD öğretmeni, Yön koçu ve Deneme Ligi editörü olabilir;
 * bunlar yeni global rol DEĞİL, ürün kapsamlı atamadır. İzin anahtarı
 * `<ürün>:<kaynak>:<eylem>` biçimindedir (iş birimi RBAC'ı ve içerik RBAC'ı ile
 * aynı desen; tablolar ve matrisler ayrıdır, birbirine bağlanmaz).
 *
 * DEĞİŞMEZ (break-glass): ADMIN'in eğitim / Deneme Ligi izinleri bu dosyada,
 * KODDA tanımlıdır. Hiçbir atama satırının iptali ADMIN'in Deneme Ligi'ni
 * yönetme, puanlama ve yayınlama yetkisini kaldıramaz.
 */

export const STAFF_PRODUCT_CODES = ["OD", "OK", "ODK"] as const;
export type StaffProductCode = (typeof STAFF_PRODUCT_CODES)[number];

export const STAFF_ROLE_NAMES = [
  "TEACHER",
  "COACH",
  "EXAM_EDITOR",
  "EXAM_OPERATOR",
  "RESULT_PUBLISHER",
  "REPORT_VIEWER",
  "PRODUCT_MANAGER",
] as const;
export type StaffRoleName = (typeof STAFF_ROLE_NAMES)[number];

export const STAFF_PERMISSIONS = [
  "od:lesson:teach",
  "od:student:read",
  "ok:coaching:write",
  "ok:note:read_private",
  "ok:assignment:manage",
  "odk:exam:edit",
  "odk:exam:schedule",
  "odk:exam:assign",
  "odk:ops:live",
  "odk:integrity:review",
  "odk:grant:manage",
  "odk:result:score",
  "odk:result:release",
  "odk:key:revise",
  "odk:package:manage",
  "odk:report:read_related",
  "odk:report:read_all",
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

/** Rolün geçerli olduğu ürünler. Geçersiz bir (ürün, rol) çifti yetki AÇMAZ. */
export const STAFF_ROLE_PRODUCTS: Record<StaffRoleName, readonly StaffProductCode[]> = {
  TEACHER: ["OD"],
  COACH: ["OK"],
  EXAM_EDITOR: ["ODK"],
  EXAM_OPERATOR: ["ODK"],
  RESULT_PUBLISHER: ["ODK"],
  REPORT_VIEWER: ["ODK"],
  PRODUCT_MANAGER: ["OD", "OK", "ODK"],
};

const ROLE_PERMISSIONS: Record<StaffRoleName, Partial<Record<StaffProductCode, readonly StaffPermission[]>>> = {
  TEACHER: { OD: ["od:lesson:teach", "od:student:read"] },
  COACH: { OK: ["ok:coaching:write", "ok:note:read_private"] },
  EXAM_EDITOR: { ODK: ["odk:exam:edit"] },
  EXAM_OPERATOR: { ODK: ["odk:exam:schedule", "odk:exam:assign", "odk:ops:live", "odk:integrity:review", "odk:grant:manage"] },
  RESULT_PUBLISHER: { ODK: ["odk:result:score", "odk:result:release", "odk:key:revise", "odk:report:read_all"] },
  REPORT_VIEWER: { ODK: ["odk:report:read_related"] },
  PRODUCT_MANAGER: {
    OD: ["od:student:read"],
    OK: ["ok:assignment:manage"],
    ODK: ["odk:exam:schedule", "odk:exam:assign", "odk:package:manage", "odk:report:read_all"],
  },
};

/** MFA zorunlu personel rolleri: Deneme Ligi'nde içerik / sonuç / erişim değiştirebilen roller. */
export const PRIVILEGED_STAFF_ROLES: readonly StaffRoleName[] = ["EXAM_EDITOR", "EXAM_OPERATOR", "RESULT_PUBLISHER", "PRODUCT_MANAGER"];

/** Taze step-up (son 10 dk içinde ikinci faktör) isteyen geri alınması zor eylemler. */
export const STEP_UP_STAFF_PERMISSIONS: readonly StaffPermission[] = ["odk:result:release", "odk:key:revise", "odk:grant:manage"];

export type StaffAssignmentRef = { productCode: string; role: StaffRoleName };

export function isStaffProductCode(code: string): code is StaffProductCode {
  return (STAFF_PRODUCT_CODES as readonly string[]).includes(code);
}

export function isValidStaffAssignment(productCode: string, role: StaffRoleName): boolean {
  return isStaffProductCode(productCode) && STAFF_ROLE_PRODUCTS[role].includes(productCode);
}

/** Atamaların açtığı izinler. Geçersiz (ürün, rol) çiftleri yok sayılır. */
export function staffPermissionsFor(assignments: readonly StaffAssignmentRef[]): Set<StaffPermission> {
  const permissions = new Set<StaffPermission>();
  for (const assignment of assignments) {
    if (!isValidStaffAssignment(assignment.productCode, assignment.role)) continue;
    for (const permission of ROLE_PERMISSIONS[assignment.role][assignment.productCode as StaffProductCode] ?? []) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export type StaffPermissionDecisionInput = {
  platformRole: UserRole;
  isActiveUser: boolean;
  permission: StaffPermission;
  assignments: readonly StaffAssignmentRef[];
};

/**
 * - Pasif kullanıcı: hiçbir izin yok.
 * - ADMIN: her izin (break-glass; satırdan bağımsız).
 * - TEACHER: yalnız aktif atamalarının açtığı izinler.
 * - STUDENT / PARENT: asla (personel yetkisi tüketim hakkından ayrıdır).
 */
export function decideStaffPermission(input: StaffPermissionDecisionInput): boolean {
  if (!input.isActiveUser) return false;
  if (input.platformRole === "ADMIN") return true;
  if (input.platformRole !== "TEACHER") return false;
  return staffPermissionsFor(input.assignments).has(input.permission);
}

/** Personelin ürün çalışma alanları: geçerli en az bir ataması olan ürünler. */
export function staffProductsFor(assignments: readonly StaffAssignmentRef[]): StaffProductCode[] {
  return STAFF_PRODUCT_CODES.filter((product) =>
    assignments.some((assignment) => assignment.productCode === product && isValidStaffAssignment(product, assignment.role)),
  );
}

export function hasPrivilegedStaffRole(assignments: readonly StaffAssignmentRef[]): boolean {
  return assignments.some(
    (assignment) => PRIVILEGED_STAFF_ROLES.includes(assignment.role) && isValidStaffAssignment(assignment.productCode, assignment.role),
  );
}

/* ------------------------------------------------------------------ *
 * Deneme Ligi personel çalışma alanı
 * ------------------------------------------------------------------ */

export const ODK_STAFF_HOME = "/panel/odk/yonetim";
export const ODK_REPORT_WORKSPACE = "/panel/odk/ogretmen/raporlar";

type OdkModule = { id: string; href: string; label: string; permission: StaffPermission };

/**
 * Deneme Ligi personel modülleri. Sıra menü sırasıdır; her modül tek bir
 * "giriş" iznine bağlıdır. Sayfa guard'ları `ODK_STAFF_PAGE_PERMISSIONS` ile
 * aynı izinleri kullanır.
 */
export const ODK_STAFF_MODULES: readonly OdkModule[] = [
  { id: "odk-exams", href: "/panel/odk/yonetim/sinavlar", label: "Deneme yönetimi", permission: "odk:exam:edit" },
  { id: "odk-ops", href: "/panel/odk/yonetim/operasyon", label: "Canlı operasyon", permission: "odk:ops:live" },
  { id: "odk-results", href: "/panel/odk/yonetim/sonuclar", label: "Puanlama ve yayın", permission: "odk:result:score" },
  { id: "odk-reports", href: "/panel/odk/yonetim/raporlar", label: "Sonuç raporları", permission: "odk:report:read_all" },
  { id: "odk-packages", href: "/panel/odk/yonetim/paketler", label: "Deneme Ligi paketleri", permission: "odk:package:manage" },
];

/** Deneme yönetimi listesine girebilecek izinler (her biri listede kendi sekmesini görür). */
export const ODK_EXAM_LIST_PERMISSIONS: readonly StaffPermission[] = ["odk:exam:edit", "odk:exam:schedule", "odk:exam:assign", "odk:result:score", "odk:integrity:review"];

/** Sayfa → izin. `null` = yalnız ADMIN (platform eylemi). */
export const ODK_STAFF_PAGE_PERMISSIONS = {
  home: "any-module",
  exams: ODK_EXAM_LIST_PERMISSIONS,
  operations: ["odk:ops:live"],
  results: ["odk:result:score"],
  reports: ["odk:report:read_all"],
  packages: ["odk:package:manage"],
  pilot: null,
  teacherReports: ["odk:report:read_related"],
} as const satisfies Record<string, readonly StaffPermission[] | "any-module" | null>;

export function odkStaffModules(permissions: ReadonlySet<StaffPermission>): OdkModule[] {
  return ODK_STAFF_MODULES.filter((entry) => permissions.has(entry.permission));
}

/**
 * Deneme Ligi'ne giren personelin iniş sayfası — İZİNLERDEN, global rolden değil.
 *  - ADMIN → tam çalışma alanı (personel ana sayfası)
 *  - tek modül → o modül
 *  - birden çok modül → personel ana sayfası (yalnız izinli kutucuklar)
 *  - yalnız ilişkili rapor okuma → rapor çalışma alanı
 *  - hiçbiri → `null` (Deneme Ligi kartı aktif değil)
 */
export function resolveOdkStaffHome(input: { isAdmin: boolean; permissions: ReadonlySet<StaffPermission> }): string | null {
  if (input.isAdmin) return ODK_STAFF_HOME;
  const modules = odkStaffModules(input.permissions);
  // Raporlar bir "iş" modülü değil, eşlikçidir: sonuç yayıncısı rapor da okur
  // ama işi puanlama/yayındır. İniş kararı iş modüllerine göre verilir.
  const workModules = modules.filter((entry) => entry.id !== "odk-reports");
  if (workModules.length > 1) return ODK_STAFF_HOME;
  if (workModules.length === 1) return workModules[0]!.href;
  if (modules.length === 1) return modules[0]!.href;
  // Takvim/atama izni olup canlı operasyon modülü olmayan (ör. PRODUCT_MANAGER'ın
  // bir kısmı) personel için deneme listesi giriş noktasıdır.
  if (ODK_EXAM_LIST_PERMISSIONS.some((permission) => input.permissions.has(permission))) return "/panel/odk/yonetim/sinavlar";
  if (input.permissions.has("odk:report:read_related")) return ODK_REPORT_WORKSPACE;
  return null;
}

/** Herhangi bir Deneme Ligi personel izni var mı (yönetim yüzeyi için)? */
export function hasOdkStaffWorkspace(permissions: ReadonlySet<StaffPermission>): boolean {
  return [...permissions].some((permission) => permission.startsWith("odk:") && permission !== "odk:report:read_related");
}
