import "server-only";
import type { ProductInterest } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STOP_WORDS = new Set(["için", "ile", "ama", "veya", "bir", "bu", "şu", "nedir", "nasıl", "var", "mı", "mi"]);
export function queryTerms(message: string) {
  return [...new Set(message.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9\s]/gi, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word)))].slice(0, 8);
}

export async function buildKnowledgeContext(input: { businessUnitId: string; message: string; productInterest?: ProductInterest }) {
  const now = new Date();
  const terms = queryTerms(input.message);
  const entries = await prisma.knowledgeBaseEntry.findMany({
    where: {
      businessUnitId: input.businessUnitId,
      isActive: true,
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [
        { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        { OR: [{ productInterest: "UNKNOWN" }, { productInterest: input.productInterest ?? "UNKNOWN" }] },
        ...(terms.length ? [{ OR: terms.flatMap((term) => [{ title: { contains: term, mode: "insensitive" as const } }, { content: { contains: term, mode: "insensitive" as const } }]) }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" }, take: 8,
  });
  const [odPackages, odkPackages] = await Promise.all([
    input.productInterest !== "ONLINE_DENEME_KULUBU" ? prisma.package.findMany({ where: { isActive: true }, select: { name: true, price: true, description: true }, take: 20 }) : Promise.resolve([]),
    input.productInterest !== "ONLINE_DERSHANEM" ? prisma.odkPackage.findMany({ where: { isActive: true }, select: { title: true, priceCents: true, description: true }, take: 20 }) : Promise.resolve([]),
  ]);
  const canonicalPrices = [
    ...odPackages.map((item) => `AKTİF OD PAKETİ: ${item.name}; fiyat=${(item.price / 100).toFixed(2)} TRY; ${item.description ?? ""}`),
    ...odkPackages.map((item) => `AKTİF ODK PAKETİ: ${item.title}; fiyat=${(item.priceCents / 100).toFixed(2)} TRY; ${item.description ?? ""}`),
  ];
  return [...canonicalPrices, ...entries.map((item) => `${item.category} / ${item.title} (v${item.version}): ${item.content}`)].join("\n").slice(0, 12_000);
}
