import "server-only";

import type { OdOnboardingState, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  allowedOdOnboardingTransitions,
  dueAtForOdOnboardingState,
  validateOdOnboardingPrerequisite,
  type OdOnboardingStateValue,
} from "@/lib/od/onboarding-state";

type DbClient = Prisma.TransactionClient;

export class OdOnboardingError extends Error {
  constructor(message: string, readonly code: "NOT_FOUND" | "INVALID_TRANSITION" | "MISSING_PREREQUISITE" | "CONFLICT" | "PAYMENT_CONFLICT") {
    super(message);
    this.name = "OdOnboardingError";
  }
}

export async function ensurePaidOdOnboarding(tx: DbClient, orderId: string) {
  const order = await tx.odOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, userId: true } });
  if (!order) throw new OdOnboardingError("Sipariş bulunamadı.", "NOT_FOUND");
  if (order.status !== "PAID") throw new OdOnboardingError("Onboarding yalnızca ödenmiş sipariş için oluşturulabilir.", "PAYMENT_CONFLICT");
  const now = new Date();
  return tx.odOnboarding.upsert({
    where: { orderId },
    update: {},
    create: {
      orderId,
      state: "PAID",
      flowType: order.userId ? "EXISTING_STUDENT" : "NEW_STUDENT",
      dueAt: dueAtForOdOnboardingState("PAID", now),
      stateEnteredAt: now,
      transitions: { create: { toState: "PAID", actorType: "SYSTEM", note: "Ödeme onayı ile onboarding başlatıldı.", occurredAt: now } },
    },
  });
}

export async function transitionOdOnboarding(input: {
  orderId: string;
  toState: OdOnboardingStateValue;
  actorUserId: string;
  ownerId?: string | null;
  dueAt?: Date | null;
  blockerReason?: string | null;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const onboarding = await tx.odOnboarding.findUnique({
      where: { orderId: input.orderId },
      include: {
        order: {
          select: {
            status: true,
            user: {
              select: {
                studentProfile: {
                  select: {
                    parents: { select: { id: true }, take: 1 },
                    enrollments: {
                      where: { endedAt: null },
                      select: { group: { select: { lessons: { where: { status: "PLANNED" }, select: { id: true }, take: 1 } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!onboarding) throw new OdOnboardingError("Sipariş onboarding kaydı bulunamadı.", "NOT_FOUND");

    const currentState = onboarding.state as OdOnboardingStateValue;
    const allowed = allowedOdOnboardingTransitions(currentState, onboarding.blockedFromState as OdOnboardingStateValue | null);
    if (!allowed.includes(input.toState)) {
      throw new OdOnboardingError(`${currentState} durumundan ${input.toState} durumuna geçilemez.`, "INVALID_TRANSITION");
    }
    if (["BLOCKED", "MANUAL_REVIEW"].includes(input.toState) && !input.blockerReason?.trim()) {
      throw new OdOnboardingError("Bloke durumuna geçmek için neden girin.", "MISSING_PREREQUISITE");
    }
    if (input.toState === "CANCELED" && onboarding.order.status !== "REFUNDED" && onboarding.order.status !== "CANCELLED") {
      throw new OdOnboardingError("Ödenmiş sipariş ödeme tarafında iade veya iptal edilmeden onboarding kapatılamaz.", "PAYMENT_CONFLICT");
    }

    const profile = onboarding.order.user?.studentProfile;
    const readiness = {
      hasStudentAccount: Boolean(profile),
      hasParentLink: Boolean(profile?.parents.length),
      hasGroupAssignment: Boolean(profile?.enrollments.length),
      hasFirstLesson: Boolean(profile?.enrollments.some((enrollment) => enrollment.group.lessons.length > 0)),
    };
    const prerequisiteError = validateOdOnboardingPrerequisite(input.toState, readiness);
    if (prerequisiteError) throw new OdOnboardingError(prerequisiteError, "MISSING_PREREQUISITE");

    const now = new Date();
    const nextOwnerId = input.ownerId === undefined ? onboarding.ownerId : input.ownerId;
    const nextDueAt = input.dueAt === undefined ? dueAtForOdOnboardingState(input.toState, now) : input.dueAt;
    if (input.toState !== "CANCELED" && !nextOwnerId) {
      throw new OdOnboardingError("Geçiş için bir operasyon sorumlusu seçin.", "MISSING_PREREQUISITE");
    }
    const update = await tx.odOnboarding.updateMany({
      where: { id: onboarding.id, version: onboarding.version },
      data: {
        state: input.toState as OdOnboardingState,
        ownerId: nextOwnerId,
        dueAt: nextDueAt,
        blockerReason: ["BLOCKED", "MANUAL_REVIEW"].includes(input.toState) ? input.blockerReason?.trim() : null,
        blockedFromState: ["BLOCKED", "MANUAL_REVIEW"].includes(input.toState) ? onboarding.state : null,
        stateEnteredAt: now,
        activatedAt: input.toState === "ACTIVE" ? now : onboarding.activatedAt,
        canceledAt: input.toState === "CANCELED" ? now : onboarding.canceledAt,
        version: { increment: 1 },
      },
    });
    if (update.count !== 1) throw new OdOnboardingError("Onboarding başka bir kullanıcı tarafından güncellendi. Sayfayı yenileyin.", "CONFLICT");

    await tx.odOnboardingTransition.create({
      data: {
        onboardingId: onboarding.id,
        fromState: onboarding.state,
        toState: input.toState as OdOnboardingState,
        actorUserId: input.actorUserId,
        actorType: "USER",
        note: input.note?.trim() || null,
        metadata: { readiness, ownerId: nextOwnerId, dueAt: nextDueAt?.toISOString() ?? null },
        occurredAt: now,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorType: "USER",
        entityType: "OdOnboarding",
        entityId: onboarding.id,
        action: "onboarding.transitioned",
        summary: `${onboarding.state} → ${input.toState}`,
        payload: { orderId: input.orderId, blockerReason: input.blockerReason ?? null, note: input.note ?? null },
      },
    });

    return tx.odOnboarding.findUniqueOrThrow({ where: { id: onboarding.id } });
  }, { isolationLevel: "Serializable" });
}
