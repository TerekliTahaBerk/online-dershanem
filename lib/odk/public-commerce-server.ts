import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isPaytrConfigured } from "@/lib/odk/paytr";
import { odkPublicAccessDecision } from "@/lib/odk/pilot-rollout";
import { buildOdkCatalogContract } from "@/lib/odk/product-contract-server";
import {
  decideOdkCommerceAvailability,
  odkSellableContractIssues,
  type OdkCommerceBlockReason,
  type OdkProductContract,
} from "@/lib/odk/product-contract";

export type PublicOdkPackage = {
  contract: OdkProductContract;
  featured: boolean;
  ctaText: string | null;
  catalogReady: boolean;
  availability: ReturnType<typeof decideOdkCommerceAvailability>;
};

export const ODK_PUBLIC_FAQ = [
  {
    q: "Pakete hangi denemeler dahil?",
    a: "Paket detayındaki deneme listesi, gün ve saat bilgileri satın alma sözleşmesiyle aynı katalog kaydından gelir.",
  },
  {
    q: "Sonuç ve raporları kimler görebilir?",
    a: "Öğrenci, veli ve öğretmen raporu hakları her paketin erişim sözleşmesinde ayrı ayrı belirtilir.",
  },
  {
    q: "Bir deneme ertelenirse ne olur?",
    a: "Paket sözleşmesine göre deneme yeniden planlanır veya erişim süresi uzatılır; iptal halinde yeniden planlama ya da iade uygulanır.",
  },
  {
    q: "Satış kapalıysa ödeme yapabilir miyim?",
    a: "Hayır. Kapalı, duraklatılmış veya kontenjanı dolmuş paketlerde ödeme yolu açılmaz; paket yeniden açıldığında detay sayfası güncellenir.",
  },
] as const;

export function odkContractFaq(contract: OdkProductContract) {
  const reportRoles = [
    contract.policy.rights.studentReports && "öğrenci",
    contract.policy.rights.parentReports && "veli",
    contract.policy.rights.teacherReports && "öğretmen",
  ].filter(Boolean).join(", ");
  const outage = contract.policy.exceptions.outage === "EXTEND_ACCESS"
    ? "erişim süresi uzatılır"
    : "deneme yeniden planlanır veya erişim süresi uzatılır";
  const cancellation = contract.policy.exceptions.cancellation === "REFUND"
    ? "ücret iadesi uygulanır"
    : "deneme yeniden planlanır veya ücret iadesi uygulanır";
  return [
    {
      q: `${contract.package.title} paketine hangi denemeler dahil?`,
      a: contract.exams.length
        ? contract.exams.map((exam) => `${exam.family}: ${exam.title}`).join("; ")
        : "Bu paketin deneme takvimi henüz tamamlanmadığı için satış yolu kapalıdır.",
    },
    {
      q: "Sonuç ve raporları kimler görebilir?",
      a: reportRoles ? `Sözleşmeye göre ${reportRoles} rapor erişimine sahiptir.` : "Bu pakette ek rapor erişimi tanımlanmamıştır.",
    },
    {
      q: "Teknik aksama veya iptal olursa ne olur?",
      a: `Teknik aksama halinde ${outage}; iptal halinde ${cancellation}.`,
    },
    {
      q: "Kontenjan dolduğunda ödeme yapılabilir mi?",
      a: "Hayır. Paket kontenjanı dolduğunda yeni siparişler sözleşme gereği otomatik olarak engellenir.",
    },
  ];
}

export function odkAvailabilityLabel(reason: OdkCommerceBlockReason | null) {
  if (!reason) return "Satışta";
  if (reason === "SOLD_OUT") return "Kontenjan doldu";
  if (reason === "NOT_STARTED") return "Yakında satışta";
  if (reason === "ENDED" || reason === "CLOSED" || reason === "INACTIVE") return "Satış kapandı";
  if (reason === "PAYMENT_UNAVAILABLE") return "Ödeme geçici olarak kapalı";
  return "Şu anda satışta değil";
}

export async function listPublicOdkPackages(now = new Date()): Promise<PublicOdkPackage[]> {
  const rows = await prisma.odkPackage.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
    select: { id: true, isActive: true, isFeatured: true, ctaText: true },
  });
  const rollout = odkPublicAccessDecision();
  const paymentReady = isPaytrConfigured();
  const packages = await Promise.all(rows.map(async (row): Promise<PublicOdkPackage | null> => {
    try {
      const contract = await buildOdkCatalogContract(row.id, now);
      return {
        contract,
        featured: row.isFeatured,
        ctaText: row.ctaText,
        catalogReady: contract.package.priceCents > 0 && odkSellableContractIssues(contract).length === 0,
        availability: decideOdkCommerceAvailability({
          contract,
          rolloutAllowed: rollout.allowed,
          packageActive: row.isActive,
          paymentReady,
          now,
        }),
      } satisfies PublicOdkPackage;
    } catch {
      return null;
    }
  }));
  return packages.filter((item): item is PublicOdkPackage => Boolean(
    item
      && item.catalogReady,
  ));
}

export const getPublicOdkPackage = cache(async (slug: string, now = new Date()) => {
  const row = await prisma.odkPackage.findUnique({
    where: { slug },
    select: { id: true, isActive: true, isFeatured: true, ctaText: true },
  });
  if (!row || !row.isActive) return null;
  try {
    const contract = await buildOdkCatalogContract(row.id, now);
    const rollout = odkPublicAccessDecision();
    return {
      contract,
      featured: row.isFeatured,
      ctaText: row.ctaText,
      catalogReady: contract.package.priceCents > 0 && odkSellableContractIssues(contract).length === 0,
      availability: decideOdkCommerceAvailability({
        contract,
        rolloutAllowed: rollout.allowed,
        packageActive: row.isActive,
        paymentReady: isPaytrConfigured(),
        now,
      }),
    } satisfies PublicOdkPackage;
  } catch {
    return null;
  }
});
