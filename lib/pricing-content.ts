/**
 * Fiyat/ürün içeriği — türetilmiş görünüm.
 *
 * ÖNEMLİ: Fiyatın TEK kaynağı `lib/content.ts` → `subjectPackageGroups`'tur.
 * Bu modül yalnızca o katalogtan OKUR ve pazarlama bileşenleri için kullanışlı
 * bir şekil üretir. Buradaki hiçbir değer fiyatı DEĞİŞTİRMEZ; checkout fiyat
 * doğrulaması (`getPackagePriceCents`) hâlâ `category` + `subject` çiftine bağlıdır.
 */
import { subjectPackageGroups } from "@/lib/content";

const source = subjectPackageGroups[0].packages.find((p) => p.subject === "Ders Paketi")!;

export const lessonPackage = {
  name: source.name,
  category: source.category, // "Matematik"
  subject: source.subject, // "Ders Paketi" — checkout kimliği
  priceLabel: source.discountedPrice, // ör. "₺3.000/ay"
  oldPriceLabel: source.oldPrice || undefined, // ör. "₺5.000/ay"
  discountLabel: source.discountLabel || undefined,
  priceCents: source.priceCents, // ödeme-kritik kaynak değeri
  tagline: source.tagline,
  audience: source.audience,
  quota: source.quota,
  features: [...source.features] as string[],
};

/** "Neler dahil?" listesi — gerçek paket içeriğine dayanır. */
export const includedFeatures = lessonPackage.features;

/** Fiyat kartında gösterilen kısa öne çıkanlar. */
export const cardHighlights: string[] = [
  "En fazla 4 öğrencilik canlı matematik dersi",
  "Kişiye özel haftalık çalışma planı",
  "Ödevlendirme ve öğretmen notu",
  "Veliye anlaşılır haftalık gelişim notu",
];
