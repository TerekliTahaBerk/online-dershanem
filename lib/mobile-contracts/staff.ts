/**
 * MOBİL SÖZLEŞME — M7 PERSONEL (öğretmen + Yön koçu, platform rolü TEACHER).
 *
 * Her uç için TİP + DOĞRULAYICI. `v.object` yalnız şemadaki alanları geçirir.
 *
 * YETKİ (sunucuda; burada belgelenir):
 *  - TEACHER rolü TEK BAŞINA yetki değildir. Her uç: oturum + MFA kapıları →
 *    ürün rolü (`requireApiProductRole`) → personel izni (`hasStaffPermission`:
 *    OD `od:lesson:teach`, Yön `ok:coaching:write`, ODK
 *    `odk:report:read_related`) → kaynak ilişkisi (dersin `teacherId`'si,
 *    grubun öğretmeni + aktif kayıt, aktif `CoachAssignment`).
 *  - ADMIN mobil personel uçlarına GİRMEZ (web-only).
 *  - Öğrenci kimlikleri `StudentProfile.id`'dir. ODK raporu için öğrenci
 *    `User.id` yalnız sunucuda çözülür.
 *  - Yazmalar MEVCUT uçlarla yapılır (ders kapanışı, rubric değerlendirme,
 *    yardım yanıtı, görüşme, koç notu, görev erteleme, öneri inceleme, plan
 *    onayı); bu sözleşme yalnız onların yanıtlarını doğrular.
 *  - Bu sözleşmelerde: başka öğretmenin / koçun verisi, risk skoru (sayısal),
 *    öğrencinin ham check-in yanıtları (enerji / güven), ODK bütünlük kanıtı,
 *    yayınlanmamış sonuç, cevap anahtarı, personel e-postası YOKTUR.
 *
 * Bağımlılıksız; yalnız bu dizindeki dosyalardan göreli içe aktarma.
 */

import type { ContractResult } from "./bootstrap";
import { check, v, type Infer } from "./validate";

export const MOBILE_STAFF_CONTRACT_VERSION = 1 as const;

const version = v.literal(MOBILE_STAFF_CONTRACT_VERSION);
const TONES = ["neutral", "info", "success", "warning", "critical"] as const;

/* ------------------------------------------------------------------ *
 * Ortak hedef: sunucu web yolunu native hedefe çevirir; tanınmayan ama
 * öğretmen paneline ait yol açık "web'de devam" olur. Keyfi URL yok.
 * ------------------------------------------------------------------ */
const target = v.union("type", {
  lesson: v.object({ type: v.literal("lesson"), lessonId: v.nonEmpty() }),
  submissions: v.object({ type: v.literal("submissions") }),
  help: v.object({ type: v.literal("help") }),
  "coach-plans": v.object({ type: v.literal("coach-plans") }),
  "coach-student": v.object({ type: v.literal("coach-student"), studentId: v.nonEmpty() }),
  web: v.object({ type: v.literal("web"), path: v.nonEmpty() }),
  none: v.object({ type: v.literal("none") }),
});
export type MobileStaffTarget = Infer<typeof target>;

/* ================================================================== *
 * ÖĞRETMEN (OD)
 * ================================================================== */

export const LESSON_PREP = ["needs_prep", "ready", "needs_close", "closed"] as const;
export const LESSON_STATUS = ["PLANNED", "COMPLETED", "CANCELLED"] as const;
export const ATTENDANCE = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export type MobileAttendance = (typeof ATTENDANCE)[number];

const teacherFlags = v.object({
  quickLessonClose: v.boolean(),
  assignmentEvidence: v.boolean(),
  studentCheckIn: v.boolean(),
  reviewQueue: v.boolean(),
  interventionInbox: v.boolean(),
  adaptivePlan: v.boolean(),
  learningOutcomes: v.boolean(),
});
export type MobileTeacherFlags = Infer<typeof teacherFlags>;

/* GET /api/panel/staff/teacher/home — `getTeacherWorkspace` (web ile aynı) */
const teacherHome = v.object({
  contractVersion: version,
  generatedAt: v.iso(),
  summary: v.string(),
  flags: teacherFlags,
  todayLessons: v.array(
    v.object({
      id: v.nonEmpty(),
      startsAt: v.iso(),
      endsAt: v.iso(),
      title: v.string(),
      groupName: v.string(),
      subject: v.string(),
      studentCount: v.int(0),
      status: v.oneOf(LESSON_STATUS),
      prepStatus: v.oneOf(LESSON_PREP),
      prepLabel: v.string(),
    }),
  ),
  pending: v.array(
    v.object({
      id: v.nonEmpty(),
      kind: v.oneOf(["LESSON_CLOSE", "UNGRADED_ASSIGNMENT", "HELP_REQUEST", "INTERVENTION", "PLAN_APPROVAL", "REVIEW_QUEUE"] as const),
      title: v.string(),
      detail: v.string(),
      ctaLabel: v.string(),
      dueAt: v.nullable(v.iso()),
      target,
    }),
  ),
  /** Sunucunun dikkat listesi (neden + son sinyal). Sayısal skor GÖNDERİLMEZ. */
  attention: v.array(v.object({ studentId: v.nonEmpty(), studentName: v.string(), groupName: v.string(), reason: v.string(), lastSignal: v.string() })),
  upcoming: v.array(v.object({ id: v.nonEmpty(), kind: v.oneOf(["TOMORROW_LESSON", "EXAM", "PLAN_DEADLINE"] as const), title: v.string(), detail: v.string(), at: v.iso(), target })),
});
export type MobileTeacherHome = Infer<typeof teacherHome>;
export function parseTeacherHome(input: unknown): ContractResult<MobileTeacherHome> {
  return check(teacherHome, input);
}

/* GET /api/panel/staff/teacher/lessons?aralik=yaklasan|gecmis */
export const LESSON_RANGES = ["yaklasan", "gecmis"] as const;
export type LessonRange = (typeof LESSON_RANGES)[number];
const teacherLessons = v.object({
  contractVersion: version,
  range: v.oneOf(LESSON_RANGES),
  lessons: v.array(
    v.object({
      id: v.nonEmpty(),
      startsAt: v.iso(),
      endsAt: v.iso(),
      title: v.string(),
      groupName: v.string(),
      subject: v.string(),
      status: v.oneOf(LESSON_STATUS),
      studentCount: v.int(0),
      attendanceRecorded: v.int(0),
      hasSharedNote: v.boolean(),
    }),
  ),
});
export type MobileTeacherLessons = Infer<typeof teacherLessons>;
export function parseTeacherLessons(input: unknown): ContractResult<MobileTeacherLessons> {
  return check(teacherLessons, input);
}

/* GET /api/panel/staff/teacher/lessons/[id] — web ders kapanış sayfasıyla aynı yükleyici */
export const OUTCOME_EVIDENCE = ["TAUGHT", "OBSERVED", "INDEPENDENT", "NEEDS_REVIEW"] as const;
export const OUTCOME_SKIP_REASONS = ["CATALOG_MISSING", "COMPLETE_LATER", "NOT_APPLICABLE"] as const;
const lessonDetail = v.object({
  contractVersion: version,
  id: v.nonEmpty(),
  title: v.string(),
  groupName: v.string(),
  subject: v.string(),
  status: v.oneOf(LESSON_STATUS),
  startsAt: v.iso(),
  endsAt: v.iso(),
  /** Yalnız HTTPS; öğretmenin KENDİ dersinin bağlantısı. */
  meetingUrl: v.nullable(v.string()),
  /** Kapanış iyimser kilit sürümü (`quickLessonClose` açıkken zorunlu). */
  closeVersion: v.int(0),
  flags: v.object({ quickLessonClose: v.boolean(), learningOutcomes: v.boolean() }),
  common: v.object({ topic: v.string(), note: v.string(), nextGoal: v.string(), homework: v.string() }),
  previous: v.nullable(v.object({ topic: v.nullable(v.string()), nextGoal: v.nullable(v.string()), homework: v.nullable(v.string()) })),
  students: v.array(
    v.object({
      id: v.nonEmpty(),
      name: v.string(),
      /** Kayıtlı yoklama; yoksa null (form web ile aynı şekilde "Katıldı" ile başlar). */
      attendance: v.nullable(v.oneOf(ATTENDANCE)),
      /** Bu öğretmenin bu öğrenci için yazdığı ders notu (yalnız ders sahibine). */
      note: v.string(),
      supportLabels: v.array(v.string()),
    }),
  ),
  outcomes: v.object({
    linked: v.array(v.object({ outcomeId: v.nonEmpty(), evidenceType: v.oneOf(OUTCOME_EVIDENCE) })),
    skipReason: v.nullable(v.oneOf(OUTCOME_SKIP_REASONS)),
    catalog: v.array(v.object({ id: v.nonEmpty(), code: v.string(), title: v.string(), subject: v.string(), unit: v.string() })),
  }),
});
export type MobileTeacherLessonDetail = Infer<typeof lessonDetail>;
export function parseTeacherLessonDetail(input: unknown): ContractResult<MobileTeacherLessonDetail> {
  return check(lessonDetail, input);
}

/* PUT /api/panel/lessons/[id]/notes (MEVCUT uç) yanıtı */
const lessonSaveResult = v.object({ savedAt: v.iso(), version: v.int(0), replayed: v.boolean(), assignmentCreated: v.optional(v.boolean(), false) });
export type MobileLessonSaveResult = Infer<typeof lessonSaveResult>;
export function parseLessonSaveResult(input: unknown): ContractResult<MobileLessonSaveResult> {
  return check(lessonSaveResult, input);
}

/* GET /api/panel/staff/teacher/assignments — öğretmenin grup ödevleri özeti */
const teacherAssignments = v.object({
  contractVersion: version,
  evidenceEnabled: v.boolean(),
  assignments: v.array(
    v.object({
      id: v.nonEmpty(),
      title: v.string(),
      groupName: v.string(),
      dueAt: v.iso(),
      isActive: v.boolean(),
      total: v.int(0),
      submitted: v.int(0),
      waiting: v.int(0),
      late: v.int(0),
      evidenceRequired: v.boolean(),
      pendingReview: v.int(0),
    }),
  ),
});
export type MobileTeacherAssignments = Infer<typeof teacherAssignments>;
export function parseTeacherAssignments(input: unknown): ContractResult<MobileTeacherAssignments> {
  return check(teacherAssignments, input);
}

/* GET /api/panel/staff/teacher/submissions — değerlendirme kuyruğu (`assignmentEvidence`) */
const submissionQueue = v.object({
  contractVersion: version,
  items: v.array(
    v.object({
      id: v.nonEmpty(),
      assignmentTitle: v.string(),
      groupName: v.string(),
      studentName: v.string(),
      attemptNumber: v.int(1),
      submittedAt: v.iso(),
    }),
  ),
});
export type MobileSubmissionQueue = Infer<typeof submissionQueue>;
export function parseSubmissionQueue(input: unknown): ContractResult<MobileSubmissionQueue> {
  return check(submissionQueue, input);
}

/* GET /api/panel/staff/teacher/submissions/[id] */
export const RUBRIC_LEVELS = ["NEEDS_WORK", "DEVELOPING", "MEETS"] as const;
export const SUBMISSION_STATUS = ["SUBMITTED", "APPROVED", "CHANGES_REQUESTED"] as const;
const submissionDetail = v.object({
  contractVersion: version,
  id: v.nonEmpty(),
  version: v.int(1),
  status: v.oneOf(SUBMISSION_STATUS),
  attemptNumber: v.int(1),
  submittedAt: v.iso(),
  studentName: v.string(),
  textEvidence: v.string(),
  assignment: v.object({ id: v.nonEmpty(), title: v.string(), description: v.nullable(v.string()), dueAt: v.iso(), groupName: v.string() }),
  /** Sunucudaki rubric ölçütleri; istemci ölçüt TÜRETMEZ. */
  criteria: v.array(v.object({ id: v.nonEmpty(), label: v.string() })),
  previous: v.array(
    v.object({
      attemptNumber: v.int(1),
      status: v.oneOf(SUBMISSION_STATUS),
      feedback: v.nullable(v.string()),
      reviewedAt: v.nullable(v.iso()),
      scores: v.array(v.object({ criterionId: v.nonEmpty(), level: v.oneOf(RUBRIC_LEVELS) })),
    }),
  ),
});
export type MobileSubmissionDetail = Infer<typeof submissionDetail>;
export function parseSubmissionDetail(input: unknown): ContractResult<MobileSubmissionDetail> {
  return check(submissionDetail, input);
}

const reviewResult = v.object({ reviewed: v.literal(true), status: v.oneOf(["APPROVED", "CHANGES_REQUESTED"] as const) });
export function parseReviewResult(input: unknown): ContractResult<Infer<typeof reviewResult>> {
  return check(reviewResult, input);
}

/* GET /api/panel/staff/teacher/help — `studentCheckIn`; yalnız `shareWithTeacher` */
export const HELP_ACTIONS = ["NEXT_LESSON", "EXTRA_EXAMPLE", "PLAN_ADJUSTED", "SHORT_CHECKIN", "RESOURCE_SHARED", "NO_ACTION_NEEDED"] as const;
export type HelpAction = (typeof HELP_ACTIONS)[number];
const helpInbox = v.object({
  contractVersion: version,
  /** Mevcut yanıt ucu OD öğretmen ürün kapısını ister; false ise yanıt web'de. */
  canRespond: v.boolean(),
  actions: v.array(v.object({ value: v.oneOf(HELP_ACTIONS), label: v.string() })),
  items: v.array(
    v.object({
      id: v.nonEmpty(),
      version: v.int(1),
      studentName: v.string(),
      groupName: v.string(),
      /** Öğrencinin seçtiği engel (öğretmenle paylaşmayı seçti). Enerji / güven yanıtları gönderilmez. */
      barrierLabel: v.string(),
      status: v.oneOf(["OPEN", "RESPONDED"] as const),
      dueAt: v.iso(),
      responseLabel: v.nullable(v.string()),
    }),
  ),
});
export type MobileHelpInbox = Infer<typeof helpInbox>;
export function parseHelpInbox(input: unknown): ContractResult<MobileHelpInbox> {
  return check(helpInbox, input);
}
const helpResult = v.object({ responded: v.literal(true) });
export function parseHelpResult(input: unknown): ContractResult<Infer<typeof helpResult>> {
  return check(helpResult, input);
}

/* ================================================================== *
 * YÖN KOÇU (OK)
 * ================================================================== */

export const COACH_REASONS = ["RESCHEDULE_REQUESTED", "HELP_OPEN", "SESSION_OVERDUE", "PLAN_APPROVAL", "SUGGESTION_PENDING", "NO_PLAN", "CHECK_IN_MISSING", "LOW_COMPLIANCE"] as const;
export const PLAN_STATUS = ["DRAFT", "CHANGE_REQUESTED", "APPROVED", "ARCHIVED"] as const;

/* GET /api/panel/staff/coach/home — `loadCoachWorkspace` (web Yön Bugün ile aynı) */
const coachHome = v.object({
  contractVersion: version,
  generatedAt: v.iso(),
  flags: v.object({ adaptivePlan: v.boolean(), studentCheckIn: v.boolean() }),
  studentCount: v.int(0),
  attentionCount: v.int(0),
  todaySessions: v.array(v.object({ id: v.nonEmpty(), at: v.iso(), studentId: v.nonEmpty(), studentName: v.string(), focus: v.nullable(v.string()) })),
  nextSession: v.nullable(v.object({ studentId: v.nonEmpty(), studentName: v.string(), at: v.iso() })),
  groups: v.array(v.object({ reason: v.oneOf(COACH_REASONS), label: v.string(), students: v.array(v.object({ studentId: v.nonEmpty(), name: v.string() })) })),
});
export type MobileCoachHome = Infer<typeof coachHome>;
export function parseCoachHome(input: unknown): ContractResult<MobileCoachHome> {
  return check(coachHome, input);
}

/* GET /api/panel/staff/coach/students */
const coachStudents = v.object({
  contractVersion: version,
  students: v.array(
    v.object({
      studentId: v.nonEmpty(),
      name: v.string(),
      targetGoal: v.nullable(v.string()),
      primaryReason: v.nullable(v.oneOf(COACH_REASONS)),
      primaryLabel: v.nullable(v.string()),
      nextScheduledAt: v.nullable(v.iso()),
      planStatus: v.nullable(v.oneOf(PLAN_STATUS)),
      planCompletionPct: v.nullable(v.number()),
      lastExam: v.nullable(v.object({ net: v.number(), delta: v.nullable(v.number()), takenAt: v.iso() })),
    }),
  ),
});
export type MobileCoachStudents = Infer<typeof coachStudents>;
export function parseCoachStudents(input: unknown): ContractResult<MobileCoachStudents> {
  return check(coachStudents, input);
}

/* GET /api/panel/staff/coach/students/[id] — aktif koç ataması ZORUNLU */
export const NOTE_VISIBILITY = ["INTERNAL", "STUDENT_VISIBLE", "PARENT_VISIBLE"] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITY)[number];
const coachStudentDetail = v.object({
  contractVersion: version,
  studentId: v.nonEmpty(),
  name: v.string(),
  classLevel: v.nullable(v.string()),
  targetGoal: v.nullable(v.string()),
  nextSession: v.nullable(v.object({ id: v.nonEmpty(), scheduledAt: v.iso() })),
  plan: v.nullable(v.object({ id: v.nonEmpty(), status: v.oneOf(PLAN_STATUS), weekStart: v.iso(), taskCount: v.int(0), doneCount: v.int(0) })),
  recentSessions: v.array(v.object({ id: v.nonEmpty(), status: v.string(), scheduledAt: v.iso(), focus: v.nullable(v.string()), sharedNote: v.nullable(v.string()) })),
  /**
   * Koç notları. INTERNAL notlar YALNIZ `ok:note:read_private` izni + aktif
   * atama varken döner (`canReadInternal`); yoksa yalnız öğrenciye / veliye
   * açık notlar.
   */
  canReadInternal: v.boolean(),
  notes: v.array(v.object({ id: v.nonEmpty(), body: v.string(), visibility: v.oneOf(NOTE_VISIBILITY), createdAt: v.iso(), authorName: v.string(), own: v.boolean() })),
});
export type MobileCoachStudentDetail = Infer<typeof coachStudentDetail>;
export function parseCoachStudentDetail(input: unknown): ContractResult<MobileCoachStudentDetail> {
  return check(coachStudentDetail, input);
}

/* POST /api/panel/kocum/notes (MEVCUT) yanıtı */
const noteResult = v.object({ ok: v.literal(true), note: v.object({ id: v.nonEmpty(), visibility: v.oneOf(NOTE_VISIBILITY), createdAt: v.iso() }) });
export function parseNoteResult(input: unknown): ContractResult<Infer<typeof noteResult>> {
  return check(noteResult, input);
}

/* GET /api/panel/staff/coach/sessions */
const sessionRow = v.object({
  id: v.nonEmpty(),
  studentId: v.nonEmpty(),
  studentName: v.string(),
  scheduledAt: v.iso(),
  status: v.oneOf(["PLANNED", "COMPLETED", "MISSED", "CANCELLED"] as const),
  focus: v.nullable(v.string()),
  rescheduleRequested: v.boolean(),
  proposedAt: v.nullable(v.iso()),
});
const coachSessions = v.object({ contractVersion: version, upcoming: v.array(sessionRow), past: v.array(sessionRow) });
export type MobileCoachSessions = Infer<typeof coachSessions>;
export type MobileCoachSessionRow = Infer<typeof sessionRow>;
export function parseCoachSessions(input: unknown): ContractResult<MobileCoachSessions> {
  return check(coachSessions, input);
}

/* GET /api/panel/staff/coach/sessions/[id] */
const coachSessionDetail = v.object({
  contractVersion: version,
  id: v.nonEmpty(),
  version: v.int(1),
  status: v.oneOf(["PLANNED", "COMPLETED", "MISSED", "CANCELLED"] as const),
  studentId: v.nonEmpty(),
  studentName: v.string(),
  scheduledAt: v.iso(),
  completedAt: v.nullable(v.iso()),
  /** Yalnız HTTPS. */
  meetingUrl: v.nullable(v.string()),
  focus: v.nullable(v.string()),
  sharedNote: v.nullable(v.string()),
  /** Yalnız `ok:note:read_private` + kendi atamasının görüşmesi; aksi halde null. */
  privateNote: v.nullable(v.string()),
  canReadPrivate: v.boolean(),
  rescheduleRequestedAt: v.nullable(v.iso()),
  rescheduleReasonLabel: v.nullable(v.string()),
  proposedAt: v.nullable(v.iso()),
  /** Görüşme kararları yalnız bu haftanın günlerine yerleşebilir (sunucu kuralı). */
  decisionWeekStart: v.iso(),
  decisionsEnabled: v.boolean(),
});
export type MobileCoachSessionDetail = Infer<typeof coachSessionDetail>;
export function parseCoachSessionDetail(input: unknown): ContractResult<MobileCoachSessionDetail> {
  return check(coachSessionDetail, input);
}

/* POST /api/panel/coaching-sessions (+/[id]) MEVCUT yanıtı */
const sessionResult = v.object({ id: v.nonEmpty(), version: v.int(1) });
export function parseSessionResult(input: unknown): ContractResult<Infer<typeof sessionResult>> {
  return check(sessionResult, input);
}

/* GET /api/panel/staff/coach/plans — planlama haftası, onay akışındaki ürünler */
const coachPlans = v.object({
  contractVersion: version,
  weekStart: v.iso(),
  plans: v.array(
    v.object({
      id: v.nonEmpty(),
      studentId: v.nonEmpty(),
      studentName: v.string(),
      status: v.oneOf(PLAN_STATUS),
      statusLabel: v.string(),
      version: v.int(1),
      weekStart: v.iso(),
      taskCount: v.int(0),
      doneCount: v.int(0),
    }),
  ),
  suggestions: v.array(v.object({ id: v.nonEmpty(), studentId: v.nonEmpty(), studentName: v.string(), kindLabel: v.string(), title: v.string(), rationale: v.string() })),
});
export type MobileCoachPlans = Infer<typeof coachPlans>;
export function parseCoachPlans(input: unknown): ContractResult<MobileCoachPlans> {
  return check(coachPlans, input);
}

/* GET /api/panel/staff/coach/plans/[id] */
export const TASK_STATUS = ["PLANNED", "IN_PROGRESS", "DONE", "PARTIAL", "COULD_NOT", "SKIPPED"] as const;
const coachPlanDetail = v.object({
  contractVersion: version,
  id: v.nonEmpty(),
  studentId: v.nonEmpty(),
  studentName: v.string(),
  status: v.oneOf(PLAN_STATUS),
  statusLabel: v.string(),
  version: v.int(1),
  weekStart: v.iso(),
  weekEnd: v.iso(),
  /** Sunucu ipucu: DRAFT + planlı görevi var. Onay kararı yine uçta verilir. */
  canApprove: v.boolean(),
  tasks: v.array(
    v.object({
      id: v.nonEmpty(),
      title: v.string(),
      subject: v.nullable(v.string()),
      scheduledFor: v.iso(),
      durationMinutes: v.int(0),
      status: v.oneOf(TASK_STATUS),
      statusLabel: v.string(),
    }),
  ),
});
export type MobileCoachPlanDetail = Infer<typeof coachPlanDetail>;
export function parseCoachPlanDetail(input: unknown): ContractResult<MobileCoachPlanDetail> {
  return check(coachPlanDetail, input);
}

const rescheduleResult = v.object({ ok: v.literal(true), scheduledFor: v.iso(), version: v.int(1) });
export function parseRescheduleResult(input: unknown): ContractResult<Infer<typeof rescheduleResult>> {
  return check(rescheduleResult, input);
}
const suggestionResult = v.object({ ok: v.literal(true), status: v.oneOf(["ACCEPTED", "REJECTED"] as const) });
export function parseSuggestionResult(input: unknown): ContractResult<Infer<typeof suggestionResult>> {
  return check(suggestionResult, input);
}
const approveResult = v.object({ approved: v.literal(true) });
export function parseApproveResult(input: unknown): ContractResult<Infer<typeof approveResult>> {
  return check(approveResult, input);
}

/* ================================================================== *
 * DENEME LİGİ — ilişkili öğrenci raporları (SALT OKUNUR)
 * ================================================================== */

/* GET /api/odk/staff/related-reports */
const odkStudents = v.object({
  contractVersion: version,
  students: v.array(v.object({ studentId: v.nonEmpty(), name: v.string(), context: v.string() })),
});
export type MobileOdkStaffStudents = Infer<typeof odkStudents>;
export function parseOdkStaffStudents(input: unknown): ContractResult<MobileOdkStaffStudents> {
  return check(odkStudents, input);
}

/* GET /api/odk/staff/related-reports?studentId= */
const odkReport = v.object({
  contractVersion: version,
  studentId: v.nonEmpty(),
  studentName: v.string(),
  available: v.boolean(),
  summary: v.array(v.string()),
  exams: v.array(v.object({ id: v.nonEmpty(), title: v.string(), family: v.string(), takenAt: v.iso(), correctCount: v.int(0), wrongCount: v.int(0), blankCount: v.int(0), totalNet: v.number() })),
  outcomes: v.array(v.object({ id: v.nonEmpty(), code: v.string(), title: v.string(), unitName: v.string(), latestAccuracy: v.number(), delta: v.nullable(v.number()), questionCount: v.int(0) })),
  weakThreshold: v.number(),
});
export type MobileOdkStaffReport = Infer<typeof odkReport>;
export function parseOdkStaffReport(input: unknown): ContractResult<MobileOdkStaffReport> {
  return check(odkReport, input);
}

export { TONES as STAFF_TONES };
