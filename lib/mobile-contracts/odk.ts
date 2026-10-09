/**
 * MOBİL SÖZLEŞME — M4 Deneme Ligi (ODK) öğrenci uçları.
 *
 * Her uç için TİP (sunucu yanıtı bu tipe göre yazılır) + DOĞRULAYICI (mobil,
 * yanıtı uygulama durumuna almadan önce çalıştırır).
 *
 * GÜVENLİK: Bu sözleşmelerde ham deneme kaydı, cevap listesi, sürüm ayarı,
 * dosya yolu, bütünlük (integrity) bayrağı, Meet bağlantısı ve başka
 * öğrenciye ait veri YOKTUR. Soru başına doğru cevap (`correctOption`) yalnız
 * cevap anahtarı politikası açıkken (`answerKey.available`) doludur.
 * Durumlar (`state`) sunucunun `studentExamState` kararıdır; istemci türetmez.
 *
 * Bağımlılıksız; yalnız bu dizindeki dosyalardan göreli içe aktarma.
 */

import type { ContractResult } from "./bootstrap";
import { check, v, type Infer } from "./validate";

export const MOBILE_ODK_CONTRACT_VERSION = 1 as const;

export const ODK_EXAM_STATE_KEYS = ["IN_PROGRESS", "AVAILABLE", "UPCOMING", "WAITING_RESULT", "RESULT_RELEASED", "MISSED", "CLOSED"] as const;
export type OdkExamStateKey = (typeof ODK_EXAM_STATE_KEYS)[number];
export const ODK_EXAM_TABS = ["yaklasan", "acik", "tamamlanan"] as const;
export const ODK_LIST_VIEWS = ["tumu", "yaklasan", "acik", "tamamlanan"] as const;
export type OdkListView = (typeof ODK_LIST_VIEWS)[number];
const TONES = ["neutral", "info", "success", "warning", "critical"] as const;

const examState = v.object({
  key: v.oneOf(ODK_EXAM_STATE_KEYS),
  label: v.string(),
  tone: v.oneOf(TONES),
  actionLabel: v.string(),
  tab: v.oneOf(ODK_EXAM_TABS),
});
export type MobileOdkExamState = Infer<typeof examState>;

const examRow = v.object({
  id: v.nonEmpty(),
  title: v.string(),
  /** Sınav ailesi kodu (kayıt defterinden; LGS/TYT/AYT dışı aileler de olabilir). */
  family: v.string(),
  startsAt: v.nullable(v.iso()),
  endsAt: v.nullable(v.iso()),
  durationMinutes: v.nullable(v.int(0)),
  state: examState,
  /** Yalnız RESULT_RELEASED + yayınlanmış skor. */
  net: v.nullable(v.number()),
  /** Yalnız IN_PROGRESS: sunucu süresinin bittiği an. */
  deadlineAt: v.nullable(v.iso()),
});
export type MobileOdkExamRow = Infer<typeof examRow>;

/* GET /api/odk/student/exams?gorunum= */
const examList = v.object({
  contractVersion: v.literal(MOBILE_ODK_CONTRACT_VERSION),
  generatedAt: v.iso(),
  view: v.oneOf(ODK_LIST_VIEWS),
  counts: v.object({ tumu: v.int(0), yaklasan: v.int(0), acik: v.int(0), tamamlanan: v.int(0) }),
  active: v.nullable(examRow),
  exams: v.array(examRow),
  /** Okuma sınırı aşıldı: yalnız en yeni `limit` deneme gösteriliyor. */
  truncated: v.boolean(),
  limit: v.int(1),
});
export type MobileOdkExamList = Infer<typeof examList>;
export function parseOdkExamList(input: unknown): ContractResult<MobileOdkExamList> {
  return check(examList, input);
}

/* GET /api/odk/student/home */
const resultRow = v.object({
  examId: v.nonEmpty(),
  title: v.string(),
  family: v.string(),
  at: v.iso(),
  net: v.number(),
  /** Aynı aileden bir önceki açıklanmış sonuca göre; ilkse null. */
  delta: v.nullable(v.number()),
});
export type MobileOdkResultRow = Infer<typeof resultRow>;

const home = v.object({
  contractVersion: v.literal(MOBILE_ODK_CONTRACT_VERSION),
  generatedAt: v.iso(),
  next: v.nullable(examRow),
  results: v.array(resultRow),
  resultsTotal: v.int(0),
  trend: v.nullable(v.object({ family: v.string(), points: v.array(resultRow) })),
  focus: v.nullable(
    v.object({
      examId: v.nonEmpty(),
      examTitle: v.string(),
      items: v.array(v.object({ code: v.string(), title: v.string(), accuracy: v.number(), questionCount: v.int(0) })),
    }),
  ),
});
export type MobileOdkHome = Infer<typeof home>;
export function parseOdkHome(input: unknown): ContractResult<MobileOdkHome> {
  return check(home, input);
}

/* GET /api/odk/student/exams/[id] */
const examDetail = v.object({
  contractVersion: v.literal(MOBILE_ODK_CONTRACT_VERSION),
  serverNow: v.iso(),
  exam: v.object({
    id: v.nonEmpty(),
    title: v.string(),
    family: v.string(),
    startsAt: v.nullable(v.iso()),
    endsAt: v.nullable(v.iso()),
    lateEntryMinutes: v.int(0),
    attemptLimit: v.int(0),
    durationMinutes: v.int(0),
    questionCount: v.int(0),
    sections: v.array(v.object({ code: v.string(), title: v.string(), questionCount: v.int(0) })),
    /** Çok oturumlu sınavın GERÇEK planı (sürüm ayarından); tek oturumda null. */
    sessionPlan: v.nullable(
      v.array(v.object({ key: v.string(), title: v.string(), durationMinutes: v.int(0), breakAfterMinutes: v.int(0), sectionTitles: v.array(v.string()) })),
    ),
    sessionTotalMinutes: v.nullable(v.int(0)),
    meetRequired: v.boolean(),
  }),
  state: examState,
  /** Başlatma kapalıysa sunucunun nedeni (`attemptStartError`). */
  startBlockedReason: v.nullable(v.string()),
  attempt: v.nullable(
    v.object({
      inProgress: v.boolean(),
      deadlineAt: v.nullable(v.iso()),
      submittedAt: v.nullable(v.iso()),
      /** Süre doldu; teslim sunucuda işlenecek (mobil okuma yazma yapmaz). */
      expired: v.boolean(),
    }),
  ),
  resultAvailable: v.boolean(),
  /** Web sınav ekranının yolu (yalnız tarayıcıda açmak için; token taşımaz). */
  webPath: v.string(),
});
export type MobileOdkExamDetail = Infer<typeof examDetail>;
export function parseOdkExamDetail(input: unknown): ContractResult<MobileOdkExamDetail> {
  return check(examDetail, input);
}

/* GET /api/odk/student/exams/[id]/result */
export const ODK_QUESTION_RESULTS = ["CORRECT", "WRONG", "BLANK"] as const;

const recommendationTarget = v.union("type", {
  "yon-plan": v.object({ type: v.literal("yon-plan") }),
  "od-review": v.object({ type: v.literal("od-review") }),
  "od-recovery": v.object({ type: v.literal("od-recovery"), lessonId: v.nonEmpty() }),
  "answer-key": v.object({ type: v.literal("answer-key") }),
  none: v.object({ type: v.literal("none") }),
});
export type MobileOdkRecommendationTarget = Infer<typeof recommendationTarget>;

const result = v.object({
  contractVersion: v.literal(MOBILE_ODK_CONTRACT_VERSION),
  exam: v.object({ id: v.nonEmpty(), title: v.string(), family: v.string(), resultsReleasedAt: v.nullable(v.iso()) }),
  summary: v.object({
    totalNet: v.number(),
    correct: v.int(0),
    wrong: v.int(0),
    blank: v.int(0),
    activeDurationMs: v.nullable(v.int(0)),
    delta: v.nullable(v.number()),
    previousTitle: v.nullable(v.string()),
  }),
  /** AYT + bilinen alan: "Benim alanım" görünümü. Bölüm/soru `inTrack` bayrağını sunucu hesaplar. */
  track: v.nullable(v.object({ code: v.string(), label: v.string(), trackNet: v.number() })),
  sections: v.array(
    v.object({ code: v.nullable(v.string()), title: v.string(), correct: v.nullable(v.int(0)), wrong: v.nullable(v.int(0)), blank: v.nullable(v.int(0)), net: v.nullable(v.number()), inTrack: v.boolean() }),
  ),
  questions: v.array(
    v.object({
      id: v.nonEmpty(),
      number: v.int(0),
      sectionCode: v.string(),
      sectionTitle: v.string(),
      selectedOption: v.nullable(v.string()),
      result: v.oneOf(ODK_QUESTION_RESULTS),
      marked: v.boolean(),
      outcomes: v.array(v.object({ code: v.string(), title: v.string(), primary: v.boolean() })),
      activeDurationMs: v.nullable(v.int(0)),
      /** Yalnız cevap anahtarı yayınlandıysa dolu. */
      correctOption: v.nullable(v.string()),
      inTrack: v.boolean(),
    }),
  ),
  answerKey: v.object({ available: v.boolean(), hasFile: v.boolean() }),
  outcomes: v.array(
    v.object({
      code: v.string(),
      title: v.string(),
      unitName: v.string(),
      questionCount: v.int(0),
      correct: v.int(0),
      wrong: v.int(0),
      blank: v.int(0),
      accuracy: v.number(),
      avgSecondsPerQuestion: v.nullable(v.int(0)),
      evidenceCount: v.nullable(v.int(0)),
      lowEvidence: v.boolean(),
      group: v.oneOf(["strong", "improve"] as const),
    }),
  ),
  time: v.object({
    sections: v.array(
      v.object({ code: v.string(), title: v.string(), totalActiveMs: v.int(0), correctAvgMs: v.nullable(v.number()), wrongAvgMs: v.nullable(v.number()), inTrack: v.boolean() }),
    ),
    fastWrongCount: v.int(0),
    longWrongCount: v.int(0),
  }),
  comparison: v.array(v.object({ examId: v.nonEmpty(), title: v.string(), takenAt: v.iso(), totalNet: v.number(), current: v.boolean() })),
  recommendations: v.array(
    v.object({ title: v.string(), detail: v.string(), actionLabel: v.nullable(v.string()), primary: v.boolean(), target: recommendationTarget }),
  ),
  /** Yalnız Yön (OK) erişimi varken; koç onayı olmadan plana yazılmaz. */
  coachSuggestions: v.array(v.object({ outcomeCode: v.string(), subject: v.string(), topic: v.string(), label: v.string() })),
});
export type MobileOdkResult = Infer<typeof result>;
export function parseOdkResult(input: unknown): ContractResult<MobileOdkResult> {
  return check(result, input);
}
