import "server-only";

import { prisma } from "@/lib/prisma";
import { deriveLeadLifecycleStatus } from "@/lib/panel/operations-inbox";
import { evaluateLeadUserMatch, leadIdentityFilters, type IdentityMatchResult } from "@/lib/lifecycle/identity";
import { buildLeadLifecycleTimeline, type LifecycleTimelineEvent } from "@/lib/lifecycle/timeline";
import {
  deriveLifecycleStudentStatus,
  provisioningErrorGuidance,
  toLifecycleLeadStage,
  toLifecycleOrderStatus,
  toLifecycleProvisioningStatus,
  type LifecycleLeadStage,
  type LifecycleOrderStatus,
  type LifecycleProvisioningStatus,
  type LifecycleStudentStatus,
} from "@/lib/lifecycle/states";

export type LeadLifecycleDetail = {
  leadId: string;
  stage: string;
  lifecycleLeadStage: LifecycleLeadStage;
  handoff: ReturnType<typeof deriveLeadLifecycleStatus>;
  links: {
    odOrderId: string | null;
    odkOrderId: string | null;
    odUserId: string | null;
    odkUserId: string | null;
    studentProfileId: string | null;
  };
  orderSummary: {
    id: string;
    product: "OD" | "ODK";
    status: LifecycleOrderStatus;
    rawStatus: string;
    provisioning: LifecycleProvisioningStatus | null;
    rawProvisioning: string | null;
    provisioningError: string | null;
    provisioningGuidance: string | null;
    userId: string | null;
  } | null;
  studentStatus: LifecycleStudentStatus | null;
  identityMatch: IdentityMatchResult;
  timeline: LifecycleTimelineEvent[];
  wonLinksComplete: boolean;
};

export async function loadLeadLifecycleDetail(
  leadId: string,
  options?: { businessUnitIds?: string[] },
): Promise<LeadLifecycleDetail | null> {
  const lead = await prisma.businessLead.findFirst({
    where: {
      id: leadId,
      ...(options?.businessUnitIds?.length ? { businessUnitId: { in: options.businessUnitIds } } : {}),
    },
    include: {
      activities: { orderBy: { createdAt: "asc" }, take: 100 },
      conversation: { select: { id: true, createdAt: true, messages: { orderBy: { occurredAt: "asc" }, take: 1, select: { occurredAt: true } } } },
    },
  });
  if (!lead) return null;

  const orderIds = [lead.relatedOdOrderId, lead.relatedOdkOrderId].filter(Boolean) as string[];
  const [odOrder, odkOrder] = await Promise.all([
    lead.relatedOdOrderId
      ? prisma.odOrder.findUnique({
          where: { id: lead.relatedOdOrderId },
          select: {
            id: true,
            status: true,
            createdAt: true,
            userId: true,
            provisioningStatus: true,
            provisioningError: true,
            provisionedAt: true,
            payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "asc" }, take: 1, select: { paidAt: true } },
            user: {
              select: {
                id: true,
                inviteSentAt: true,
                inviteAcceptedAt: true,
                productMemberships: { where: { product: "OD", revokedAt: null }, select: { id: true }, take: 1 },
                studentProfile: {
                  select: { id: true, enrollments: { where: { endedAt: null }, select: { id: true }, take: 1 } },
                },
              },
            },
            onboarding: { select: { state: true } },
          },
        })
      : Promise.resolve(null),
    lead.relatedOdkOrderId
      ? prisma.odkOrder.findUnique({
          where: { id: lead.relatedOdkOrderId },
          select: {
            id: true,
            status: true,
            createdAt: true,
            studentUserId: true,
            provisioningStatus: true,
            provisioningError: true,
            provisionedAt: true,
            payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "asc" }, take: 1, select: { paidAt: true } },
            student: {
              select: {
                id: true,
                inviteSentAt: true,
                inviteAcceptedAt: true,
                productMemberships: { where: { product: "ODK", revokedAt: null }, select: { id: true }, take: 1 },
                studentProfile: {
                  select: { id: true, enrollments: { where: { endedAt: null }, select: { id: true }, take: 1 } },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const orderEvents = [
    ...(odOrder
      ? [
          {
            id: odOrder.id,
            product: "OD" as const,
            status: odOrder.status,
            createdAt: odOrder.createdAt,
            paidAt: odOrder.payments[0]?.paidAt ?? null,
            provisioningStatus: odOrder.provisioningStatus,
            provisionedAt: odOrder.provisionedAt,
            provisioningError: odOrder.provisioningError,
            userId: odOrder.userId,
          },
        ]
      : []),
    ...(odkOrder
      ? [
          {
            id: odkOrder.id,
            product: "ODK" as const,
            status: odkOrder.status,
            createdAt: odkOrder.createdAt,
            paidAt: odkOrder.payments[0]?.paidAt ?? null,
            provisioningStatus: odkOrder.provisioningStatus,
            provisionedAt: odkOrder.provisionedAt,
            provisioningError: odkOrder.provisioningError,
            userId: odkOrder.studentUserId,
          },
        ]
      : []),
  ];

  const timeline = buildLeadLifecycleTimeline({
    leadId: lead.id,
    createdAt: lead.createdAt,
    source: lead.source,
    conversationId: lead.conversationId,
    firstMessageAt: lead.conversation?.messages[0]?.occurredAt ?? lead.conversation?.createdAt ?? null,
    activities: lead.activities,
    relatedOdOrderId: lead.relatedOdOrderId,
    relatedOdkOrderId: lead.relatedOdkOrderId,
    relatedOdUserId: lead.relatedOdUserId,
    relatedOdkUserId: lead.relatedOdkUserId,
    orderEvents,
  });

  const handoff = deriveLeadLifecycleStatus({
    stage: lead.stage,
    productInterest: lead.productInterest,
    relatedOdOrderId: lead.relatedOdOrderId,
    relatedOdkOrderId: lead.relatedOdkOrderId,
    relatedOdUserId: lead.relatedOdUserId,
    relatedOdkUserId: lead.relatedOdkUserId,
  });

  const primaryOrder = odOrder
    ? {
        id: odOrder.id,
        product: "OD" as const,
        status: toLifecycleOrderStatus(odOrder.status),
        rawStatus: odOrder.status,
        provisioning: toLifecycleProvisioningStatus(odOrder.provisioningStatus),
        rawProvisioning: odOrder.provisioningStatus,
        provisioningError: odOrder.provisioningError,
        provisioningGuidance: provisioningErrorGuidance(odOrder.provisioningError),
        userId: odOrder.userId,
      }
    : odkOrder
      ? {
          id: odkOrder.id,
          product: "ODK" as const,
          status: toLifecycleOrderStatus(odkOrder.status),
          rawStatus: odkOrder.status,
          provisioning: toLifecycleProvisioningStatus(odkOrder.provisioningStatus),
          rawProvisioning: odkOrder.provisioningStatus,
          provisioningError: odkOrder.provisioningError,
          provisioningGuidance: provisioningErrorGuidance(odkOrder.provisioningError),
          userId: odkOrder.studentUserId,
        }
      : null;

  const user = odOrder?.user ?? odkOrder?.student ?? null;
  const studentStatus = user
    ? deriveLifecycleStudentStatus({
        hasAccount: true,
        inviteSentAt: user.inviteSentAt,
        inviteAcceptedAt: user.inviteAcceptedAt,
        packageActive: (user.productMemberships?.length ?? 0) > 0,
        hasGroup: (user.studentProfile?.enrollments?.length ?? 0) > 0,
        onboardingState: odOrder?.onboarding?.state ?? null,
      })
    : null;

  const { filters } = leadIdentityFilters({ email: lead.email, phone: lead.phone });
  const relatedUserId = lead.relatedOdUserId || lead.relatedOdkUserId;
  let identityMatch = evaluateLeadUserMatch(
    { email: lead.email, phone: lead.phone, relatedUserId },
    [],
  );
  if (filters.length && !relatedUserId) {
    const candidates = await prisma.user.findMany({
      where: {
        OR: [
          ...(lead.normalizedEmail ? [{ email: lead.normalizedEmail }] : []),
          ...(lead.normalizedPhone ? [{ phone: lead.normalizedPhone }] : []),
          ...(lead.phone ? [{ phone: lead.phone }] : []),
          ...(lead.email ? [{ email: lead.email.toLowerCase() }] : []),
        ],
      },
      select: { id: true, role: true, status: true, email: true, phone: true, fullName: true },
      take: 10,
    });
    identityMatch = evaluateLeadUserMatch(
      { email: lead.email, phone: lead.phone, relatedUserId },
      candidates.map((c) => ({
        userId: c.id,
        role: c.role,
        status: c.status,
        email: c.email,
        phone: c.phone,
        fullName: c.fullName,
      })),
    );
  } else if (relatedUserId) {
    identityMatch = {
      decision: "LINK",
      confidence: 1,
      reasons: ["USER"],
      candidate: user
        ? {
            userId: user.id,
            role: "STUDENT",
            status: "ACTIVE",
            email: null,
            phone: null,
            fullName: null,
          }
        : null,
      message: "Lead mevcut öğrenci hesabına bağlı.",
    };
  }

  const wonLinksComplete =
    lead.stage !== "WON" ||
    (Boolean(lead.relatedOdOrderId || lead.relatedOdkOrderId) &&
      Boolean(lead.relatedOdUserId || lead.relatedOdkUserId));

  void orderIds;

  return {
    leadId: lead.id,
    stage: lead.stage,
    lifecycleLeadStage: toLifecycleLeadStage(lead.stage),
    handoff,
    links: {
      odOrderId: lead.relatedOdOrderId,
      odkOrderId: lead.relatedOdkOrderId,
      odUserId: lead.relatedOdUserId,
      odkUserId: lead.relatedOdkUserId,
      studentProfileId: user?.studentProfile?.id ?? null,
    },
    orderSummary: primaryOrder,
    studentStatus,
    identityMatch,
    timeline,
    wonLinksComplete,
  };
}
