import { coachingOffer } from "@/lib/marketing-offers";
import { yonBrand } from "@/lib/yon-brand";
import {
  formatCents,
  lessonFormatPrices,
  resolvePackageQuote,
  singleProductPrice,
  type BuilderSelection,
} from "./package-builder-pricing";

const base: BuilderSelection = {
  exam: null,
  dershanem: false,
  kocum: false,
  denemeKulubum: false,
  format: "grup",
  subject: null,
  extraSubjects: [],
};

function label(cents: number | null | undefined, period: "ay" | "dönem") {
  return cents == null ? "Fiyat için bizimle iletişime geç" : `${formatCents(cents)}/${period}`;
}

/** Ders/deneme katalogdan; koçluk onaylı pazarlama teklifinden okunur. */
export function getPublicPricingCopy() {
  const formats = lessonFormatPrices();
  const lessonAndExam = resolvePackageQuote({ ...base, dershanem: true, denemeKulubum: true });

  return {
    standalone: `Grup dersi ${label(formats.grup.campaignCents, "ay")}, birebir ders ${label(formats.birebir.campaignCents, "ay")}, ${yonBrand.name}: ${coachingOffer.summary} ve onlinedenemekulübüm. × Deneme Ligi ${label(singleProductPrice("denemeKulubum")?.campaignCents, "dönem")}.`,
    bundles: `Dersle birlikte onlinedenemekulübüm. × Deneme Ligi ${label(lessonAndExam.periodTotal.payableCents, "dönem")}. Koçluk içeren birlikte kullanım seçeneklerinde ücret ve koşullar ön görüşmede netleşir; ilk ay teklifi tek başına koçluk içindir. Aylık ve dönemlik tutarlar ayrı gösterilir.`,
  };
}
