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

export type DinoQuestion = {
  key: string;
  audience: DinoAudience;
  /** Tasarımdaki öneri prompt metni / contextual action etiketi. */
  label: string;
  scope: DinoScope;
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
    audience: "STUDENT",
    label: "Bu hafta neye çalışmalıyım?",
    scope: "PLAN",
  },
  {
    key: "student_subject_trend",
    audience: "STUDENT",
    label: "Derslerimde neden gerileme var?",
    scope: "SUBJECT_TREND",
  },
  {
    key: "student_review",
    audience: "STUDENT",
    label: "Hangi konuları tekrar etmeliyim?",
    scope: "REVIEW",
  },
  {
    key: "student_plan_why",
    audience: "STUDENT",
    label: "Planım neden böyle?",
    scope: "PLAN",
  },
  {
    key: "student_exam",
    audience: "STUDENT",
    label: "Son denememi açıkla",
    scope: "LAST_EXAM",
  },
  {
    key: "student_week",
    audience: "STUDENT",
    label: "Bu hafta hangi veriler öne çıkıyor?",
    scope: "WEEK",
  },
  {
    key: "student_focus",
    audience: "STUDENT",
    label: "Bu haftaki planım ne söylüyor?",
    scope: "COACHING",
  },
  {
    key: "student_nba_reason",
    audience: "STUDENT",
    label: "Bu neden öneriliyor?",
    scope: "WEEK",
    internal: true,
  },
  {
    key: "student_odk_reason",
    audience: "STUDENT",
    label: "Bu sonuç ne söylüyor?",
    scope: "LAST_EXAM",
    internal: true,
  },

  // ── Veli ─────────────────────────────────────────────────────────────
  {
    key: "parent_week",
    audience: "PARENT",
    label: "Bu hafta çocuğum nasıl gidiyor?",
    scope: "WEEK",
  },
  {
    key: "parent_support",
    audience: "PARENT",
    label: "En çok desteğe nerede ihtiyacı var?",
    scope: "SUBJECT_TREND",
  },
  {
    key: "parent_exam",
    audience: "PARENT",
    label: "Son denemede ne değişti?",
    scope: "LAST_EXAM",
  },

  // ── Öğretmen ─────────────────────────────────────────────────────────
  {
    key: "teacher_today",
    audience: "TEACHER",
    label: "Bugün hangi öğrencilerle ilgilenmeliyim?",
    scope: "TEACHER_ATTENTION",
    requiresStudent: false,
  },
  {
    key: "teacher_student_risk",
    audience: "TEACHER",
    label: "Bu öğrencinin risk nedenlerini özetle",
    scope: "WEEK",
  },
  {
    key: "teacher_group_week",
    audience: "TEACHER",
    label: "Bu grubun son iki haftasını özetle",
    scope: "GROUP_WEEK",
    requiresStudent: false,
  },
  {
    key: "teacher_meeting",
    audience: "TEACHER",
    label: "Öğrenci için görüşme taslağı hazırla",
    scope: "MEETING_DRAFT",
  },
  {
    key: "teacher_prep",
    audience: "TEACHER",
    label: "Görüşme özeti neye dayanıyor?",
    scope: "COACHING",
  },
  {
    key: "teacher_week",
    audience: "TEACHER",
    label: "Bu sinyal neye dayanıyor?",
    scope: "WEEK",
  },
] as const;

export function findDinoQuestion(key: string, audience: DinoAudience): DinoQuestion | null {
  return DINO_QUESTIONS.find((q) => q.key === key && q.audience === audience) ?? null;
}

export function dinoQuestionsFor(audience: DinoAudience): DinoQuestion[] {
  return DINO_QUESTIONS.filter((q) => q.audience === audience && !q.internal);
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
