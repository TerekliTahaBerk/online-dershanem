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
    id: source.id,
    name: source.name,
    category: source.category, // "LGS" veya "YKS"
    subject: source.subject, // "Matematik Ders Paketi" — checkout kimliği
    priceLabel: source.discountedPrice, // ör. "₺2.000/ay"
    oldPriceLabel: source.oldPrice || undefined, // kampanya yoksa undefined
    discountLabel: source.discountLabel || undefined,
    priceCents: source.priceCents, // ödeme-kritik kaynak değeri
    tagline: source.tagline,
    audience: source.audience,
    quota: source.quota,
    lessonDurationMinutes: source.lessonDurationMinutes,
    lessonsPerMonth: source.lessonsPerMonth,
    billingPeriod: source.billingPeriod,
    commitment: source.commitment,
    examFocus: [...source.examFocus] as string[],
    features: [...source.features] as string[],
  };
}

export const lessonPackages = sources.map(toLessonPackage);
export const lessonPackage = lessonPackages[0];

/** Sınav hattına göre paketler — listeleme sayfaları branş kartlarını böler. */
export function lessonPackagesByExam(category: string) {
  return lessonPackages.filter((pkg) => pkg.category === category);
}

/**
 * "Neler dahil?" listesi — public ürün gerçekliğini fiyat kaynağından ayırmadan
 * anlatır. Tüm branş paketlerinde ORTAK standart; paketler arası tek fark
 * `examFocus`'tur, o yüzden bu liste paketten türetilmez.
 */
export const includedFeatures: string[] = [
  `Ayda ${lessonPackage.lessonsPerMonth} × ${lessonPackage.lessonDurationMinutes} dakika canlı ders`,
  "En fazla 4 öğrencilik grup",
  "Derste soru-cevap ve birlikte çözüm",
  "Ders sonrası çalışma yönü",
  "Ödevlendirme ve öğretmen notu",
  "Sade gelişim özeti",
  "Seviye ve hedefe göre grup planlaması",
  "PayTR ile güvenli ödeme",
];
