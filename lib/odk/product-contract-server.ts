import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  contractAccessWindow,
  contractExam,
  decideOdkSale,
  odkSellableContractIssues,
  parseOdkPackagePolicy,
  parseOdkProductContract,
  type OdkProductContract,
} from "@/lib/odk/product-contract";

export async function buildOdkCatalogContract(packageId: string, capturedAt = new Date()): Promise<OdkProductContract> {
  const pkg = await prisma.odkPackage.findUnique({ where: { id: packageId }, include: { examLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { exam: { include: { series: { select: { title: true } } } } } } } });
  if (!pkg) throw new Error("ODK_PACKAGE_NOT_FOUND");
  const policy = parseOdkPackagePolicy(pkg.contractPolicy);
  if (!policy.success) throw new Error("ODK_PACKAGE_CONTRACT_INVALID");
  return {
    schemaVersion: 1,
    catalogVersion: pkg.contractVersion,
    capturedAt: capturedAt.toISOString(),
    package: {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      description: pkg.description,
      priceCents: pkg.priceCents,
      originalPriceCents: pkg.originalPriceCents,
    },
    policy: policy.data,
    exams: pkg.examLinks.map(({ exam }) => ({
      id: exam.id,
      seriesId: exam.seriesId,
      seriesTitle: exam.series?.title ?? null,
      title: exam.title,
      slug: exam.slug,
      family: exam.family,
      startsAt: exam.startsAt?.toISOString() ?? null,
      endsAt: exam.endsAt?.toISOString() ?? null,
      lateEntryMinutes: exam.lateEntryMinutes,
      attemptLimit: exam.attemptLimit,
      resultsReleasedAt: exam.resultsReleasedAt?.toISOString() ?? null,
      answerKeyReleasedAt: exam.answerKeyReleasedAt?.toISOString() ?? null,
      liveServiceRequired: exam.meetRequired,
    })),
  };
}

export async function createOdkOrderFromCatalog(input: {
  packageId: string;
  buyerInfo?: Prisma.InputJsonValue;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const contract = await buildOdkCatalogContract(input.packageId, now);
  const sale = decideOdkSale(contract.policy, now);
  if (!sale.allowed) throw new Error(`ODK_PACKAGE_NOT_SELLABLE:${sale.reason}`);
  const issues = odkSellableContractIssues(contract);
  if (issues.length) throw new Error(`ODK_PACKAGE_CONTRACT_INCOMPLETE:${issues.join(",")}`);
  return prisma.odkOrder.create({
    data: {
      packageId: input.packageId,
      subtotalCents: contract.package.priceCents,
      totalCents: contract.package.priceCents,
      buyerInfo: input.buyerInfo,
      contractSnapshot: contract as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listActiveOdkContracts(userId: string, now = new Date()) {
  const rows = await prisma.odkEntitlement.findMany({
    where: { userId, startsAt: { lte: now }, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: { id: true, startsAt: true, expiresAt: true, contractSnapshot: true },
  });
  return rows.flatMap((row) => {
    const parsed = parseOdkProductContract(row.contractSnapshot);
    return parsed.success ? [{ entitlementId: row.id, startsAt: row.startsAt, expiresAt: row.expiresAt, contract: parsed.data }] : [];
  });
}

export async function getActiveOdkExamGrant(userId: string, examId: string, now = new Date()) {
  const contracts = await listActiveOdkContracts(userId, now);
  for (const item of contracts) {
    const exam = contractExam(item.contract, examId);
    if (exam) return { ...item, exam };
  }
  return null;
}

export async function provisionedAccessWindow(orderId: string) {
  const order = await prisma.odkOrder.findUniqueOrThrow({
    where: { id: orderId },
    select: { contractSnapshot: true, createdAt: true, payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "asc" }, take: 1, select: { paidAt: true } } },
  });
  const parsed = parseOdkProductContract(order.contractSnapshot);
  if (!parsed.success) throw new Error("ODK_ORDER_CONTRACT_INVALID");
  const purchasedAt = order.payments[0]?.paidAt ?? order.createdAt;
  return { contract: parsed.data, ...contractAccessWindow(parsed.data.policy, purchasedAt) };
}
