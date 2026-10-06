import type { UserStatus } from "@prisma/client";
import type { StaffAssignmentRef, StaffProductCode, StaffRoleName } from "@/lib/products/staff-permission-matrix";

/**
 * ÜRÜN PERSONEL ATAMASI GEÇİŞİ (backfill) — saf kurallar.
 *
 * Amaç meşru erişim kaybı OLMADAN, yetki genişlemesi de OLMADAN mevcut
 * öğretmenleri yeni atama modeline taşımaktır. `STAFF_PRODUCTS` yüzünden
 * herkese açık olan geniş eski erişim KORUNMAZ (bilinçli daralma).
 *
 *  R1  TEACHER@OD         her TEACHER (ACTIVE / SUSPENDED)
 *  R2  COACH@OK           `TeacherProfile.isCoach = true`
 *  R3  REPORT_VIEWER@ODK  yalnız bugün gerçek bir Deneme Ligi rapor ilişkisi
 *                         olan öğretmen: aktif grubunda aktif kayıtlı, aktif
 *                         ODK üyeliği ve `teacherReports` hakkı veren aktif
 *                         sözleşmesi olan en az bir öğrenci
 *                         (`lib/odk/reporting-server.ts` öğretmen kolu ile aynı).
 *
 * Başka Deneme Ligi rolü (EDITOR / OPERATOR / PUBLISHER / PRODUCT_MANAGER)
 * geçişle VERİLMEZ; yönetim Erişim Merkezi'nden açıkça verir. ADMIN için satır
 * yazılmaz (kodda tanımlı break-glass). ARCHIVED hesaplar atlanır.
 */

export type BackfillRule = "R1" | "R2" | "R3";

export type BackfillTeacherFacts = {
  userId: string;
  status: UserStatus;
  isCoach: boolean;
  hasOdkReportRelationship: boolean;
  activeAssignments: readonly StaffAssignmentRef[];
};

export type BackfillGrant = {
  userId: string;
  productCode: StaffProductCode;
  role: StaffRoleName;
  rule: BackfillRule;
  reason: string;
};

export type BackfillPlan = {
  grants: BackfillGrant[];
  alreadyActive: Array<{ userId: string; rule: BackfillRule }>;
  /** R3'e girmeyen öğretmenler: Deneme Ligi rapor alanı VERİLMEZ (yönetim gerekirse verir). */
  withoutOdkReportRelationship: string[];
  skippedArchived: string[];
};

export const BACKFILL_RULE_REASON: Record<BackfillRule, string> = {
  R1: "Geçiş R1: mevcut öğretmen → OD ders sorumluluğu",
  R2: "Geçiş R2: koç işaretli öğretmen → Yön koçluğu",
  R3: "Geçiş R3: güncel Deneme Ligi öğretmen raporu ilişkisi",
};

const RULE_TARGET: Record<BackfillRule, { productCode: StaffProductCode; role: StaffRoleName }> = {
  R1: { productCode: "OD", role: "TEACHER" },
  R2: { productCode: "OK", role: "COACH" },
  R3: { productCode: "ODK", role: "REPORT_VIEWER" },
};

export function backfillRulesFor(teacher: BackfillTeacherFacts): BackfillRule[] {
  if (teacher.status === "ARCHIVED") return [];
  const rules: BackfillRule[] = ["R1"];
  if (teacher.isCoach) rules.push("R2");
  if (teacher.hasOdkReportRelationship) rules.push("R3");
  return rules;
}

/** İdempotent plan: zaten aktif olan (ürün, rol) çifti yeniden verilmez. */
export function planStaffAssignmentBackfill(teachers: readonly BackfillTeacherFacts[]): BackfillPlan {
  const plan: BackfillPlan = { grants: [], alreadyActive: [], withoutOdkReportRelationship: [], skippedArchived: [] };
  for (const teacher of teachers) {
    if (teacher.status === "ARCHIVED") {
      plan.skippedArchived.push(teacher.userId);
      continue;
    }
    if (!teacher.hasOdkReportRelationship) plan.withoutOdkReportRelationship.push(teacher.userId);
    for (const rule of backfillRulesFor(teacher)) {
      const target = RULE_TARGET[rule];
      const active = teacher.activeAssignments.some(
        (assignment) => assignment.productCode === target.productCode && assignment.role === target.role,
      );
      if (active) {
        plan.alreadyActive.push({ userId: teacher.userId, rule });
        continue;
      }
      plan.grants.push({ userId: teacher.userId, ...target, rule, reason: BACKFILL_RULE_REASON[rule] });
    }
  }
  return plan;
}
