/**
 * Phase 3 / Session 11 — E2E DB helper.
 *
 * Bu modül **sadece test ortamında** Prisma'ya doğrudan erişim sağlar.
 * Tüm test verisi `e2e-` prefix'iyle ayırt edilir; cleanupE2E() ile
 * silinebilir (genelde tek tek testlerde gerek yok — seed idempotenttir).
 *
 * Production guard: import edildiğinde DATABASE_URL'de "prod" geçerse throw eder.
 */
import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL ?? "";
if (/prod|production/i.test(dbUrl)) {
  throw new Error("[e2e/helpers/db] Production DATABASE_URL tespit edildi. Abort.");
}

export const testPrisma = new PrismaClient();

export const E2E_EMAIL_PREFIX = "e2e-";
export const E2E_DOMAIN = "@onlinedershanem.test";

export const E2E_FIXTURES = {
  classroomName: "E2E Sınıf 1",
  classroomBranch: "E2E",
  packageName: "E2E Paket 1",
  paymentTitle: "E2E Aylık Taksit",
  assignmentTitle: "E2E Ödev 1",
  odkAccessTagKey: "e2e-tag-1",
} as const;

export async function getSeedIds() {
  const [studentUser, student2User, teacherUser, parentUser, adminUser, classroom, pkg, odkTag] = await Promise.all([
    testPrisma.user.findUniqueOrThrow({
      where: { email: `e2e-ogrenci${E2E_DOMAIN}` },
      include: { student: true },
    }),
    testPrisma.user.findUniqueOrThrow({
      where: { email: `e2e-ogrenci2${E2E_DOMAIN}` },
      include: { student: true },
    }),
    testPrisma.user.findUniqueOrThrow({
      where: { email: `e2e-ogretmen${E2E_DOMAIN}` },
      include: { teacher: true },
    }),
    testPrisma.user.findUniqueOrThrow({
      where: { email: `e2e-veli${E2E_DOMAIN}` },
      include: { parent: true },
    }),
    testPrisma.user.findUniqueOrThrow({ where: { email: `e2e-admin${E2E_DOMAIN}` } }),
    testPrisma.classroom.findUniqueOrThrow({
      where: {
        name_branch: {
          name: E2E_FIXTURES.classroomName,
          branch: E2E_FIXTURES.classroomBranch,
        },
      },
    }),
    testPrisma.package.findFirstOrThrow({ where: { name: E2E_FIXTURES.packageName } }),
    testPrisma.odkAccessTag.findUniqueOrThrow({ where: { key: E2E_FIXTURES.odkAccessTagKey } }),
  ]);
  if (!studentUser.student || !student2User.student || !teacherUser.teacher || !parentUser.parent) {
    throw new Error("Seed eksik — `npm run db:seed:e2e` çalıştırın.");
  }
  return {
    adminUserId: adminUser.id,
    studentUserId: studentUser.id,
    studentId: studentUser.student.id,
    student2UserId: student2User.id,
    student2Id: student2User.student.id,
    teacherUserId: teacherUser.id,
    teacherId: teacherUser.teacher.id,
    parentUserId: parentUser.id,
    parentId: parentUser.parent.id,
    classroomId: classroom.id,
    packageId: pkg.id,
    odkAccessTagId: odkTag.id,
  };
}

/** Tüm `e2e-` prefix'li User satırlarını siler (cascade ile profiller de gider). */
export async function cleanupE2EUsers() {
  await testPrisma.user.deleteMany({
    where: { email: { startsWith: E2E_EMAIL_PREFIX } },
  });
}
