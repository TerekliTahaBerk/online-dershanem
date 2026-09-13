/**
 * PAKET KURUCU — MERKEZÎ FİYAT VE KAPSAM KONFİGÜRASYONU
 *
 * Onaylı tasarım (Web.dc.html → "Paket kurucu · durum listesi") fiyatı bilerek
 * dışarıdan alır:
 *
 *   "Fiyat verisi — X/Y/Z ve kombinasyon fiyatları dışarıdan; kurgu her orana uyar"
 *
 * Bu dosya o "dışarısı"dır. Arayüzde hiçbir fiyat veya indirim oranı
 * hesaplanmaz/uydurulmaz; hepsi buradan okunur.
 *
 * ── FİYAT MODELİ ──────────────────────────────────────────────────────────
 * Her kalemin İKİ fiyatı vardır:
 *   - `listCents`     kampanya öncesi liste fiyatı (üstü çizili gösterilir)
 *   - `campaignCents` bugün ödenecek kampanya fiyatı
 *
 * Buna ek olarak birden fazla ürün seçildiğinde faturalama dönemine açıkça
 * atanmış PAKET İNDİRİMİ uygulanır. Aylık ve dönemlik para tutarları hiçbir
 * zaman tek bir toplamda birleştirilmez.
 *
 * ── HUKUKİ NOT (üstü çizili fiyat) ────────────────────────────────────────
 * Türkiye'de Fiyat Etiketi Yönetmeliği, indirimli satışta gösterilen üstü
 * çizili fiyatın indirimden ÖNCEKİ 30 gün içinde gerçekten uygulanmış olmasını
 * arar. Buradaki `listCents` değerleri bu yüzden "gerçek liste fiyatı" olarak
 * ele alınmalıdır; kampanya bittiğinde ürünün bu fiyattan satılabiliyor olması
 * gerekir. Rakamlar ticari karardır, kod tarafında serbestçe değiştirilebilir.
 *
 * ── DURUM (2026-08-15) ────────────────────────────────────────────────────
 * Tüm fiyatlar tanımlı. Online Dershanem'in grup ders fiyatı burada
 * KOPYALANMAZ: ödeme-kritik katalogdan (`lib/content.ts` →
 * `subjectPackageGroups` → "Matematik Ders Paketi") okunur, çünkü checkout
 * fiyat doğrulaması da aynı kaynağı kullanır. Diğer kalemlerin henüz bir
 * checkout SKU'su olmadığı için değerleri burada durur.
 */
import { getPackageListPriceCents, getPackagePriceCents } from "@/lib/content";

/** Kuruş cinsinden fiyat; `null` ise henüz belirlenmemiştir. */
export type PriceCents = number | null;

/** Bir kalemin liste ve kampanya fiyatı. */
export type PricePair = {
  /** Kampanya öncesi liste fiyatı. `null` ise üstü çizili fiyat gösterilmez. */
  listCents: PriceCents;
  /** Bugün ödenecek fiyat. `null` ise fiyat belirlenmemiştir. */
  campaignCents: PriceCents;
};

export type ExamTrack = "LGS" | "YKS";
export type LessonFormat = "grup" | "birebir";
export type ProductKey = "dershanem" | "kocum" | "denemeKulubum";

/** Faturalama dönemi — her para tutarı tam olarak bir bucket'a aittir. */
export type BillingPeriod = "monthly" | "period" | "oneTime";

/**
 * Online Dershanem grup dersinin fiyatı ödeme-kritik katalogdan okunur.
 * Katalog LGS ve YKS için ayrı kayıt tutar; ikisi de aynı `subject` anahtarını
 * kullanır. Katalog değişirse burası kendiliğinden takip eder.
 *
 * `subject` anahtarı tarihsel olarak "Matematik Ders Paketi"dir ve sepet
 * kimliğidir — DEĞİŞTİRME (bkz. `lib/od/checkout.ts`). Ders fiyatı derse göre
 * değişmediği için bu tek anahtar tüm dersleri fiyatlar.
 */
const GROUP_LESSON_CATALOG_SUBJECT = "Matematik Ders Paketi";

/**
 * Grup dersi fiyatı. `exam` verilmezse LGS ve YKS aynı fiyattaysa o ortak fiyat
 * döner; ayrışmışlarsa `null` döner ve arayüz sınav seçilene kadar rakam basmaz.
 */
function groupLessonPrice(exam: ExamTrack | null): PricePair {
  if (exam === null) {
    const lgs = groupLessonPrice("LGS");
    const yks = groupLessonPrice("YKS");
    return lgs.campaignCents !== null && lgs.campaignCents === yks.campaignCents
      ? { ...lgs, listCents: lgs.listCents === yks.listCents ? lgs.listCents : null }
      : { listCents: null, campaignCents: null };
  }

  const campaign = getPackagePriceCents(exam, GROUP_LESSON_CATALOG_SUBJECT);
  const list = getPackageListPriceCents(exam, GROUP_LESSON_CATALOG_SUBJECT);
  return {
    campaignCents: campaign > 0 ? campaign : null,
    listCents: list > campaign ? list : null,
  };
}

/**
 * Birebir özel ders — aylık paket.
 *
 * Grup dersiyle aynı ritimde (aylık) satılır; tek farkı öğretmenin
 * tek öğrenciye ayrılmasıdır.
 */
const ONE_TO_ONE_LESSON: PricePair = {
  listCents: 650_000, // ₺6.500/ay
  campaignCents: 450_000, // ₺4.500/ay
};

/**
 * Online Koçum — aylık koçluk.
 *
 * Koçluk derse bağlı değildir; öğrencinin TÜM derslerini kapsayan tek bir
 * kalemdir, bu yüzden ders sayısıyla çarpılmaz.
 */
const COACHING: PricePair = {
  listCents: 350_000, // ₺3.500/ay
  campaignCents: 250_000, // ₺2.500/ay
};

/**
 * Online Deneme Kulübüm — dönemsel.
 *
 * Aylık değil dönemsel faturalanır; özet ekranı bu farkı ayrıca yazar.
 */
const EXAM_CLUB: PricePair = {
  listCents: 150_000, // ₺1.500/dönem
  campaignCents: 100_000, // ₺1.000/dönem
};

/**
 * PAKET (KOMBİNASYON) İNDİRİMİ — yalnız atandığı billing bucket'ından düşer.
 *
 * Anahtar, seçili ürünlerin sabit sırada birleşimidir:
 * "dk" = Dershanem+Koçum, "dn" = Dershanem+Deneme, "kn" = Koçum+Deneme,
 * "dkn" = üçü birlikte.
 *
 * Bilinçli olarak KÜÇÜK tutulmuştur: asıl indirim kalem bazındaki kampanya
 * fiyatıdır; bu, birlikte almanın üstüne binen ek avantajdır.
 */
const BUNDLE_DISCOUNT_CENTS: Record<
  "dk" | "dn" | "kn" | "dkn",
  Readonly<Partial<Record<BillingPeriod, number>>>
> = {
  dk: { monthly: 50_000 },
  dn: { period: 25_000 },
  kn: { period: 25_000 },
  dkn: { monthly: 50_000, period: 25_000 },
};

/**
 * Ders listesi — paket kurucudaki "Dersini seç" ve "Ek ders ekle" alanlarını
 * besler.
 *
 * Ders fiyatı DERSE GÖRE DEĞİŞMEZ: hangi ders seçilirse seçilsin grup dersi
 * aynı, birebir ders aynı fiyattır. Bu yüzden burada fiyat yoktur; liste
 * yalnızca kapsamı anlatır.
 */
export const lessonSubjects: Record<ExamTrack, readonly string[]> = {
  LGS: [
    "Matematik",
    "Fen Bilimleri",
    "Türkçe",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
    "İngilizce",
    "Din Kültürü ve Ahlak Bilgisi",
  ],
  YKS: [
    "Matematik",
    "Türkçe",
    "Türk Dili ve Edebiyatı",
    "Fizik",
    "Kimya",
    "Biyoloji",
    "Tarih",
    "Coğrafya",
    "Felsefe",
    "İngilizce",
    "Din Kültürü ve Ahlak Bilgisi",
  ],
};

export const billingPeriods: Record<ProductKey, BillingPeriod> = {
  dershanem: "monthly",
  kocum: "monthly",
  denemeKulubum: "period",
};

export type BuilderSelection = {
  exam: ExamTrack | null;
  dershanem: boolean;
  kocum: boolean;
  denemeKulubum: boolean;
  format: LessonFormat;
  /** Paket fiyatına dahil olan tek ders. */
  subject: string | null;
  /** Ek dersler — her biri pakete eklenir. */
  extraSubjects: readonly string[];
};

export type QuoteLine = {
  product: ProductKey;
  label: string;
  selected: boolean;
  billing: BillingPeriod;
  /** Bu ürünün kampanya fiyatı; `null` ise tanımlı değil. */
  cents: PriceCents;
  /** Kampanya öncesi liste fiyatı; `null` ise üstü çizili fiyat basılmaz. */
  listCents: PriceCents;
};

export type BillingTotal = {
  billing: BillingPeriod;
  selectedLineCount: number;
  /** Bu dönemdeki seçili kalemlerin liste fiyatı. */
  listCents: PriceCents;
  /** Bu dönemdeki kalemlerin paket indirimi öncesi kampanya fiyatı. */
  campaignCents: PriceCents;
  campaignSavingsCents: PriceCents;
  /** Yalnız bu faturalama dönemine uygulanan birlikte alma indirimi. */
  bundleDiscountCents: PriceCents;
  /** Bu faturalama döneminde ödenecek tutar. */
  payableCents: PriceCents;
  /** Yalnız bu faturalama dönemindeki liste fiyatına göre avantaj. */
  savingsCents: PriceCents;
};

export type PackageQuote = {
  selectedCount: number;
  lines: QuoteLine[];
  monthlyTotal: BillingTotal;
  periodTotal: BillingTotal;
  oneTimeTotal: BillingTotal;
  /**
   * Fiyatın tam olarak hesaplanabildiği durum. `false` ise arayüz rakam
   * göstermez; ön görüşmeye yönlendirir.
   */
  priceResolved: boolean;
  /** Fiyatı tanımlı olmayan ve bu yüzden toplamı bloke eden kalemler. */
  missingPriceFor: ProductKey[];
};

const productLabels: Record<ProductKey, string> = {
  dershanem: "Online Dershanem",
  kocum: "Online Koçum",
  denemeKulubum: "Online Deneme Kulübüm",
};

/**
 * Dershanem kaleminin fiyatı: seçilen format × (1 dahil ders + ek dersler).
 *
 * Ders fiyatı ne derse ne de SINAVA göre değişir; ders SAYISI ile çarpılır.
 * Bu yüzden sınav seçilmeden de fiyat gösterilebilir — daha önce burada
 * `exam` yokken `null` dönülüyordu ve kart, fiyatı belliyken bile
 * "Fiyat ön görüşmede netleşir" yazıyordu.
 */
function dershanemLinePrice(selection: BuilderSelection): PricePair {
  const base =
    selection.format === "grup" ? groupLessonPrice(selection.exam) : ONE_TO_ONE_LESSON;

  const lessonCount = 1 + selection.extraSubjects.length;

  return {
    campaignCents:
      base.campaignCents === null ? null : base.campaignCents * lessonCount,
    listCents: base.listCents === null ? null : base.listCents * lessonCount,
  };
}

function bundleKey(selection: BuilderSelection): keyof typeof BUNDLE_DISCOUNT_CENTS | null {
  const { dershanem: d, kocum: k, denemeKulubum: n } = selection;
  if (d && k && n) return "dkn";
  if (d && k) return "dk";
  if (d && n) return "dn";
  if (k && n) return "kn";
  return null;
}

function resolveBillingTotal(
  billing: BillingPeriod,
  selectedLines: readonly QuoteLine[],
  bundleDiscountCents: number,
): BillingTotal {
  const lines = selectedLines.filter((line) => line.billing === billing);
  if (lines.length === 0) {
    return {
      billing,
      selectedLineCount: 0,
      listCents: 0,
      campaignCents: 0,
      campaignSavingsCents: 0,
      bundleDiscountCents: 0,
      payableCents: 0,
      savingsCents: 0,
    };
  }

  if (lines.some((line) => line.cents === null)) {
    return {
      billing,
      selectedLineCount: lines.length,
      listCents: null,
      campaignCents: null,
      campaignSavingsCents: null,
      bundleDiscountCents: null,
      payableCents: null,
      savingsCents: null,
    };
  }

  const campaignCents = lines.reduce((sum, line) => sum + (line.cents ?? 0), 0);
  const listCents = lines.reduce((sum, line) => sum + (line.listCents ?? line.cents ?? 0), 0);
  if (bundleDiscountCents > campaignCents) {
    throw new Error(`Paket indirimi ${billing} kampanya tutarını aşamaz.`);
  }

  const payableCents = campaignCents - bundleDiscountCents;
  return {
    billing,
    selectedLineCount: lines.length,
    listCents,
    campaignCents,
    campaignSavingsCents: listCents - campaignCents,
    bundleDiscountCents,
    payableCents,
    savingsCents: listCents - payableCents,
  };
}

/**
 * Seçime göre teklif üretir. Tasarımın 8 durumunu (0 seçim → 3 ürün) besler.
 */
export function resolvePackageQuote(selection: BuilderSelection): PackageQuote {
  const dershanem = dershanemLinePrice(selection);

  const lines: QuoteLine[] = [
    {
      product: "dershanem",
      label: productLabels.dershanem,
      selected: selection.dershanem,
      billing: billingPeriods.dershanem,
      cents: dershanem.campaignCents,
      listCents: dershanem.listCents,
    },
    {
      product: "kocum",
      label: productLabels.kocum,
      selected: selection.kocum,
      billing: billingPeriods.kocum,
      cents: COACHING.campaignCents,
      listCents: COACHING.listCents,
    },
    {
      product: "denemeKulubum",
      label: productLabels.denemeKulubum,
      selected: selection.denemeKulubum,
      billing: billingPeriods.denemeKulubum,
      cents: EXAM_CLUB.campaignCents,
      listCents: EXAM_CLUB.listCents,
    },
  ];

  const selectedLines = lines.filter((line) => line.selected);
  const selectedCount = selectedLines.length;
  const missingPriceFor = selectedLines
    .filter((line) => line.cents === null)
    .map((line) => line.product);

  const resolved = selectedCount > 0 && missingPriceFor.length === 0;
  const key = bundleKey(selection);
  const discounts = resolved && key ? BUNDLE_DISCOUNT_CENTS[key] : {};
  const monthlyTotal = resolveBillingTotal("monthly", selectedLines, discounts.monthly ?? 0);
  const periodTotal = resolveBillingTotal("period", selectedLines, discounts.period ?? 0);
  const oneTimeTotal = resolveBillingTotal("oneTime", selectedLines, discounts.oneTime ?? 0);

  return {
    selectedCount,
    lines,
    monthlyTotal,
    periodTotal,
    oneTimeTotal,
    priceResolved: resolved,
    missingPriceFor,
  };
}

/**
 * Kurucudaki seçim doğrudan satın alınabiliyor mu?
 *
 * Sitede checkout SKU'su OLAN tek yapılandırma, katalogdaki grup ders paketidir
 * (`<exam>` + "Matematik Ders Paketi"). Koçum ve Deneme Kulübü'nün, birebir
 * formatın ve ek derslerin karşılığı bir SKU yok — onlar ön görüşmeden
 * ilerler. Bu fonksiyon o sınırı TEK yerde tutar; arayüz kendi başına
 * "satın alınabilir" kararı vermez.
 *
 * Dönen `id`/`category`/`subject` sepet kimliğidir ve sunucudaki
 * `priceCatalogItems` ile birebir aynı anahtarları kullanır.
 */
export function resolveBuilderCheckout(selection: BuilderSelection): {
  id: string;
  name: string;
  category: ExamTrack;
  subject: string;
  priceCents: number;
  priceLabel: string;
} | null {
  if (selection.exam === null) return null;
  if (!selection.dershanem || selection.kocum || selection.denemeKulubum) return null;
  if (selection.format !== "grup") return null;
  if (selection.extraSubjects.length > 0) return null;

  const priceCents = getPackagePriceCents(selection.exam, GROUP_LESSON_CATALOG_SUBJECT);
  if (priceCents <= 0) return null;

  return {
    id: `${selection.exam}__${GROUP_LESSON_CATALOG_SUBJECT}`,
    name: `${selection.exam} ${GROUP_LESSON_CATALOG_SUBJECT}`,
    category: selection.exam,
    subject: GROUP_LESSON_CATALOG_SUBJECT,
    priceCents,
    priceLabel: `${formatCents(priceCents)}/ay`,
  };
}

/**
 * Ürün kartında kesin fiyat ancak tek başına satın alınabilir bir SKU'ya
 * bağlanabiliyorsa gösterilebilir. Koçum, Deneme Kulübü, birebir ve ek ders
 * için checkout SKU'su oluşana kadar bu fonksiyon `null` döner.
 */
export function resolveBuilderProductCheckout(
  selection: BuilderSelection,
  product: ProductKey,
): ReturnType<typeof resolveBuilderCheckout> {
  if (product !== "dershanem") return null;
  return resolveBuilderCheckout({
    ...selection,
    dershanem: true,
    kocum: false,
    denemeKulubum: false,
  });
}

/**
 * Ön görüşmeye giderken seçimi TAŞIR. Daha önce kurucunun CTA'sı düz
 * `/iletisim`'e gidiyordu ve kullanıcının kurduğu paket (sınav, format, dersler)
 * tamamen kayboluyordu.
 */
export function builderContactQuery(selection: BuilderSelection): string {
  const products = [
    selection.dershanem ? "Online Dershanem" : null,
    selection.kocum ? "Online Koçum" : null,
    selection.denemeKulubum ? "Online Deneme Kulübüm" : null,
  ].filter(Boolean) as string[];

  if (!products.length && selection.exam === null) return "";

  const lessons = selection.dershanem
    ? [selection.subject, ...selection.extraSubjects].filter(Boolean).join(", ")
    : "";
  const summary = [
    products.join(" + "),
    selection.dershanem ? (selection.format === "birebir" ? "birebir özel ders" : "maks. 4 kişilik grup") : null,
    lessons ? `dersler: ${lessons}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const params = new URLSearchParams();
  if (selection.exam) params.set("sinav", selection.exam);
  if (summary) params.set("paket", summary);
  if (products.length > 0 && resolveBuilderCheckout(selection) === null) {
    params.set("fiyat", "on_gorusme");
  }
  return params.toString() ? `?${params.toString()}` : "";
}

const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export function formatCents(cents: number): string {
  return tryFormatter.format(cents / 100);
}

/**
 * Liste ve kampanya fiyatından indirim yüzdesi. İkisi de tanımlı ve indirim
 * gerçekten pozitif değilse `null` döner — arayüz "%0 indirim" yazmaz.
 *
 * Bu bir TÜRETİLMİŞ GÖSTERİM değeridir: iki gerçek fiyattan hesaplanır,
 * uydurulmaz.
 */
export function discountPercent(listCents: PriceCents, campaignCents: PriceCents): number | null {
  if (listCents === null || campaignCents === null) return null;
  if (listCents <= campaignCents) return null;
  return Math.round(((listCents - campaignCents) / listCents) * 100);
}

/** Faturalama dönemi eki — tasarım: "/ ay" ve "/ dönem". */
export function billingSuffix(billing: BillingPeriod): string {
  if (billing === "monthly") return "/ ay";
  if (billing === "period") return "/ dönem";
  return "tek sefer";
}

/**
 * Ürün sayfalarındaki "TEK ÜRÜN FİYATI" kartı için etiketler.
 * Fiyat tanımlı değilse `null` döner ve arayüz rakam basmaz.
 *
 * Online Dershanem'in grup dersi LGS ve YKS'de aynı fiyattan satıldığı için
 * sınav seçimi olmadan da gösterilebilir; farklılaşırsa bu fonksiyon
 * sınav parametresi almalıdır.
 */
export function singleProductPriceLabel(
  product: ProductKey,
): { price: string; listPrice: string | null } | null {
  const pair = singleProductPrice(product);
  if (pair === null || pair.campaignCents === null) return null;

  return {
    price: formatCents(pair.campaignCents),
    listPrice: pair.listCents === null ? null : formatCents(pair.listCents),
  };
}

/** Tek ürün fiyatı — ürün sayfaları ve testler için. */
export function singleProductPrice(product: ProductKey): PricePair | null {
  if (product === "kocum") return COACHING;
  if (product === "denemeKulubum") return EXAM_CLUB;

  const group = groupLessonPrice(null);
  return group.campaignCents === null ? null : group;
}

/**
 * Ders formatlarının fiyatı — ürün sayfasında ikisini birden göstermek için.
 *
 * Online Dershanem'in iki formatı ayrı fiyatlanır ve ikisi de gerçek bir
 * fiyattır; sayfada yalnız grup fiyatını göstermek birebir dersi "fiyatı
 * belirsiz" gibi gösteriyordu.
 */
export function lessonFormatPrices(): Record<LessonFormat, PricePair> {
  return { grup: groupLessonPrice(null), birebir: ONE_TO_ONE_LESSON };
}
