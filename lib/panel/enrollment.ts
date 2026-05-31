/**
 * Phase 3 / Session 5 — Enrollment & Payment Plan helpers.
 *
 * No schema changes — this module **reuses** the existing
 * `StudentPackageEnrollment` model (Phase 1) as the canonical enrollment
 * record, and `PaymentScheduleItem` (Phase 2 / Session 10) as the payment
 * plan. ODK access is granted via `OdkUserAccessTag`.
 *
 * Money is in **kuruş** everywhere (matches AccountingEntry / Package.price /
 * PaymentScheduleItem.amount). UI converts to TRY at the edge.
 *
 * Permission boundary: read helpers are safe for any panel role; the
 * mutation `createStudentEnrollmentWithPaymentPlan` MUST be called only
 * after `requirePanelRole("admin")` in the server action.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  EnrollmentStatus,
  EnrollmentSource,
  PaymentScheduleStatus,
} from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { notifyUser, notifyAdmins } from "@/lib/notifications";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EnrollmentOption = {
  id: string;
  name: string;
  type: "COURSE" | "EXAM";
  priceKurus: number;
  lessonCount: number;
  subjects: string;
  isActive: boolean;
};

export type ParentPayerOption = {
  parentId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  hasUserAccount: boolean;
  /** "Anne", "Baba", custom string, or null for legacy rows. */
  relationshipLabel: string | null;
};

export type StudentEnrollmentSnapshot = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  examType: string | null;
  hasUserAccount: boolean;
  classroomCount: number;
  parentCount: number;
  /** Full active enrollment rows (status ∈ {LEAD, TRIAL, ACTIVE, PAUSED}). */
  activeEnrollments: Array<{
    id: string;
    packageId: string;
    packageName: string;
    status: EnrollmentStatus;
    startsAt: Date;
    endsAt: Date | null;
  }>;
  pendingPaymentItemCount: number;
  pendingPaymentTotalKurus: number;
  overdueItemCount: number;
};

export type PaymentPlanInput =
  | { kind: "NONE" }
  | { kind: "ONE_TIME"; totalKurus: number; firstDueAt: Date; title?: string; note?: string }
  | {
      kind: "INSTALLMENTS";
      totalKurus: number;
      installments: number;
      firstDueAt: Date;
      intervalMonths?: number; // default 1
      titlePrefix?: string;
      note?: string;
    };

export type PaymentPlanPreviewItem = {
  index: number;
  title: string;
  dueDate: Date;
  amountKurus: number;
};

export type CreateEnrollmentInput = {
  studentId: string;
  packageId: string;
  classroomId: string | null;
  payerParentId: string | null;
  source: EnrollmentSource;
  status: EnrollmentStatus;
  startsAt: Date;
  endsAt: Date | null;
  listPriceKurus: number | null;
  discountKurus: number | null;
  billingPeriodLabel: string | null;
  notes: string | null;
  paymentPlan: PaymentPlanInput;
  /** OdkAccessTag.id list — granted to student.userId when present. */
  odkAccessTagIds: string[];
  actorUserId: string | null;
};

export type CreateEnrollmentResult = {
  enrollmentId: string;
  paymentScheduleItemIds: string[];
  classroomLinked: boolean;
  odkAccessTagIdsGranted: string[];
  payerParentId: string | null;
  warnings: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Status display helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getEnrollmentStatusLabel(s: EnrollmentStatus): string {
  switch (s) {
    case "LEAD":
      return "Aday";
    case "TRIAL":
      return "Deneme";
    case "ACTIVE":
      return "Aktif";
    case "PAUSED":
      return "Duraklatıldı";
    case "COMPLETED":
      return "Tamamlandı";
    case "CANCELLED":
      return "İptal";
  }
}

export function getEnrollmentStatusTone(
  s: EnrollmentStatus,
): "accent" | "ok" | "warn" | "bad" | "purple" | "teal" | "neutral" {
  switch (s) {
    case "ACTIVE":
      return "ok";
    case "TRIAL":
      return "teal";
    case "LEAD":
      return "purple";
    case "PAUSED":
      return "warn";
    case "CANCELLED":
      return "bad";
    case "COMPLETED":
      return "neutral";
  }
}

const ACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  "LEAD",
  "TRIAL",
  "ACTIVE",
  "PAUSED",
];

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export async function getEnrollmentOptions(): Promise<{
  packages: EnrollmentOption[];
  classrooms: Array<{ id: string; name: string; branch: string | null }>;
  odkAccessTags: Array<{ id: string; key: string; title: string }>;
}> {
  const [packages, classrooms, odkAccessTags] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        price: true,
        lessonCount: true,
        subjects: true,
        isActive: true,
      },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, branch: true },
    }),
    prisma.odkAccessTag.findMany({
      where: { isActive: true },
      orderBy: [{ title: "asc" }],
      select: { id: true, key: true, title: true },
    }),
  ]);
  return {
    packages: packages.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      priceKurus: p.price,
      lessonCount: p.lessonCount,
      subjects: p.subjects,
      isActive: p.isActive,
    })),
    classrooms,
    odkAccessTags,
  };
}

export async function getAvailablePackagesForEnrollment(
  studentId: string,
): Promise<{
  all: EnrollmentOption[];
  alreadyActivePackageIds: Set<string>;
}> {
  const [packages, active] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        price: true,
        lessonCount: true,
        subjects: true,
        isActive: true,
      },
    }),
    prisma.studentPackageEnrollment.findMany({
      where: { studentId, status: { in: ACTIVE_ENROLLMENT_STATUSES } },
      select: { packageId: true },
    }),
  ]);
  return {
    all: packages.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      priceKurus: p.price,
      lessonCount: p.lessonCount,
      subjects: p.subjects,
      isActive: p.isActive,
    })),
    alreadyActivePackageIds: new Set(active.map((e) => e.packageId)),
  };
}

export async function getRecommendedPayerParents(
  studentId: string,
): Promise<ParentPayerOption[]> {
  const links = await prisma.parentStudent.findMany({
    where: { studentId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: {
      parent: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          userId: true,
        },
      },
    },
  });
  return links.map((l) => ({
    parentId: l.parent.id,
    fullName: l.parent.fullName,
    phone: l.parent.phone,
    email: l.parent.email,
    isPrimary: l.isPrimary,
    hasUserAccount: !!l.parent.userId,
    relationshipLabel:
      (l.relationshipType as string | null) ?? l.relationship ?? null,
  }));
}

export async function getStudentEnrollmentState(
  studentId: string,
): Promise<StudentEnrollmentSnapshot | null> {
  const [student, enrollments, scheduleAgg, overdueAgg] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        classLevel: true,
        examType: true,
        userId: true,
        _count: { select: { classrooms: true, parents: true } },
      },
    }),
    prisma.studentPackageEnrollment.findMany({
      where: {
        studentId,
        status: { in: ACTIVE_ENROLLMENT_STATUSES },
      },
      orderBy: [{ startsAt: "desc" }],
      include: {
        package: { select: { id: true, name: true } },
      },
    }),
    prisma.paymentScheduleItem.aggregate({
      where: {
        studentId,
        status: { in: ["PENDING", "PARTIAL"] satisfies PaymentScheduleStatus[] },
      },
      _count: { _all: true },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.paymentScheduleItem.count({
      where: {
        studentId,
        status: "PENDING",
        dueDate: { lt: startOfToday() },
      },
    }),
  ]);
  if (!student) return null;
  const totalDue = scheduleAgg._sum.amount ?? 0;
  const totalPaid = scheduleAgg._sum.paidAmount ?? 0;
  return {
    studentId: student.id,
    fullName: student.fullName,
    classLevel: student.classLevel,
    examType: student.examType,
    hasUserAccount: !!student.userId,
    classroomCount: student._count.classrooms,
    parentCount: student._count.parents,
    activeEnrollments: enrollments.map((e) => ({
      id: e.id,
      packageId: e.packageId,
      packageName: e.package.name,
      status: e.status,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
    })),
    pendingPaymentItemCount: scheduleAgg._count._all,
    pendingPaymentTotalKurus: Math.max(0, totalDue - totalPaid),
    overdueItemCount: overdueAgg,
  };
}

export async function getStudentActiveEnrollments(studentId: string) {
  return prisma.studentPackageEnrollment.findMany({
    where: { studentId, status: { in: ACTIVE_ENROLLMENT_STATUSES } },
    include: { package: { select: { id: true, name: true, type: true } } },
    orderBy: [{ startsAt: "desc" }],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan preview (pure)
// ─────────────────────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function calculatePaymentPlanPreview(
  input: PaymentPlanInput,
  packageName: string,
): PaymentPlanPreviewItem[] {
  if (input.kind === "NONE") return [];
  if (input.kind === "ONE_TIME") {
    return [
      {
        index: 1,
        title: input.title?.trim() || `${packageName} ödemesi`,
        dueDate: input.firstDueAt,
        amountKurus: input.totalKurus,
      },
    ];
  }
  // INSTALLMENTS — split as evenly as possible; allocate the remainder
  // to the LAST installment (so the visible sum exactly equals totalKurus).
  const n = Math.max(1, Math.floor(input.installments));
  const interval = Math.max(1, Math.floor(input.intervalMonths ?? 1));
  const base = Math.floor(input.totalKurus / n);
  const remainder = input.totalKurus - base * n;
  const out: PaymentPlanPreviewItem[] = [];
  const prefix = input.titlePrefix?.trim() || `${packageName} taksit`;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    out.push({
      index: i + 1,
      title: `${prefix} ${i + 1}/${n}`,
      dueDate: addMonths(input.firstDueAt, i * interval),
      amountKurus: base + (isLast ? remainder : 0),
    });
  }
  return out;
}

export function getPaymentPlanSummary(items: PaymentPlanPreviewItem[]): {
  count: number;
  totalKurus: number;
  firstDueDate: Date | null;
  lastDueDate: Date | null;
} {
  if (items.length === 0) {
    return { count: 0, totalKurus: 0, firstDueDate: null, lastDueDate: null };
  }
  return {
    count: items.length,
    totalKurus: items.reduce((s, i) => s + i.amountKurus, 0),
    firstDueDate: items[0].dueDate,
    lastDueDate: items[items.length - 1].dueDate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation — atomic create
// ─────────────────────────────────────────────────────────────────────────────

export async function createStudentEnrollmentWithPaymentPlan(
  input: CreateEnrollmentInput,
): Promise<CreateEnrollmentResult> {
  const warnings: string[] = [];

  // Validate student + package up-front (cheap reads).
  const [student, pkg] = await Promise.all([
    prisma.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, fullName: true, userId: true },
    }),
    prisma.package.findUnique({
      where: { id: input.packageId },
      select: { id: true, name: true, isActive: true, price: true },
    }),
  ]);
  if (!student) throw new Error("Öğrenci bulunamadı");
  if (!pkg) throw new Error("Paket bulunamadı");
  if (!pkg.isActive) warnings.push("Seçilen paket pasif durumda.");

  // Validate parent link if a payer is given.
  if (input.payerParentId) {
    const link = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: input.payerParentId,
          studentId: input.studentId,
        },
      },
      select: { parentId: true },
    });
    if (!link) {
      throw new Error("Seçilen veli bu öğrenciye bağlı değil");
    }
  }

  // Validate plan amounts BEFORE writing anything.
  const previewItems = calculatePaymentPlanPreview(input.paymentPlan, pkg.name);
  if (input.paymentPlan.kind !== "NONE") {
    if (previewItems.length === 0) throw new Error("Ödeme planı boş olamaz");
    const sum = previewItems.reduce((s, i) => s + i.amountKurus, 0);
    if (sum <= 0) throw new Error("Ödeme planı tutarı 0'dan büyük olmalı");
    for (const item of previewItems) {
      if (item.amountKurus <= 0) throw new Error("Vade tutarı 0'dan büyük olmalı");
      if (Number.isNaN(item.dueDate.getTime())) throw new Error("Vade tarihi geçersiz");
    }
  }

  // Existing-active-enrollment soft-warn.
  const sameActive = await prisma.studentPackageEnrollment.findFirst({
    where: {
      studentId: input.studentId,
      packageId: input.packageId,
      status: { in: ACTIVE_ENROLLMENT_STATUSES },
    },
    select: { id: true },
  });
  if (sameActive) {
    warnings.push(
      "Bu paket için zaten aktif/açık bir kayıt var. Mükerrer kayıt oluşturuldu.",
    );
  }

  // ── 1. Create enrollment ────────────────────────────────────────────────
  const enrollment = await prisma.studentPackageEnrollment.create({
    data: {
      studentId: input.studentId,
      packageId: input.packageId,
      source: input.source,
      status: input.status,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      listPrice: input.listPriceKurus,
      discountAmount: input.discountKurus,
      billingPeriodLabel: input.billingPeriodLabel,
      notes: input.notes,
    },
    select: { id: true },
  });

  await logAudit({
    actorUserId: input.actorUserId,
    entityType: "StudentPackageEnrollment",
    entityId: enrollment.id,
    action: "ENROLLMENT_CREATE",
    summary: `${student.fullName} → ${pkg.name}`,
    payload: {
      studentId: input.studentId,
      packageId: input.packageId,
      status: input.status,
      source: input.source,
      payerParentId: input.payerParentId,
      classroomId: input.classroomId,
      paymentPlanKind: input.paymentPlan.kind,
    },
  });

  // ── 2. Optional classroom assignment (idempotent) ───────────────────────
  let classroomLinked = false;
  if (input.classroomId) {
    await prisma.classroomStudent.upsert({
      where: {
        classroomId_studentId: {
          classroomId: input.classroomId,
          studentId: input.studentId,
        },
      },
      update: {},
      create: {
        classroomId: input.classroomId,
        studentId: input.studentId,
      },
    });
    classroomLinked = true;
    await logAudit({
      actorUserId: input.actorUserId,
      entityType: "ClassroomStudent",
      entityId: `${input.classroomId}:${input.studentId}`,
      action: "STUDENT_CLASSROOM_ASSIGN",
      payload: { source: "enrollment-wizard", enrollmentId: enrollment.id },
    });
  }

  // ── 3. Optional ODK access tag grants ───────────────────────────────────
  const odkAccessTagIdsGranted: string[] = [];
  if (input.odkAccessTagIds.length > 0) {
    if (!student.userId) {
      warnings.push(
        "ODK erişim etiketleri seçildi ama öğrencinin kullanıcı hesabı yok; etiketler atanamadı.",
      );
    } else {
      for (const tagId of input.odkAccessTagIds) {
        const exists = await prisma.odkAccessTag.findUnique({
          where: { id: tagId },
          select: { id: true, isActive: true },
        });
        if (!exists || !exists.isActive) {
          warnings.push(`ODK erişim etiketi atlandı (pasif/silinmiş): ${tagId}`);
          continue;
        }
        await prisma.odkUserAccessTag.upsert({
          where: {
            userId_accessTagId: {
              userId: student.userId,
              accessTagId: tagId,
            },
          },
          update: { revokedAt: null },
          create: {
            userId: student.userId,
            accessTagId: tagId,
            source: "MANUAL",
            grantedById: input.actorUserId ?? undefined,
          },
        });
        odkAccessTagIdsGranted.push(tagId);
      }
      if (odkAccessTagIdsGranted.length > 0) {
        await logAudit({
          actorUserId: input.actorUserId,
          entityType: "OdkUserAccessTag",
          entityId: enrollment.id,
          action: "ODK_ACCESS_TAG_GRANT_BATCH",
          payload: {
            studentUserId: student.userId,
            accessTagIds: odkAccessTagIdsGranted,
            sourceEnrollmentId: enrollment.id,
          },
        });
      }
    }
  }

  // ── 4. Optional payment plan ────────────────────────────────────────────
  const scheduleIds: string[] = [];
  if (input.paymentPlan.kind !== "NONE") {
    const note = "note" in input.paymentPlan ? input.paymentPlan.note : null;
    for (const preview of previewItems) {
      const created = await prisma.paymentScheduleItem.create({
        data: {
          studentId: input.studentId,
          parentId: input.payerParentId,
          packageId: input.packageId,
          title: preview.title,
          amount: preview.amountKurus,
          dueDate: preview.dueDate,
          status: "PENDING",
          note: note ?? undefined,
          createdById: input.actorUserId ?? undefined,
        },
        select: { id: true },
      });
      scheduleIds.push(created.id);
    }
    await logAudit({
      actorUserId: input.actorUserId,
      entityType: "PaymentScheduleItem",
      entityId: enrollment.id,
      action: "PAYMENT_SCHEDULE_CREATE_BATCH",
      payload: {
        enrollmentId: enrollment.id,
        kind: input.paymentPlan.kind,
        itemCount: scheduleIds.length,
        totalKurus: previewItems.reduce((s, i) => s + i.amountKurus, 0),
        payerParentId: input.payerParentId,
      },
    });

    // Notify the payer parent (best-effort).
    if (input.payerParentId) {
      try {
        const parent = await prisma.parent.findUnique({
          where: { id: input.payerParentId },
          select: { userId: true, fullName: true },
        });
        if (parent?.userId) {
          await notifyUser({
            userId: parent.userId,
            type: "PAYMENT",
            title: "Yeni ödeme planı oluşturuldu",
            body: `${student.fullName} için ${scheduleIds.length} taksit/vade tanımlandı.`,
            relatedEntityType: "StudentPackageEnrollment",
            relatedEntityId: enrollment.id,
          });
        }
      } catch (err) {
        console.warn("[enrollment] parent notify failed", err);
      }
    }
  }

  // Best-effort admin notification.
  try {
    await notifyAdmins({
      type: "SYSTEM",
      title: "Yeni kayıt oluşturuldu",
      body: `${student.fullName} → ${pkg.name} (${getEnrollmentStatusLabel(input.status)})`,
      relatedEntityType: "StudentPackageEnrollment",
      relatedEntityId: enrollment.id,
    });
  } catch (err) {
    console.warn("[enrollment] admin notify failed", err);
  }

  return {
    enrollmentId: enrollment.id,
    paymentScheduleItemIds: scheduleIds,
    classroomLinked,
    odkAccessTagIdsGranted,
    payerParentId: input.payerParentId,
    warnings,
  };
}
