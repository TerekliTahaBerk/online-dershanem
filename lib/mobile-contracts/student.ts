/**
 * MOBİL SÖZLEŞME — M2 OD öğrenci uçları.
 *
 * Her uç için: TİP (sunucu yanıtı bu tipe göre yazılır) + DOĞRULAYICI
 * (mobil, yanıtı uygulama durumuna almadan önce çalıştırır). Eski sunucu
 * sürümünde olmayabilecek eklemeli alanlar `v.optional` ile varsayılan alır;
 * mevcut uçların zorunlu alanları değiştirilmez (geriye uyum, M1 politikası).
 *
 * Bağımlılıksız; yalnız bu dizindeki dosyalardan göreli içe aktarma
 * (bkz. `bootstrap.ts`).
 */

import type { ContractResult } from "./bootstrap";
import { check, v, type Infer } from "./validate";

export const MOBILE_STUDENT_CONTRACT_VERSION = 1 as const;

/* ------------------------------------------------------------------ *
 * Ortak: native hedef
 * ------------------------------------------------------------------ */

/**
 * Sunucunun önerdiği native hedef. Web `href`'i native yol olarak
 * KULLANILMAZ; mobil bu hedefi yalnız kullanıcının yetkili menüsünde karşılığı
 * varsa açar (`mobile/src/navigation/od-targets.ts`).
 */
const target = v.union("type", {
  lesson: v.object({ type: v.literal("lesson"), lessonId: v.nonEmpty() }),
  lessons: v.object({ type: v.literal("lessons") }),
  assignment: v.object({ type: v.literal("assignment"), assignmentId: v.nonEmpty() }),
  assignments: v.object({ type: v.literal("assignments") }),
  review: v.object({ type: v.literal("review") }),
  recovery: v.object({ type: v.literal("recovery"), lessonId: v.nullable(v.nonEmpty()) }),
  none: v.object({ type: v.literal("none") }),
});
export type MobileOdTarget = Infer<typeof target>;

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/home?scope=OD
 * ------------------------------------------------------------------ */

export const MOBILE_OD_ACTION_KINDS = ["OPEN_LESSON", "OPEN_RECOVERY", "OPEN_REVIEW"] as const;
export const MOBILE_OD_TODAY_KINDS = ["LESSON", "ASSIGNMENT_DUE", "RECOVERY", "REVIEW", "OTHER"] as const;

const odAction = v.object({
  id: v.nonEmpty(),
  kind: v.oneOf(MOBILE_OD_ACTION_KINDS),
  reasonCode: v.nonEmpty(),
  title: v.nonEmpty(),
  description: v.nullable(v.string()),
  reason: v.string(),
  ctaLabel: v.nonEmpty(),
  /** Ders şu anda katılım penceresinde (sunucu kuralı: `lib/panel/lesson-join.ts`). */
  joinable: v.boolean(),
  target,
  webPath: v.nullable(v.string()),
});
export type MobileOdAction = Infer<typeof odAction>;

const odTodayItem = v.object({
  id: v.nonEmpty(),
  kind: v.oneOf(MOBILE_OD_TODAY_KINDS),
  title: v.nonEmpty(),
  subtitle: v.nullable(v.string()),
  startsAt: v.nullable(v.iso()),
  dueAt: v.nullable(v.iso()),
  /** Saat gösterilmez (esnek öğe). */
  isFlexible: v.boolean(),
  target,
  webPath: v.nullable(v.string()),
});
export type MobileOdTodayItem = Infer<typeof odTodayItem>;

const odWeek = v.object({
  weekStart: v.iso(),
  lessonsPlanned: v.int(0),
  lessonsRemainingToday: v.int(0),
  assignmentsDue: v.int(0),
  assignmentsCompleted: v.int(0),
  pendingAssignments: v.int(0),
  overdueAssignments: v.int(0),
  /** Tekrar kuyruğu kapalıysa null (sayı uydurulmaz). */
  dueReviews: v.nullable(v.int(0)),
});
export type MobileOdWeek = Infer<typeof odWeek>;

const odHome = v.object({
  contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION),
  scope: v.literal("OD"),
  generatedAt: v.iso(),
  /** Öğrenci profili yoksa yalnız durum döner; ürün verisi yok. */
  state: v.oneOf(["READY", "NO_PROFILE"] as const),
  firstName: v.nullable(v.string()),
  now: v.nullable(odAction),
  today: v.array(odTodayItem),
  week: v.nullable(odWeek),
  /** `progressInsights` kapalıysa veya veri yoksa null. */
  insight: v.nullable(v.object({ sentence: v.nonEmpty(), isEmpty: v.boolean() })),
});
export type MobileOdHome = Infer<typeof odHome>;

export function parseOdHome(input: unknown): ContractResult<MobileOdHome> {
  return check(odHome, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/assignments?scope=OD
 * PATCH /api/panel/assignments/[id]/progress
 * POST /api/panel/assignments/[id]/submissions
 * ------------------------------------------------------------------ */

export const ASSIGNMENT_PROGRESS_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type AssignmentProgressStatus = (typeof ASSIGNMENT_PROGRESS_STATUSES)[number];
export const ASSIGNMENT_SUBMISSION_STATUSES = ["SUBMITTED", "CHANGES_REQUESTED", "APPROVED"] as const;
export const RUBRIC_LEVELS = ["NEEDS_WORK", "DEVELOPING", "MEETS"] as const;

/** Sunucu kanıt metni sınırları (`submissions/route.ts` zod şeması ile aynı). */
export const ASSIGNMENT_EVIDENCE_MIN = 20;
export const ASSIGNMENT_EVIDENCE_MAX = 2000;

const submission = v.object({
  id: v.nonEmpty(),
  attemptNumber: v.int(1),
  status: v.oneOf(ASSIGNMENT_SUBMISSION_STATUSES),
  textEvidence: v.string(),
  feedback: v.nullable(v.string()),
  scores: v.array(v.object({ criterionId: v.nonEmpty(), level: v.oneOf(RUBRIC_LEVELS) })),
  submittedAt: v.optional(v.nullable(v.iso()), null),
  reviewedAt: v.optional(v.nullable(v.iso()), null),
});

const assignment = v.object({
  id: v.nonEmpty(),
  title: v.nonEmpty(),
  description: v.string(),
  dueAt: v.iso(),
  groupName: v.string(),
  subject: v.string(),
  teacherName: v.optional(v.nullable(v.string()), null),
  status: v.oneOf(ASSIGNMENT_PROGRESS_STATUSES),
  /** Sunucudaki son ilerleme sürümü — `expectedVersion` olarak geri gönderilir. */
  version: v.int(0),
  evidenceRequired: v.boolean(),
  criteria: v.array(v.object({ id: v.nonEmpty(), label: v.string() })),
  submissions: v.array(submission),
});
export type MobileAssignment = Infer<typeof assignment>;
export type MobileAssignmentSubmission = Infer<typeof submission>;

const assignmentList = v.object({
  profile: v.nullable(v.object({ id: v.nonEmpty() })),
  evidenceEnabled: v.optional(v.boolean(), false),
  assignments: v.array(assignment),
});
export type MobileAssignmentList = Infer<typeof assignmentList>;

export function parseAssignmentList(input: unknown): ContractResult<MobileAssignmentList> {
  return check(assignmentList, input);
}

const progressResult = v.object({ ok: v.literal(true), version: v.int(0), replayed: v.boolean() });
export type MobileAssignmentProgressResult = Infer<typeof progressResult>;
export function parseAssignmentProgressResult(input: unknown): ContractResult<MobileAssignmentProgressResult> {
  return check(progressResult, input);
}

const submissionResult = v.object({ id: v.nonEmpty(), attemptNumber: v.int(1), replayed: v.boolean() });
export type MobileSubmissionResult = Infer<typeof submissionResult>;
export function parseSubmissionResult(input: unknown): ContractResult<MobileSubmissionResult> {
  return check(submissionResult, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/lessons?durum=yaklasan|tamamlanan
 * GET /api/panel/student/lessons/[id]
 * ------------------------------------------------------------------ */

export const LESSON_STATUSES = ["PLANNED", "COMPLETED", "CANCELLED"] as const;
export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;
export const STATUS_TONES = ["neutral", "info", "success", "warning", "critical"] as const;

const lessonRow = v.object({
  id: v.nonEmpty(),
  startsAt: v.iso(),
  title: v.nonEmpty(),
  groupName: v.string(),
  teacherName: v.nullable(v.string()),
  statusLabel: v.string(),
  // Eklemeli alanlar (M2): eski sunucu yanıtında yok.
  endsAt: v.optional(v.nullable(v.iso()), null),
  status: v.optional(v.nullable(v.oneOf(LESSON_STATUSES)), null),
  attendance: v.optional(v.nullable(v.oneOf(ATTENDANCE_STATUSES)), null),
});
export type MobileLessonRow = Infer<typeof lessonRow>;

const lessonList = v.object({
  profile: v.nullable(v.object({ id: v.nonEmpty() })),
  groupNames: v.string(),
  lessons: v.array(lessonRow),
});
export type MobileLessonList = Infer<typeof lessonList>;
export function parseLessonList(input: unknown): ContractResult<MobileLessonList> {
  return check(lessonList, input);
}

export const LESSON_JOIN_STATES = ["OPEN", "NOT_YET", "ENDED", "UNAVAILABLE"] as const;

const lessonDetail = v.object({
  contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION),
  lesson: v.object({
    id: v.nonEmpty(),
    title: v.nonEmpty(),
    startsAt: v.iso(),
    endsAt: v.iso(),
    status: v.oneOf(LESSON_STATUSES),
    groupName: v.string(),
    subject: v.string(),
    teacherName: v.nullable(v.string()),
  }),
  attendance: v.object({
    status: v.nullable(v.oneOf(ATTENDANCE_STATUSES)),
    label: v.nonEmpty(),
    tone: v.oneOf(STATUS_TONES),
  }),
  /** Grubun ortak ders notu (veliye de açık özet). */
  topic: v.nullable(v.string()),
  homework: v.nullable(v.string()),
  nextGoal: v.nullable(v.string()),
  /** YALNIZ bu öğrenciye yazılmış öğretmen notu; başka öğrencinin notu asla gelmez. */
  personalNote: v.nullable(v.string()),
  assignments: v.array(v.object({ id: v.nonEmpty(), title: v.nonEmpty(), dueAt: v.iso(), done: v.boolean() })),
  join: v.object({
    state: v.oneOf(LESSON_JOIN_STATES),
    /** Yalnız `OPEN` iken ve aktif kayıtta dolu (http/https). */
    url: v.nullable(v.string()),
    opensAt: v.nullable(v.iso()),
  }),
  /** `recoveryPackage` kapalıysa veya paket yoksa null. */
  recovery: v.nullable(v.object({ status: v.oneOf(["PUBLISHED", "COMPLETED"] as const) })),
  enrollmentActive: v.boolean(),
});
export type MobileLessonDetail = Infer<typeof lessonDetail>;
export function parseLessonDetail(input: unknown): ContractResult<MobileLessonDetail> {
  return check(lessonDetail, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/materials
 * ------------------------------------------------------------------ */

export const MATERIAL_KINDS = ["LINK", "PDF", "VIDEO"] as const;

const material = v.object({
  id: v.nonEmpty(),
  kind: v.oneOf(MATERIAL_KINDS),
  title: v.nonEmpty(),
  description: v.nullable(v.string()),
  groupName: v.string(),
  subject: v.string(),
  /** Dış bağlantı; kimlikli dosyada null (dosya Bearer ile indirilir). */
  url: v.nullable(v.string()),
  hasFile: v.boolean(),
  fileName: v.nullable(v.string()),
  mimeType: v.nullable(v.string()),
  captionsAvailable: v.boolean(),
  transcript: v.nullable(v.string()),
  preferred: v.boolean(),
});
export type MobileMaterial = Infer<typeof material>;

const materialList = v.object({
  profile: v.nullable(v.object({ id: v.nonEmpty() })),
  lowDataMode: v.boolean(),
  preferenceActive: v.optional(v.boolean(), false),
  materials: v.array(material),
});
export type MobileMaterialList = Infer<typeof materialList>;
export function parseMaterialList(input: unknown): ContractResult<MobileMaterialList> {
  return check(materialList, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/insights   (flag: progressInsights)
 * PATCH /api/panel/student/weekly-goal
 * ------------------------------------------------------------------ */

export const TREND_DIRECTIONS = ["up", "down", "steady", "limited"] as const;
export const WEEKLY_GOAL_MIN = 3;
export const WEEKLY_GOAL_MAX = 180;

const rate = v.object({ percent: v.nullable(v.number()), numerator: v.int(0), denominator: v.int(0) });
const highlight = v.object({ subject: v.string(), direction: v.oneOf(TREND_DIRECTIONS), sentence: v.string() });

const insightsReady = v.object({
  contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION),
  state: v.literal("READY"),
  periodLabel: v.string(),
  periodRange: v.string(),
  narrative: v.array(v.string()),
  isEmpty: v.boolean(),
  academic: v.object({
    examCount: v.int(0),
    netDelta: v.nullable(v.number()),
    netTrend: v.array(v.object({ label: v.string(), net: v.number() })),
    labels: v.array(v.string()),
    subjects: v.array(v.object({ name: v.string(), direction: v.oneOf(TREND_DIRECTIONS), nets: v.array(v.nullable(v.number())) })),
    strengths: v.array(highlight),
    supportAreas: v.array(highlight),
    subjectCaption: v.nullable(v.string()),
  }),
  behavioral: v.object({ attendance: rate, assignments: rate }),
  weeklyGoal: v.nullable(v.string()),
  weeklyGoalUpdatedAt: v.nullable(v.iso()),
  mockExamAnalysis: v.boolean(),
});
const insightsNoProfile = v.object({
  contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION),
  state: v.literal("NO_PROFILE"),
});
const insights = v.union("state", { READY: insightsReady, NO_PROFILE: insightsNoProfile });
export type MobileInsights = Infer<typeof insights>;
export type MobileInsightsReady = Infer<typeof insightsReady>;
export function parseInsights(input: unknown): ContractResult<MobileInsights> {
  return check(insights, input);
}

const weeklyGoalResult = v.object({ goal: v.string() });
export function parseWeeklyGoalResult(input: unknown): ContractResult<{ goal: string }> {
  return check(weeklyGoalResult, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/mock-exams   (flag: mockExamAnalysis — DIŞ deneme;
 * Deneme Ligi DEĞİL)
 * ------------------------------------------------------------------ */

const mockExams = v.object({
  profile: v.nullable(v.object({ id: v.nonEmpty() })),
  exams: v.array(v.object({ id: v.nonEmpty(), title: v.string(), takenAt: v.iso() })),
  trend: v.optional(v.array(v.object({ id: v.nonEmpty(), takenAt: v.iso(), net: v.number() })), []),
  current: v.optional(
    v.nullable(
      v.object({
        id: v.nonEmpty(),
        title: v.string(),
        takenAt: v.iso(),
        durationMinutes: v.nullable(v.number()),
        nextAction: v.nullable(v.string()),
        total: v.number(),
        delta: v.nullable(v.number()),
        sections: v.array(v.object({ id: v.nonEmpty(), subjectName: v.string(), correctCount: v.int(0), incorrectCount: v.int(0), net: v.number() })),
      }),
    ),
    null,
  ),
});
export type MobileMockExams = Infer<typeof mockExams>;
export function parseMockExams(input: unknown): ContractResult<MobileMockExams> {
  return check(mockExams, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/review-queue   (flag: reviewQueue)
 * POST /api/panel/review-queue/[id]/respond | /defer
 * ------------------------------------------------------------------ */

export const REVIEW_RESPONSES = ["WRONG", "UNSURE", "CORRECT"] as const;
export const REVIEW_SOURCE_TYPES = ["MOCK_EXAM_SECTION", "LESSON_OUTCOME", "TEACHER_REFERENCE"] as const;

const reviewQueue = v.union("state", {
  READY: v.object({
    contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION),
    state: v.literal("READY"),
    dailyLimit: v.int(1),
    activeCount: v.int(0),
    masteredCount: v.int(0),
    items: v.array(
      v.object({
        id: v.nonEmpty(),
        title: v.string(),
        sourceReference: v.string(),
        solutionNote: v.nullable(v.string()),
        stage: v.int(0),
        dueAt: v.iso(),
        sourceType: v.oneOf(REVIEW_SOURCE_TYPES),
      }),
    ),
  }),
  NO_PROFILE: v.object({ contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION), state: v.literal("NO_PROFILE") }),
});
export type MobileReviewQueue = Infer<typeof reviewQueue>;
export function parseReviewQueue(input: unknown): ContractResult<MobileReviewQueue> {
  return check(reviewQueue, input);
}

const reviewResponse = v.object({
  nextDueAt: v.nullable(v.iso()),
  stage: v.int(0),
  status: v.oneOf(["ACTIVE", "MASTERED"] as const),
  replayed: v.boolean(),
});
export type MobileReviewResponse = Infer<typeof reviewResponse>;
export function parseReviewResponse(input: unknown): ContractResult<MobileReviewResponse> {
  return check(reviewResponse, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/recovery   (flag: recoveryPackage)
 * POST /api/panel/recovery-packages/[id]/items/[itemId]/complete
 * POST /api/panel/recovery-packages/[id]/checkpoint
 * ------------------------------------------------------------------ */

export const RECOVERY_CHECKPOINT_RESPONSES = ["NOT_YET", "NEED_HELP", "READY"] as const;

const recoveryItemTarget = v.union("type", {
  material: v.object({ type: v.literal("material"), materialId: v.nonEmpty(), hasFile: v.boolean(), url: v.nullable(v.string()) }),
  assignments: v.object({ type: v.literal("assignments") }),
  none: v.object({ type: v.literal("none") }),
});

const recovery = v.union("state", {
  READY: v.object({
    contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION),
    state: v.literal("READY"),
    packages: v.array(
      v.object({
        id: v.nonEmpty(),
        lessonId: v.nonEmpty(),
        status: v.oneOf(["PUBLISHED", "COMPLETED"] as const),
        lessonTitle: v.string(),
        lessonDate: v.iso(),
        summaryTopic: v.string(),
        sharedNote: v.nullable(v.string()),
        summaryNextStep: v.string(),
        checkpointPrompt: v.string(),
        checkpointResponse: v.nullable(v.oneOf(RECOVERY_CHECKPOINT_RESPONSES)),
        dueAt: v.iso(),
        outcomeTitles: v.array(v.string()),
        items: v.array(v.object({ id: v.nonEmpty(), kind: v.oneOf(["MATERIAL", "ASSIGNMENT"] as const), title: v.string(), completed: v.boolean(), target: recoveryItemTarget })),
      }),
    ),
  }),
  NO_PROFILE: v.object({ contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION), state: v.literal("NO_PROFILE") }),
});
export type MobileRecovery = Infer<typeof recovery>;
export function parseRecovery(input: unknown): ContractResult<MobileRecovery> {
  return check(recovery, input);
}

const recoveryItemResult = v.object({ completed: v.boolean(), replayed: v.boolean() });
export function parseRecoveryItemResult(input: unknown): ContractResult<{ completed: boolean; replayed: boolean }> {
  return check(recoveryItemResult, input);
}
const recoveryCheckpointResult = v.object({ completed: v.boolean() });
export function parseRecoveryCheckpointResult(input: unknown): ContractResult<{ completed: boolean }> {
  return check(recoveryCheckpointResult, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/weekly-digest   (flag: parentWeeklyDigest)
 * ------------------------------------------------------------------ */

const weeklyDigest = v.union("state", {
  READY: v.object({
    contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION),
    state: v.literal("READY"),
    digest: v.object({
      id: v.nonEmpty(),
      goodThingOne: v.string(),
      goodThingTwo: v.string(),
      supportArea: v.string(),
      homeQuestion: v.string(),
      dataThrough: v.iso(),
      trendBand: v.string(),
    }),
    /** Bu öğrencinin önceki geri bildirimi (eklemeli alan). */
    feedback: v.optional(v.nullable(v.object({ helpful: v.nullable(v.boolean()), anxietyPulse: v.nullable(v.int(1)) })), null),
  }),
  NONE: v.object({ contractVersion: v.literal(MOBILE_STUDENT_CONTRACT_VERSION), state: v.literal("NONE") }),
});
export type MobileWeeklyDigest = Infer<typeof weeklyDigest>;
export function parseWeeklyDigest(input: unknown): ContractResult<MobileWeeklyDigest> {
  return check(weeklyDigest, input);
}

/* POST /api/panel/weekly-digests/[id]/feedback (upsert; tekrar güvenli) */
const digestFeedbackResult = v.object({ saved: v.literal(true) });
export function parseDigestFeedbackResult(input: unknown): ContractResult<{ saved: true }> {
  return check(digestFeedbackResult, input);
}
