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

/** Pazarlama metinleri de paket kurucunun hesapladığı tutarları kullanır. */
export function getPublicPricingCopy() {
  const formats = lessonFormatPrices();
  const lessonAndCoach = resolvePackageQuote({ ...base, dershanem: true, kocum: true });
  const lessonAndExam = resolvePackageQuote({ ...base, dershanem: true, denemeKulubum: true });
  const coachAndExam = resolvePackageQuote({ ...base, kocum: true, denemeKulubum: true });
  const coachCents = singleProductPrice("kocum")?.campaignCents;
  const coachWithLesson = coachCents == null || lessonAndCoach.monthlyTotal.bundleDiscountCents == null
    ? null
    : coachCents - lessonAndCoach.monthlyTotal.bundleDiscountCents;

  return {
    standalone: `Grup dersi ${label(formats.grup.campaignCents, "ay")}, birebir ders ${label(formats.birebir.campaignCents, "ay")}, onlinekoçum. ${label(coachCents, "ay")} ve onlinedenemekulübüm. ${label(singleProductPrice("denemeKulubum")?.campaignCents, "dönem")}.`,
    bundles: `Dersle birlikte onlinekoçum. ${label(coachWithLesson, "ay")}, onlinedenemekulübüm. ${label(lessonAndExam.periodTotal.payableCents, "dönem")}. Yalnız koçlukla birlikte onlinedenemekulübüm. ${label(coachAndExam.periodTotal.payableCents, "dönem")}. Aylık ve dönemlik tutarlar ayrı gösterilir.`,
  };
}
