import "server-only";
import type { Prisma } from "@prisma/client";
import {
  buildLeadWhere,
  sortLeadsForWorklist,
  type LeadListFilters,
} from "@/lib/business/leads";
import { prisma } from "@/lib/prisma";

const leadListInclude = {
  campaign: { select: { id: true, name: true } },
  tasks: {
    where: { completedAt: null },
    orderBy: { dueAt: "asc" as const },
    take: 3,
  },
  attributions: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { campaign: { select: { id: true, name: true } } },
  },
} satisfies Prisma.BusinessLeadInclude;

export type LeadListItem = Prisma.BusinessLeadGetPayload<{ include: typeof leadListInclude }>;

export async function loadLeadWorklist(
  unitIds: string[],
  filters: LeadListFilters,
  take = 80,
): Promise<LeadListItem[]> {
  const where = buildLeadWhere(unitIds, filters);
  const rows = await prisma.businessLead.findMany({
    where,
    include: leadListInclude,
    orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    take,
  });
  return sortLeadsForWorklist(rows, filters.now);
}

export async function loadFunnelLeads(unitIds: string[], take = 200) {
  return prisma.businessLead.findMany({
    where: { businessUnitId: { in: unitIds }, anonymizedAt: null },
    include: {
      campaign: { select: { id: true, name: true } },
      tasks: {
        where: { completedAt: null },
        orderBy: { dueAt: "asc" },
        take: 1,
      },
    },
    orderBy: [{ priority: "desc" }, { nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    take,
  });
}

export async function loadLeadDetail(leadId: string, unitIds: string[]) {
  return prisma.businessLead.findFirst({
    where: { id: leadId, businessUnitId: { in: unitIds }, anonymizedAt: null },
    include: {
      campaign: true,
      conversation: {
        include: {
          messages: { orderBy: { occurredAt: "desc" }, take: 40 },
        },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      tasks: { orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }], take: 40 },
      attributions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { campaign: true, advertisement: true },
      },
      financialTransactions: { orderBy: { transactionAt: "desc" }, take: 20 },
    },
  });
}

export async function findDuplicateLeads(
  lead: {
    id: string;
    businessUnitId: string;
    normalizedPhone: string | null;
    normalizedEmail: string | null;
  },
) {
  const or: Prisma.BusinessLeadWhereInput[] = [];
  if (lead.normalizedPhone) or.push({ normalizedPhone: lead.normalizedPhone });
  if (lead.normalizedEmail) or.push({ normalizedEmail: lead.normalizedEmail });
  if (!or.length) return [];
  return prisma.businessLead.findMany({
    where: {
      businessUnitId: lead.businessUnitId,
      id: { not: lead.id },
      anonymizedAt: null,
      stage: { not: "SPAM" },
      OR: or,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      stage: true,
      source: true,
      lastContactAt: true,
      normalizedPhone: true,
      normalizedEmail: true,
    },
    take: 10,
  });
}

export async function loadSalesOwners(unitIds: string[]) {
  return prisma.businessRoleAssignment.findMany({
    where: {
      businessUnitId: { in: unitIds },
      role: { in: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT"] },
    },
    include: { user: { select: { id: true, fullName: true } } },
    take: 100,
  });
}
