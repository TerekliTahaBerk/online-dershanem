/**
 * Cross-sell sepete önerilen ürünler.
 * OD: subjectPackageGroups'tan, sepette olmayan paketler.
 * ODK: yakında dinamik DB sorgusu (şu an statik fallback).
 */
import { subjectPackageGroups, getPackagePriceCents, parsePriceToCents } from "@/lib/content";
import type { OdCartItem } from "@/components/cart/cart-provider";

export type Suggestion = {
  id: string;
  service: "OD" | "ODK";
  category: string;
  subject: string;
  name: string;
  priceCents: number;
  priceLabel: string;
  oldPriceLabel?: string;
  badge?: string;
  reason: string; // premium dilli açıklama
};

export function buildOdSuggestions(
  cartItems: Pick<OdCartItem, "id" | "category" | "subject">[],
  limit = 3,
): Suggestion[] {
  const cartIds = new Set(cartItems.map((c) => c.id));
  const cartCategories = new Set(cartItems.map((c) => c.category));
  const cartSubjects = new Set(cartItems.map((c) => c.subject));

  const all: Suggestion[] = [];
  for (const group of subjectPackageGroups) {
    for (const pkg of group.packages) {
      const id = `${pkg.category}__${pkg.subject}`;
      if (cartIds.has(id)) continue;
      const priceCents =
        getPackagePriceCents(pkg.category, pkg.subject) ||
        parsePriceToCents(pkg.discountedPrice);
      if (priceCents <= 0) continue;
      // Premium dilli reason
      let reason = "Akademik dengenizi tamamlayabilir.";
      if (cartCategories.has(pkg.category) && !cartSubjects.has(pkg.subject)) {
        reason = `${pkg.category} hazırlığınızı bir adım öne taşır.`;
      } else if (pkg.badge === "EN POPÜLER") {
        reason = "Öğrencilerin en çok tercih ettiği program.";
      } else if (pkg.badge === "ÖĞRENCİ FAVORİSİ") {
        reason = "Aynı seviyedeki öğrencilerin sıkça eklediği paket.";
      } else if (pkg.category === "LGS") {
        reason = "Sınava odaklı, kazanım takipli LGS programı.";
      }
      all.push({
        id,
        service: "OD",
        category: pkg.category,
        subject: pkg.subject,
        name: `${pkg.category} ${pkg.subject}`,
        priceCents,
        priceLabel: pkg.discountedPrice,
        oldPriceLabel: pkg.oldPrice,
        badge: pkg.badge || undefined,
        reason,
      });
    }
  }

  // Sıralama: aynı kategoriden öneriler önce, sonra "EN POPÜLER"/"ÖĞRENCİ FAVORİSİ", sonra diğer
  all.sort((a, b) => {
    const aSameCat = cartCategories.has(a.category) ? 0 : 1;
    const bSameCat = cartCategories.has(b.category) ? 0 : 1;
    if (aSameCat !== bSameCat) return aSameCat - bSameCat;
    const aPop = a.badge ? 0 : 1;
    const bPop = b.badge ? 0 : 1;
    return aPop - bPop;
  });

  return all.slice(0, limit);
}
