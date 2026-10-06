import "server-only";

import { prisma } from "@/lib/prisma";
import { contractAllowsReport } from "@/lib/odk/product-contract";
import { listActiveOdkContracts } from "@/lib/odk/product-contract-server";
import { grantStaffRole } from "@/lib/products/staff-assignment-server";
import { planStaffAssignmentBackfill, type BackfillPlan, type BackfillTeacherFacts } from "@/lib/products/staff-assignment-backfill";
import type { StaffRoleName } from "@/lib/products/staff-permission-matrix";

/**
 * R3 ilişki kaynağı — TEK yer. `lib/odk/reporting-server.ts` öğretmen kolunun
 * gösterebildiği öğrenci kümesiyle aynıdır: öğretmenin aktif grubunda aktif
 * kayıtlı, ACTIVE, aktif ODK üyeliği olan ve `teacherReports` hakkı veren aktif
 * sözleşmesi bulunan öğrenci. Shadow sınıflandırması da bunu kullanır.
 */
export async function teachersWithOdkReportRelationship(teacherIds?: readonly string[], now = new Date()): Promise<Set<string>> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      endedAt: null,
      group: { isActive: true, ...(teacherIds ? { teacherId: { in: [...teacherIds] } } : {}) },
      student: {
        user: {
          status: "ACTIVE",
          productMemberships: {
            some: { product: "ODK", revokedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          },
        },
      },
    },
    select: { group: { select: { teacherId: true } }, student: { select: { userId: true } } },
  });
  const contractCache = new Map<string, boolean>();
  const result = new Set<string>();
  for (const enrollment of enrollments) {
    const teacherId = enrollment.group.teacherId;
    if (result.has(teacherId)) continue;
    const studentUserId = enrollment.student.userId;
    let allowed = contractCache.get(studentUserId);
    if (allowed === undefined) {
      const contracts = await listActiveOdkContracts(studentUserId, now);
      allowed = contracts.some(({ contract }) => contractAllowsReport(contract, "TEACHER"));
      contractCache.set(studentUserId, allowed);
    }
    if (allowed) result.add(teacherId);
  }
  return result;
}

export async function collectStaffBackfillFacts(): Promise<Array<BackfillTeacherFacts & { email: string }>> {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      status: true,
      teacherProfile: { select: { isCoach: true } },
      productStaffAssignments: { where: { revokedAt: null }, select: { role: true, product: { select: { code: true } } } },
    },
  });
  const odkRelationship = await teachersWithOdkReportRelationship(teachers.map((teacher) => teacher.id));
  return teachers.map((teacher) => ({
    userId: teacher.id,
    email: teacher.email,
    status: teacher.status,
    isCoach: teacher.teacherProfile?.isCoach ?? false,
    hasOdkReportRelationship: odkRelationship.has(teacher.id),
    activeAssignments: teacher.productStaffAssignments.map((row) => ({ productCode: row.product.code, role: row.role as StaffRoleName })),
  }));
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local!.slice(0, 2)}***@${domain}`;
}

export type StaffBackfillReport = {
  mode: "dry-run" | "apply";
  checkedAt: string;
  totals: { teachers: number; planned: number; applied: number; alreadyActive: number; withoutOdkReportRelationship: number; skippedArchived: number };
  byRule: Record<string, number>;
  grants: Array<{ user: string; userId: string; product: string; role: string; rule: string; result: "planned" | "created" | "already_active" }>;
  withoutOdkReportRelationship: string[];
};

/**
 * Dry-run (varsayılan) yalnız okur. `apply` her eksik satırı `grantStaffRole`
 * ile yazar (source LEGACY_BACKFILL, actor yok, gerekçe = kural, audit). İki
 * kez çalıştırmak güvenlidir: aktif satır varsa yazılmaz (kısmi tekil indeks).
 */
export async function runStaffAssignmentBackfill(options: { apply: boolean; includeEmail?: boolean }): Promise<StaffBackfillReport> {
  const facts = await collectStaffBackfillFacts();
  const plan: BackfillPlan = planStaffAssignmentBackfill(facts);
  const emailById = new Map(facts.map((teacher) => [teacher.userId, options.includeEmail ? teacher.email : maskEmail(teacher.email)]));

  const grants: StaffBackfillReport["grants"] = [];
  let applied = 0;
  for (const grant of plan.grants) {
    let result: StaffBackfillReport["grants"][number]["result"] = "planned";
    if (options.apply) {
      const outcome = await grantStaffRole({
        userId: grant.userId,
        productCode: grant.productCode,
        role: grant.role,
        actorUserId: null,
        reason: grant.reason,
        source: "LEGACY_BACKFILL",
      });
      result = outcome.created ? "created" : "already_active";
      if (outcome.created) applied += 1;
    }
    grants.push({ user: emailById.get(grant.userId) ?? grant.userId, userId: grant.userId, product: grant.productCode, role: grant.role, rule: grant.rule, result });
  }

  const byRule: Record<string, number> = {};
  for (const grant of plan.grants) byRule[grant.rule] = (byRule[grant.rule] ?? 0) + 1;

  return {
    mode: options.apply ? "apply" : "dry-run",
    checkedAt: new Date().toISOString(),
    totals: {
      teachers: facts.length,
      planned: plan.grants.length,
      applied,
      alreadyActive: plan.alreadyActive.length,
      withoutOdkReportRelationship: plan.withoutOdkReportRelationship.length,
      skippedArchived: plan.skippedArchived.length,
    },
    byRule,
    grants,
    withoutOdkReportRelationship: plan.withoutOdkReportRelationship.map((id) => emailById.get(id) ?? id),
  };
}
