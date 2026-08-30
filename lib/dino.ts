import { z } from "zod";
import { containsUnsafeEducationalClaim } from "@/lib/teacher-ai";

/**
 * DINO AI — soru kataloğu ve çıktı sözleşmesi.
 *
 * SERBEST METİN KABUL EDİLMEZ. Kullanıcı yazdığı cümleyi göndermez; tasarımdaki
 * öneri promptlarından birini SEÇER ve sunucuya yalnız o sorunun anahtarı gider.
 *
 * Sebep tek cümlede: serbest metin, öğrenci verisiyle çalışan bir modele
 * kullanıcı tarafından kontrol edilen talimat sokmanın en kolay yoludur. İzin
 * listesi sayesinde her soru için hangi verinin toplanacağı ÖNCEDEN bellidir ve
 * çıktı, verilen kaynaklara atıf zorunluluğuyla doğrulanabilir. Aynı gerekçe
 * `teacher-ai` tarafında da görev tipini iki seçenekle sınırlıyor.
 *
 * Sohbet HİSSİ korunur (tasarımdaki prompt çipleri + yanıt balonu); serbest
 * yazım alanı bilinçli olarak yoktur.
 */

export const DINO_PROMPT_VERSION = "dino-v1" as const;
export const DINO_MAX_OUTPUT_TOKENS = 500;

export const dinoAudienceSchema = z.enum(["STUDENT", "PARENT", "TEACHER"]);
export type DinoAudience = z.infer<typeof dinoAudienceSchema>;

/** Hangi verinin toplanacağını belirleyen kapsam etiketi. */
export type DinoScope =
  | "WEEK"        // ders katılımı + plan görevleri
  | "LAST_EXAM"   // son deneme bölümleri
  | "COACHING";   // koçluk planı + görüşme + hedefler

export type DinoQuestion = {
  key: string;
  audience: DinoAudience;
  /** Tasarımdaki öneri prompt metni. */
  label: string;
  scope: DinoScope;
};

export const DINO_QUESTIONS: readonly DinoQuestion[] = [
  { key: "student_week", audience: "STUDENT", label: "Bu hafta nasıl gidiyorum?", scope: "WEEK" },
  { key: "student_exam", audience: "STUDENT", label: "Son denemem ne söylüyor?", scope: "LAST_EXAM" },
  { key: "student_focus", audience: "STUDENT", label: "Bu hafta neye odaklanmalıyım?", scope: "COACHING" },

  { key: "parent_week", audience: "PARENT", label: "Çocuğum bu hafta nasıl gitti?", scope: "WEEK" },
  { key: "parent_exam", audience: "PARENT", label: "Son deneme sonucunu sade anlat", scope: "LAST_EXAM" },

  { key: "teacher_prep", audience: "TEACHER", label: "Görüşmeye hazırlık özeti", scope: "COACHING" },
  { key: "teacher_week", audience: "TEACHER", label: "Bu öğrencide dikkat edilmesi gerekenler", scope: "WEEK" },
] as const;

export function findDinoQuestion(key: string, audience: DinoAudience): DinoQuestion | null {
  return DINO_QUESTIONS.find((q) => q.key === key && q.audience === audience) ?? null;
}

export function dinoQuestionsFor(audience: DinoAudience): DinoQuestion[] {
  return DINO_QUESTIONS.filter((q) => q.audience === audience);
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

export type NextBestActionAudience = DinoAudience;
export type NextBestActionAction =
  | { type: "OPEN_PLAN"; href: string }
  | { type: "OPEN_REVIEW"; href: string }
  | { type: "CONTACT_STUDENT"; studentId: string }
  | { type: "OPEN_INTERVENTION"; href: string }
  | { type: "OPEN_DIGEST"; href: string }
  | { type: "ASK_QUESTION"; prompt: string };

export type NextBestAction = {
  key: string;
  audience: NextBestActionAudience;
  priority: number;
  title: string;
  explanation: string;
  action: NextBestActionAction;
  evidenceRefs: DinoSourceRow[];
  generatedAt: Date;
  expiresAt?: Date;
};

export function buildNextBestActions(source: SafeDinoSource): NextBestAction[] {
  const evidenceRefs = source.sources.slice(0, 3);
  const base = source.sources.map((row) => row.text).join(" ");
  const planHref = source.audience === "STUDENT" ? "/panel/ogrenci/plan" : "/panel/ogretmen/plan";
  const reviewHref = source.audience === "STUDENT" ? "/panel/ogrenci/tekrar" : "/panel/ogretmen/tekrar";
  const digestHref = source.audience === "PARENT" ? "/panel/veli/haftalik" : "/panel/ogrenci/haftalik";
  const interventionHref = source.audience === "TEACHER" ? "/panel/ogretmen/mudahale" : "/panel/yonetim/mudahale";
  return [
    {
      key: `${source.questionKey}:plan`,
      audience: source.audience,
      priority: 90,
      title: source.audience === "PARENT" ? "Bu hafta tek bir küçük destek seç" : "Bugün ilk olarak plana gir",
      explanation: source.sources.length ? `Kayıtlarda plan odaklı sinyal var: ${base.slice(0, 180)}` : "Planı destekleyecek veri sınırlı.",
      action: { type: "OPEN_PLAN", href: planHref },
      evidenceRefs,
      generatedAt: new Date(),
    },
    {
      key: `${source.questionKey}:review`,
      audience: source.audience,
      priority: 82,
      title: source.audience === "STUDENT" ? "Kısa tekrar için tek konu seç" : "Bir tekrar konusunu birlikte netleştir",
      explanation: source.sources.length ? `Tekrar için en yakın kanıtlar: ${base.slice(0, 180)}` : "Tekrar için dayanak az.",
      action: { type: "OPEN_REVIEW", href: reviewHref },
      evidenceRefs,
      generatedAt: new Date(),
    },
    {
      key: `${source.questionKey}:digest`,
      audience: source.audience,
      priority: 74,
      title: source.audience === "PARENT" ? "Sakin özetini aç" : "Sakin özetini kontrol et",
      explanation: "Özet, AI olmasa da son veriden türetilmiş kısa yönlendirme sunar.",
      action: { type: "OPEN_DIGEST", href: digestHref },
      evidenceRefs,
      generatedAt: new Date(),
    },
    {
      key: `${source.questionKey}:intervention`,
      audience: source.audience,
      priority: source.audience === "TEACHER" ? 88 : 60,
      title: source.audience === "TEACHER" ? "Müdahale ekranını aç" : "Gerekirse öğretmene ilet",
      explanation: "İnsan takibi gerekiyorsa açıklanabilir müdahale listesi doğru yüzeydir.",
      action: source.audience === "TEACHER" ? { type: "OPEN_INTERVENTION", href: interventionHref } : { type: "ASK_QUESTION", prompt: "Bu konuda kısa bir insan takibi ister misin?" },
      evidenceRefs,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    },
  ];
}

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
 * bunun bir model yanıtı OLMADIĞINI söyler. Tasarımın "Dino yorumu" balonu boş
 * kalmaz ama okuyucu neyle karşı karşıya olduğunu bilir.
 */
export function dinoFallbackAnswer(source: SafeDinoSource): DinoAnswerContent {
  const rows = source.sources.slice(0, 4);
  const listed = rows.map((r) => `${r.label}: ${r.text}`).join(" · ");
  return {
    text: listed
      ? `Şu an yorum üretilemiyor; aşağıdaki kayıtlar olduğu gibi listelendi. ${listed}`
      : "Şu an yorum üretilemiyor ve bu soru için kayıtlı veri bulunamadı.",
    citations: rows.length ? rows.map((r) => r.id) : ["NO_DATA"],
  };
}

export function dinoNextBestActionFallback(source: SafeDinoSource) {
  return buildNextBestActions(source);
}
