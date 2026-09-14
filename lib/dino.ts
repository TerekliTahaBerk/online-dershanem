import { z } from "zod";
import { containsUnsafeEducationalClaim } from "@/lib/teacher-ai";

/**
 * DINO AI — soru kataloğu ve çıktı sözleşmesi.
 *
 * SERBEST METİN KABUL EDİLMEZ. Kullanıcı yazdığı cümleyi göndermez; tasarımdaki
 * öneri promptlarından birini SEÇER ve sunucuya yalnız o sorunun anahtarı gider.
 *
 * Ana prensip: Dino yeni gerçek üretmez. Panelde mevcut ve erişilebilir veriyi
 * açıklar. Deterministik özet her zaman birincil kaynaktır; model isteğe bağlı
 * yardımcı katmandır.
 */

export const DINO_PROMPT_VERSION = "dino-v2" as const;
export const DINO_MAX_OUTPUT_TOKENS = 500;
/** Modele giden kaynak satırı üst sınırı (maliyet + gürültü). */
export const DINO_MAX_SOURCES = 8;
/** Kaynak satırı başına karakter üst sınırı. */
export const DINO_MAX_SOURCE_CHARS = 280;

export const dinoAudienceSchema = z.enum(["STUDENT", "PARENT", "TEACHER"]);
export type DinoAudience = z.infer<typeof dinoAudienceSchema>;

/**
 * Hangi yapılandırılmış bağlamın toplanacağını belirleyen kapsam.
 * Ham DB dump gönderilmez; her scope deterministik satırlar üretir.
 */
export type DinoScope =
  | "WEEK"
  | "LAST_EXAM"
  | "COACHING"
  | "PLAN"
  | "REVIEW"
  | "OUTCOMES"
  | "SUBJECT_TREND"
  | "TEACHER_ATTENTION"
  | "GROUP_WEEK"
  | "MEETING_DRAFT";

/**
 * DINO SORU KATALOĞUNUN ÜRÜN KAPSAMI.
 *
 * Kodlar `Product.code` STRING'leridir (registry `products.code`), Prisma enum'u
 * değil: bir soru enum'a girmemiş registry ürünleri için de konumlanabilsin diye.
 *
 * VARSAYILAN KAPALI: her `DinoQuestion` hangi ürünlerde görünebileceğini AÇIKÇA
 * yazar. Registry'ye yeni bir ürün eklendiğinde hiçbir soru kendiliğinden
 * açılmaz; her soru için bilinçli bir satır gerekir. Aynı ilke
 * `lib/products/parent-visibility.ts` içinde de uygulanır.
 */

/**
 * ÖĞRETMEN YÜRÜTÜMLÜ K-12 ÜRÜNLERİ: canlı ders + yoklama, öğretmen ödevi,
 * grup/roster, koç görüşmesi ve veli yüzeyi bu ürünlerde vardır.
 */
export const DINO_COHORT_PRODUCTS = ["OD", "OK", "ODK"] as const;

/**
 * OTONOM (ÖĞRETMENSİZ) YETİŞKİN ÜRÜNLERİ: plan insan onayı beklemez
 * (`products.requires_plan_approval = false`), yoklama/ödev/grup/veli kavramı
 * yoktur. Dino burada yalnız sınav · kazanım · plan verisini açıklar.
 */
export const DINO_SELF_STUDY_PRODUCTS = ["KPSS"] as const;

/** Sınav · kazanım · plan kavramları her iki ürün ailesinde de ortaktır. */
export const DINO_ALL_PRODUCTS = [
  ...DINO_COHORT_PRODUCTS,
  ...DINO_SELF_STUDY_PRODUCTS,
] as const;

export type DinoQuestion = {
  key: string;
  audience: DinoAudience;
  /** Tasarımdaki öneri prompt metni / contextual action etiketi. */
  label: string;
  scope: DinoScope;
  /**
   * Bu sorunun görünebileceği ürün kodları (`Product.code`). Boş bırakılamaz;
   * listede olmayan bir ürün bağlamında soru NE MENÜDE ÇIKAR NE DE API'de çözülür.
   */
  applicableProducts: readonly string[];
  /** Panelde çip olarak görünmeyen, yalnız dahili explanation akışı için. */
  internal?: boolean;
  /**
   * Öğretmen soruları için öğrenci kimliği gerekir mi?
   * TEACHER_ATTENTION / GROUP_WEEK için false (roster kapsamı).
   */
  requiresStudent?: boolean;
};

export const DINO_QUESTIONS: readonly DinoQuestion[] = [
  // ── Öğrenci ──────────────────────────────────────────────────────────
  {
    key: "student_week_focus",
    applicableProducts: DINO_ALL_PRODUCTS,
    audience: "STUDENT",
    label: "Bu hafta neye çalışmalıyım?",
    scope: "PLAN",
  },
  {
    key: "student_subject_trend",
    applicableProducts: DINO_ALL_PRODUCTS,
    audience: "STUDENT",
    label: "Derslerimde neden gerileme var?",
    scope: "SUBJECT_TREND",
  },
  {
    key: "student_review",
    applicableProducts: DINO_ALL_PRODUCTS,
    audience: "STUDENT",
    label: "Hangi konuları tekrar etmeliyim?",
    scope: "REVIEW",
  },
  {
    key: "student_plan_why",
    applicableProducts: DINO_ALL_PRODUCTS,
    audience: "STUDENT",
    label: "Planım neden böyle?",
    scope: "PLAN",
  },
  {
    key: "student_exam",
    applicableProducts: DINO_ALL_PRODUCTS,
    audience: "STUDENT",
    label: "Son denememi açıkla",
    scope: "LAST_EXAM",
  },
  {
    key: "student_week",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "STUDENT",
    label: "Bu hafta hangi veriler öne çıkıyor?",
    scope: "WEEK",
  },
  {
    key: "student_focus",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "STUDENT",
    label: "Bu haftaki planım ne söylüyor?",
    scope: "COACHING",
  },
  {
    key: "student_nba_reason",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "STUDENT",
    label: "Bu neden öneriliyor?",
    scope: "WEEK",
    internal: true,
  },
  {
    key: "student_odk_reason",
    applicableProducts: DINO_ALL_PRODUCTS,
    audience: "STUDENT",
    label: "Bu sonuç ne söylüyor?",
    scope: "LAST_EXAM",
    internal: true,
  },

  // ── Veli ─────────────────────────────────────────────────────────────
  // VELİ SORULARI YALNIZ VELİ-GÖRÜNÜR ÜRÜNLERDE. KPSS veli-free'dir
  // (`lib/products/parent-visibility.ts`); veli yüzeyi hiç doğmadığı için
  // veliye yönelik hiçbir soru KPSS bağlamında sunulamaz. Bu kural yapısal
  // olarak da doğrulanır (bkz. `lib/dino-products.test.ts`).
  {
    key: "parent_week",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "PARENT",
    label: "Bu hafta çocuğum nasıl gidiyor?",
    scope: "WEEK",
  },
  {
    key: "parent_support",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "PARENT",
    label: "En çok desteğe nerede ihtiyacı var?",
    scope: "SUBJECT_TREND",
  },
  {
    key: "parent_exam",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "PARENT",
    label: "Son denemede ne değişti?",
    scope: "LAST_EXAM",
  },

  // ── Öğretmen ─────────────────────────────────────────────────────────
  // ÖĞRETMEN SORULARI YALNIZ ÖĞRETMEN YÜRÜTÜMLÜ ÜRÜNLERDE: roster, grup,
  // dikkat kutusu ve görüşme taslağı KPSS'de karşılığı olmayan kavramlar.
  // Personel her zaman OD/OK/ODK erişimiyle geldiği için öğretmen menüsü
  // pratikte değişmez.
  {
    key: "teacher_today",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "TEACHER",
    label: "Bugün hangi öğrencilerle ilgilenmeliyim?",
    scope: "TEACHER_ATTENTION",
    requiresStudent: false,
  },
  {
    key: "teacher_student_risk",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "TEACHER",
    label: "Bu öğrencinin risk nedenlerini özetle",
    scope: "WEEK",
  },
  {
    key: "teacher_group_week",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "TEACHER",
    label: "Bu grubun son iki haftasını özetle",
    scope: "GROUP_WEEK",
    requiresStudent: false,
  },
  {
    key: "teacher_meeting",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "TEACHER",
    label: "Öğrenci için görüşme taslağı hazırla",
    scope: "MEETING_DRAFT",
  },
  {
    key: "teacher_prep",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "TEACHER",
    label: "Görüşme özeti neye dayanıyor?",
    scope: "COACHING",
  },
  {
    key: "teacher_week",
    applicableProducts: DINO_COHORT_PRODUCTS,
    audience: "TEACHER",
    label: "Bu sinyal neye dayanıyor?",
    scope: "WEEK",
  },
] as const;

export function findDinoQuestion(key: string, audience: DinoAudience): DinoQuestion | null {
  return DINO_QUESTIONS.find((q) => q.key === key && q.audience === audience) ?? null;
}

/**
 * Ürün bağlamından BAĞIMSIZ tam katalog. Yeni yüzeyler ürün bağlamını bilen
 * `dinoQuestionsForProducts` kullanmalıdır; bu fonksiyon katalog testleri ve
 * ürün kavramı olmayan çağrılar için kalır.
 */
export function dinoQuestionsFor(audience: DinoAudience): DinoQuestion[] {
  return DINO_QUESTIONS.filter((q) => q.audience === audience && !q.internal);
}

/** Soru, verilen ürün bağlamlarının EN AZ BİRİNDE tanımlı mı? */
export function dinoQuestionAppliesToProducts(
  question: DinoQuestion,
  productCodes: readonly string[],
): boolean {
  return productCodes.some((code) => question.applicableProducts.includes(code));
}

/**
 * Panelde gösterilecek soru menüsü: rol + ürün bağlamı.
 *
 * Ürün bağlamı çağıranın ÜYELİKLERİNDEN türetilir, istekten değil. Yalnız KPSS
 * üyeliği olan bir kullanıcıya K-12'ye özgü sorular (yoklama/koç/grup/veli)
 * hiç sunulmaz; OD/OK/ODK kullanıcısının menüsü aynen korunur.
 */
export function dinoQuestionsForProducts(
  audience: DinoAudience,
  productCodes: readonly string[],
): DinoQuestion[] {
  return dinoQuestionsFor(audience).filter((q) => dinoQuestionAppliesToProducts(q, productCodes));
}

export function dinoQuestionRequiresStudent(question: DinoQuestion): boolean {
  if (question.audience !== "TEACHER") return true;
  return question.requiresStudent !== false;
}

/* ── Çıktı sözleşmesi ────────────────────────────────────────────────── */

export const dinoAnswerSchema = z
  .object({
    text: z.string().trim().min(20).max(900),
    citations: z.array(z.string().trim().min(1).max(60)).min(1).max(6),
  })
  .strict();
export type DinoAnswerContent = z.infer<typeof dinoAnswerSchema>;

export type DinoSourceRow = { id: string; label: string; text: string };

export type SafeDinoSource = {
  audience: DinoAudience;
  questionKey: string;
  questionLabel: string;
  sources: DinoSourceRow[];
};

/**
 * Model çıktısını kabul etmeden önceki son kapı.
 *
 * `teacher-ai` ile AYNI kuralları uygular: şema, yalnız verilen kaynaklara
 * atıf, ve tanı/sıralama/garanti/bağlantı içermeyen dil.
 */
export function validateDinoOutput(content: unknown, allowedSourceIds: string[]) {
  const parsed = dinoAnswerSchema.safeParse(content);
  if (!parsed.success) return { ok: false as const, reason: "SCHEMA" as const };
  if (parsed.data.citations.some((c) => !allowedSourceIds.includes(c))) {
    return { ok: false as const, reason: "UNSUPPORTED_CITATION" as const };
  }
  if (containsUnsafeEducationalClaim(parsed.data.text)) {
    return { ok: false as const, reason: "UNSAFE_CONTENT" as const };
  }
  return { ok: true as const, content: parsed.data };
}

/**
 * Model çağrılamadığında gösterilecek DÜRÜST yedek.
 *
 * Uydurma yorum üretmez; yalnız toplanan kaynakları sadeleştirip listeler ve
 * bunun bir model yanıtı OLMADIĞINI söyler.
 */
export function dinoFallbackAnswer(source: SafeDinoSource): DinoAnswerContent {
  const rows = source.sources.slice(0, 4);
  const listed = rows.map((r) => `${r.label}: ${r.text}`).join(" · ");
  return {
    text: listed
      ? `Dino açıklamayı şu anda hazırlayamadı. Dayanakları yine de görebilirsin: ${listed}`
      : "Bu konuda açıklama yapmak için yeterli dayanak yok.",
    citations: rows.length ? rows.map((r) => r.id) : ["NO_DATA"],
  };
}
