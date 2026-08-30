import type { ProductCode, UserRole } from "@prisma/client";
import { prisma, runId } from "./harness";

/**
 * Entegrasyon fixture'ları.
 *
 * Testler tohum verisine DOKUNMAZ; her senaryo kendi kullanıcısını, grubunu ve
 * kaydını yaratır ve koşu sonunda siler. Böylece aynı veritabanında art arda
 * koşulabilir — E2E suite'inin aksine (bkz. `tests/e2e`, her koşu için taze DB
 * gerekiyor).
 */

const PASSWORD_HASH = "scrypt$16384$8$1$aW50ZWdyYXRpb24=$aW50ZWdyYXRpb24tdGVzdA==";

/** Silme sırası kısıtlara bağlı: önce gruplar, sonra öğrenciler, sonra personel. */
const createdGroupIds: string[] = [];
const createdStudentUserIds: string[] = [];
const createdCurriculumVersionIds: string[] = [];
const createdOdOrderIds: string[] = [];
const createdOtherUserIds: string[] = [];

let sequence = 0;
const uniqueEmail = (prefix: string) => `int-${runId}-${prefix}-${++sequence}@integration.invalid`;

export async function createUser(
  role: UserRole,
  overrides: { fullName?: string; status?: "ACTIVE" | "SUSPENDED"; lastLoginAt?: Date; mustChangePassword?: boolean } = {},
) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail(role.toLowerCase()),
      passwordHash: PASSWORD_HASH,
      // Varsayılan `false`: fixture kullanıcıları "kurulmuş" hesaplardır.
      // Devralma akışını test eden suite bunu açıkça `true` yapar.
      mustChangePassword: overrides.mustChangePassword ?? false,
      role,
      status: overrides.status ?? "ACTIVE",
      fullName: overrides.fullName ?? `${role} ${runId}`,
      lastLoginAt: overrides.lastLoginAt ?? null,
    },
  });
  createdOtherUserIds.push(user.id);
  return user;
}

export async function createStudent(overrides: { fullName?: string; lastLoginAt?: Date; mustChangePassword?: boolean } = {}) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail("student"),
      passwordHash: PASSWORD_HASH,
      mustChangePassword: overrides.mustChangePassword ?? false,
      role: "STUDENT",
      fullName: overrides.fullName ?? `Öğrenci ${runId}`,
      lastLoginAt: overrides.lastLoginAt ?? null,
      studentProfile: { create: {} },
    },
    include: { studentProfile: true },
  });
  createdStudentUserIds.push(user.id);
  return { user, profile: user.studentProfile! };
}

export async function createTeacher(overrides: { isCoach?: boolean; fullName?: string } = {}) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail("teacher"),
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      role: "TEACHER",
      fullName: overrides.fullName ?? `Öğretmen ${runId}`,
      teacherProfile: { create: { isCoach: overrides.isCoach ?? false } },
    },
    include: { teacherProfile: true },
  });
  createdOtherUserIds.push(user.id);
  return { user, profile: user.teacherProfile! };
}

export async function createGroup(teacherUserId: string, overrides: { isActive?: boolean; name?: string } = {}) {
  const group = await prisma.group.create({
    data: {
      name: overrides.name ?? `Grup ${runId}-${++sequence}`,
      subject: "Matematik",
      teacherId: teacherUserId,
      isActive: overrides.isActive ?? true,
    },
  });
  createdGroupIds.push(group.id);
  return group;
}

export function enroll(groupId: string, studentProfileId: string, endedAt: Date | null = null) {
  return prisma.enrollment.create({ data: { groupId, studentId: studentProfileId, endedAt } });
}

export function linkParent(parentUserId: string, studentProfileId: string) {
  return prisma.parentStudent.create({ data: { parentId: parentUserId, studentId: studentProfileId } });
}

export function grantProduct(
  userId: string,
  product: ProductCode,
  overrides: { startsAt?: Date; expiresAt?: Date | null; revokedAt?: Date | null } = {},
) {
  return prisma.productMembership.create({
    data: {
      userId,
      product,
      startsAt: overrides.startsAt ?? new Date(Date.now() - 60_000),
      expiresAt: overrides.expiresAt ?? null,
      revokedAt: overrides.revokedAt ?? null,
    },
  });
}

export function createLesson(
  groupId: string,
  teacherUserId: string,
  overrides: { startsAt?: Date; status?: "PLANNED" | "COMPLETED" | "CANCELLED"; title?: string } = {},
) {
  const startsAt = overrides.startsAt ?? new Date(Date.now() - 3_600_000);
  return prisma.lesson.create({
    data: {
      groupId,
      teacherId: teacherUserId,
      title: overrides.title ?? `Ders ${runId}-${++sequence}`,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3_600_000),
      status: overrides.status ?? "PLANNED",
    },
  });
}

/**
 * Ödenmiş bir OD siparişi ve onboarding kaydı.
 *
 * Hesap devralma akışının tamamı bu ikilinin üzerinde çalışır: davet siparişe
 * bağlanır, tamamlandığında onboarding otomatik ilerler.
 */
export async function createPaidOdOrder(overrides: {
  studentUserId?: string;
  state?: "PAID" | "ACCOUNT_READY" | "PARENT_LINKED" | "PLACEMENT_PENDING" | "MANUAL_REVIEW";
  dueAt?: Date | null;
  provisioningStatus?: "PENDING" | "SUCCEEDED" | "RETRY_PENDING" | "MANUAL_REVIEW";
} = {}) {
  const order = await prisma.odOrder.create({
    data: {
      packageName: `Entegrasyon paketi ${runId}-${++sequence}`,
      status: "PAID",
      subtotalCents: 250000,
      totalCents: 250000,
      userId: overrides.studentUserId ?? null,
      provisioningStatus: overrides.provisioningStatus ?? "SUCCEEDED",
      onboarding: {
        create: {
          state: overrides.state ?? "ACCOUNT_READY",
          dueAt: overrides.dueAt === undefined ? new Date(Date.now() + 86_400_000) : overrides.dueAt,
        },
      },
    },
    include: { onboarding: true },
  });
  createdOdOrderIds.push(order.id);
  return order;
}

/**
 * Tek kazanımlık minik bir katalog. Sürüm `ACTIVE`, çünkü ders kapanışı ve
 * plan üretimi yalnız aktif sürümdeki kazanımları görür.
 */
export async function createOutcome(createdByUserId: string, overrides: { title?: string; isActive?: boolean } = {}) {
  const version = await prisma.curriculumVersion.create({
    data: {
      code: `int-${runId}-${++sequence}`,
      title: `Entegrasyon kataloğu ${runId}`,
      exam: "LGS",
      academicYear: 2026,
      status: "ACTIVE",
      createdById: createdByUserId,
      subjects: {
        create: {
          code: "MAT",
          name: "Matematik",
          units: { create: { code: "U1", name: "Kesirler" } },
        },
      },
    },
    include: { subjects: { include: { units: true } } },
  });
  createdCurriculumVersionIds.push(version.id);

  return prisma.learningOutcome.create({
    data: {
      unitId: version.subjects[0].units[0].id,
      code: `K-${sequence}`,
      title: overrides.title ?? `Kazanım ${sequence}`,
      isActive: overrides.isActive ?? true,
    },
  });
}

/**
 * Testlerin yarattığı her şeyi siler.
 *
 * SIRA ÖNEMLİ: `Group.teacher` ve `CoachAssignment.coach` ilişkileri
 * `onDelete: Restrict`. Önce gruplar (dersler/ödevler cascade), sonra öğrenci
 * kullanıcıları (koçluk atamaları, tekrar öğeleri cascade), sonra katalog
 * sürümleri (`LessonOutcome.outcome` Restrict), en son personel silinir.
 */
export async function cleanupFixtures() {
  if (createdGroupIds.length) await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
  if (createdStudentUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdStudentUserIds } } });
  if (createdOdOrderIds.length) await prisma.odOrder.deleteMany({ where: { id: { in: createdOdOrderIds } } });
  if (createdCurriculumVersionIds.length) await prisma.curriculumVersion.deleteMany({ where: { id: { in: createdCurriculumVersionIds } } });
  if (createdOtherUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdOtherUserIds } } });
  createdGroupIds.length = 0;
  createdStudentUserIds.length = 0;
  createdOdOrderIds.length = 0;
  createdCurriculumVersionIds.length = 0;
  createdOtherUserIds.length = 0;
}
