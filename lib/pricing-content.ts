/**
 * Fiyat/ürün içeriği — türetilmiş görünüm.
 *
 * ÖNEMLİ: Fiyatın TEK kaynağı `lib/content.ts` → `subjectPackageGroups`'tur.
 * Bu modül yalnızca o katalogtan OKUR ve pazarlama bileşenleri için kullanışlı
 * bir şekil üretir. Buradaki hiçbir değer fiyatı DEĞİŞTİRMEZ; checkout fiyat
 * doğrulaması (`getPackagePriceCents`) hâlâ `category` + `subject` çiftine bağlıdır.
 */
import { subjectPackageGroups } from "@/lib/content";

const sources = subjectPackageGroups[0].packages;

function toLessonPackage(source: (typeof sources)[number]) {
  return {
    name: source.name,
    category: source.category, // "LGS" veya "YKS"
    subject: source.subject, // "Matematik Ders Paketi" — checkout kimliği
    priceLabel: source.discountedPrice, // ör. "₺3.000/ay"
    oldPriceLabel: source.oldPrice || undefined, // ör. "₺5.000/ay"
    discountLabel: source.discountLabel || undefined,
    priceCents: source.priceCents, // ödeme-kritik kaynak değeri
    tagline: source.tagline,
    audience: source.audience,
    quota: source.quota,
    features: [...source.features] as string[],
  };
}

export const lessonPackages = sources.map(toLessonPackage);
export const lessonPackage = lessonPackages[0];

/** "Neler dahil?" listesi — public ürün gerçekliğini fiyat kaynağından ayırmadan anlatır. */
export const includedFeatures: string[] = [
  "Canlı matematik dersi",
  "En fazla 4 öğrencilik grup",
  "Derste soru-cevap ve birlikte çözüm",
  "Ders sonrası çalışma yönü",
  "Ödevlendirme ve öğretmen notu",
  "Sade gelişim özeti",
  "Seviye ve hedefe göre grup planlaması",
  "PayTR ile güvenli ödeme",
];

/** Fiyat kartında gösterilen kısa öne çıkanlar. */
export const cardHighlights: string[] = [
  "En fazla 4 öğrencilik grup",
  "Ders sonrası çalışma yönü",
  "Ödevlendirme ve öğretmen notu",
  "PayTR ile güvenli ödeme",
];
