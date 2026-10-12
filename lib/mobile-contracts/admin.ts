/**
 * MOBİL SÖZLEŞME — YÖNETİM (ADMIN), Faz 1.
 *
 * YETKİ (sunucuda; burada belgelenir):
 *  - Her yönetim ucu `requireAdminApi` kapısından geçer: gerçek ADMIN oturumu
 *    (önizleme / öğretmen modu overlay'i yönetim yetkisi DOĞURMAZ). Hassas
 *    yazmalar ayrıca taze step-up ister (428 `STEP_UP_REQUIRED`).
 *  - Mobilde bir düğmenin görünmesi yetki değildir; sunucu her istekte yeniden
 *    karar verir.
 *  - `webPath` YALNIZ `/panel/...` web yoludur; mobil onu yetkili menüdeki
 *    native ekrana eşler (`mapAdminWebPath`). Keyfi URL taşınmaz.
 *
 * Bağımlılıksız; yalnız bu dizindeki dosyalardan göreli içe aktarma.
 */

import type { ContractResult } from "./bootstrap";
import { check, ContractError, v, type Infer, type Validator } from "./validate";

export const MOBILE_ADMIN_CONTRACT_VERSION = 1 as const;

const version = v.literal(MOBILE_ADMIN_CONTRACT_VERSION);

/** `/panel/...` web yolu (sorgu dizesi / parça yok); panel dışı / bozuk yol reddedilir. */
const webPath: Validator<string> = (input, path) => {
  const value = v.nonEmpty()(input, path);
  if (!/^\/panel(\/[\w\-./]*)?$/.test(value) || value.includes("..")) throw new ContractError(`${path}: panel yolu bekleniyordu`);
  return value;
};

/* ================================================================== *
 * OPERASYON MERKEZİ — `GET /api/panel/admin/operations-center?grup=`
 * Web `app/panel/yonetim` ile AYNI `getAdminOperationsCenterSnapshot`.
 * ================================================================== */

export const OPS_SEVERITIES = ["BLOCKING", "ACTION_REQUIRED", "WATCH"] as const;
export const OPS_GROUPS = ["OD", "YON", "DL", "COMMERCE", "SECURITY", "SYSTEM"] as const;
export const OPS_GROUP_FILTER_IDS = ["tumu", ...OPS_GROUPS] as const;
export type MobileOpsGroupFilter = (typeof OPS_GROUP_FILTER_IDS)[number];
export const OPS_TILE_TONES = ["neutral", "warning", "critical", "success"] as const;
export const OPS_HEALTH = ["ok", "degraded", "down", "unknown"] as const;

const opsAction = v.object({
  id: v.nonEmpty(),
  code: v.nonEmpty(),
  group: v.oneOf(OPS_GROUPS),
  severity: v.oneOf(OPS_SEVERITIES),
  title: v.string(),
  subject: v.string(),
  ageLabel: v.string(),
  owner: v.nullable(v.string()),
  ctaLabel: v.string(),
  createdAt: v.nullable(v.iso()),
  webPath: v.nullable(webPath),
});

const operationsCenter = v.object({
  contractVersion: version,
  generatedAt: v.iso(),
  partialData: v.boolean(),
  group: v.oneOf(OPS_GROUP_FILTER_IDS),
  groups: v.array(v.object({ id: v.oneOf(OPS_GROUP_FILTER_IDS), label: v.string(), count: v.int(0) })),
  openActionCount: v.int(0),
  blockingCount: v.int(0),
  actions: v.array(opsAction),
  summary: v.array(
    v.object({
      id: v.nonEmpty(),
      label: v.string(),
      value: v.nullable(v.int(0)),
      hint: v.string(),
      tone: v.oneOf(OPS_TILE_TONES),
      available: v.boolean(),
      webPath: v.nullable(webPath),
    }),
  ),
  risk: v.object({ critical: v.int(0), watch: v.int(0), normal: v.int(0), total: v.int(0) }),
  health: v.array(v.object({ id: v.nonEmpty(), label: v.string(), status: v.oneOf(OPS_HEALTH), detail: v.string() })),
  activities: v.array(v.object({ id: v.nonEmpty(), text: v.string(), actorLabel: v.string(), occurredAt: v.iso(), webPath: v.nullable(webPath) })),
});
export type MobileOperationsCenter = Infer<typeof operationsCenter>;
export type MobileOpsAction = MobileOperationsCenter["actions"][number];
export function parseOperationsCenter(input: unknown): ContractResult<MobileOperationsCenter> {
  return check(operationsCenter, input);
}

/* ================================================================== *
 * GLOBAL ARAMA — `GET /api/panel/admin-search?q=` (mevcut uç; web komut
 * paleti ile aynı yanıt). İzin filtresi sunucuda (`runGlobalSearch`).
 * ================================================================== */

export const GLOBAL_SEARCH_KINDS = ["STUDENT", "PARENT", "TEACHER", "USER", "GROUP", "LESSON", "ORDER", "LEAD", "EXAM", "COMMAND"] as const;
export type MobileGlobalSearchKind = (typeof GLOBAL_SEARCH_KINDS)[number];

const searchResult = v.object({
  kind: v.oneOf(GLOBAL_SEARCH_KINDS),
  id: v.nonEmpty(),
  label: v.string(),
  detail: v.string(),
  href: v.string(),
});
const globalSearch = v.object({
  query: v.string(),
  commands: v.array(searchResult),
  results: v.array(searchResult),
});
export type MobileGlobalSearch = Infer<typeof globalSearch>;
export type MobileGlobalSearchResult = MobileGlobalSearch["results"][number];
export function parseGlobalSearch(input: unknown): ContractResult<MobileGlobalSearch> {
  return check(globalSearch, input);
}

/* ================================================================== *
 * STEP-UP — `POST /api/auth/mfa/code/verify` (`purpose: "STEP_UP"`).
 * `stepUpExpiresAt` eklemeli alandır; eski sunucuda yoksa null.
 * ================================================================== */

const stepUpResult = v.object({ verified: v.literal(true), stepUpExpiresAt: v.optional(v.nullable(v.iso()), null) });
export type MobileStepUpResult = Infer<typeof stepUpResult>;
export function parseStepUpResult(input: unknown): ContractResult<MobileStepUpResult> {
  return check(stepUpResult, input);
}

/* ================================================================== *
 * MÜDAHALE KUTUSU — `GET /api/panel/admin/interventions` (Faz 2.1)
 * Web `app/panel/yonetim/mudahale` ile AYNI `getInterventionInbox`.
 * Yazmalar MEVCUT uçlarla: `POST /api/panel/interventions` (elle kayıt),
 * `PATCH /api/panel/interventions/:id` (`expectedVersion` → 409),
 * `POST /api/panel/interventions/generate`. Bayrak kapalıysa 404
 * `FEATURE_DISABLED`. Etiketler sunucudan gelir (tek sözlük).
 * ================================================================== */

export const INTERVENTION_STATUSES = ["OPEN", "IN_PROGRESS", "SNOOZED", "RESOLVED", "FALSE_POSITIVE"] as const;
export type MobileInterventionStatus = (typeof INTERVENTION_STATUSES)[number];
export const INTERVENTION_ACTIONS = ["ASSIGN_SELF", "START", "LOG_ACTION", "SNOOZE", "RESOLVE", "FALSE_POSITIVE", "REOPEN"] as const;
export type MobileInterventionAction = (typeof INTERVENTION_ACTIONS)[number];

const option = v.object({ value: v.nonEmpty(), label: v.string() });

const interventionInbox = v.object({
  contractVersion: version,
  rows: v.array(
    v.object({
      id: v.nonEmpty(),
      studentName: v.string(),
      reasonCode: v.nonEmpty(),
      explanation: v.string(),
      suggestedAction: v.string(),
      evidenceCount: v.int(0),
      dueAt: v.iso(),
      status: v.oneOf(INTERVENTION_STATUSES),
      ownerName: v.nullable(v.string()),
      canAct: v.boolean(),
      firstActionAt: v.nullable(v.iso()),
      snoozedUntil: v.nullable(v.iso()),
      outcomeCode: v.nullable(v.string()),
      version: v.int(1),
      activities: v.array(
        v.object({
          id: v.nonEmpty(),
          type: v.nonEmpty(),
          note: v.nullable(v.string()),
          outcomeCode: v.nullable(v.string()),
          falsePositiveReason: v.nullable(v.string()),
          actorName: v.string(),
          createdAt: v.iso(),
        }),
      ),
    }),
  ),
  students: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
  vocabulary: v.object({
    reasons: v.array(option),
    statuses: v.array(option),
    outcomes: v.array(option),
    falsePositiveReasons: v.array(option),
    activities: v.array(option),
    manualReasons: v.array(option),
    snoozeDays: v.array(v.int(1)),
  }),
});
export type MobileInterventionInbox = Infer<typeof interventionInbox>;
export type MobileInterventionRow = MobileInterventionInbox["rows"][number];
export function parseInterventionInbox(input: unknown): ContractResult<MobileInterventionInbox> {
  return check(interventionInbox, input);
}

const interventionUpdate = v.object({ updated: v.literal(true) });
export function parseInterventionUpdate(input: unknown): ContractResult<Infer<typeof interventionUpdate>> {
  return check(interventionUpdate, input);
}
const interventionCreate = v.object({ id: v.nonEmpty() });
export function parseInterventionCreate(input: unknown): ContractResult<Infer<typeof interventionCreate>> {
  return check(interventionCreate, input);
}
const interventionGenerate = v.object({ createdCount: v.int(0), reactivatedCount: v.int(0), evaluatedStudentCount: v.int(0) });
export function parseInterventionGenerate(input: unknown): ContractResult<Infer<typeof interventionGenerate>> {
  return check(interventionGenerate, input);
}

/* ================================================================== *
 * RAPORLAR — `GET /api/panel/admin/reports` (Faz 2.1). Son 30 gün.
 * Web `app/panel/yonetim/raporlar` ile AYNI `loadAdminReports`. CSV dışa
 * aktarımı mobilde yok (E5); biçimlenmiş SLO değerleri sunucudan gelir.
 * ================================================================== */

const SLO_STATUSES = ["healthy", "breached", "observing", "insufficient_data"] as const;
const rate = v.nullable(v.int(0));

const reports = v.object({
  contractVersion: version,
  rangeDays: v.int(1),
  lessonCount: v.int(0),
  noteRate: v.int(0),
  attendanceRate: v.int(0),
  activeAssignments: v.int(0),
  overdueAssignments: v.int(0),
  emptyGroups: v.int(0),
  pendingPayments: v.int(0),
  review: v.nullable(v.object({ sevenDayRate: rate, eligible: v.int(0), retentionRate: rate, retentionAttempts: v.int(0) })),
  plan: v.nullable(v.object({ completionRate: rate, completed: v.int(0), generated: v.int(0) })),
  ai: v.nullable(v.object({ approvalRate: rate, reviewed: v.int(0), fallbackRate: rate, drafts: v.int(0), flagRate: rate, knownCostUsd: v.nullable(v.number()) })),
  slo: v.array(
    v.object({
      key: v.nonEmpty(),
      label: v.string(),
      status: v.oneOf(SLO_STATUSES),
      statusLabel: v.string(),
      display: v.string(),
      sampleSize: v.int(0),
      targetDisplay: v.nullable(v.string()),
      comparison: v.oneOf(["gte", "lte"] as const),
    }),
  ),
  teachers: v.array(v.object({ name: v.string(), total: v.int(0), completed: v.int(0), percent: v.int(0) })),
  groups: v.array(v.object({ id: v.nonEmpty(), name: v.string(), students: v.int(0), percent: v.int(0) })),
});
export type MobileAdminReports = Infer<typeof reports>;
export function parseAdminReports(input: unknown): ContractResult<MobileAdminReports> {
  return check(reports, input);
}

/* ================================================================== *
 * AKTİVASYON MASASI — `GET /api/panel/admin/activation-desk` (Faz 2.1)
 * Web `app/panel/yonetim/isler` ile AYNI `loadActivationDesk`.
 * Yazmalar MEVCUT uçlarla:
 *  - `POST /api/panel/orders/:id/onboarding` (taze step-up; 409/422),
 *  - `POST /api/panel/orders/:id/user` (taze step-up; bağlı siparişte 409),
 *  - `PATCH /api/panel/leads/:id`, `PATCH /api/panel/email-outbox/:id/retry`.
 * İzinli geçişler sunucuda hesaplanır (`allowedTransitions`); istemci
 * durum makinesi kurmaz.
 * ================================================================== */

const nullableRate = v.nullable(v.number());

const activationDesk = v.object({
  contractVersion: version,
  counts: v.object({ activations: v.int(0), openExceptions: v.int(0), emailQueue: v.int(0) }),
  firstLesson: v.object({
    medianHours: nullableRate,
    durationSample: v.int(0),
    participationRate: nullableRate,
    participationSample: v.int(0),
    waitingCount: v.int(0),
    missingAttendanceCount: v.int(0),
    paidCount: v.int(0),
    linkedLeadCount: v.int(0),
  }),
  placement: v.object({
    firstContactHours: nullableRate,
    firstContactSample: v.int(0),
    placementHours: nullableRate,
    placementSample: v.int(0),
    noSlotRate: nullableRate,
    onboardingCount: v.int(0),
    outcomes: v.object({ assigned: v.int(0), alternate: v.int(0), waitlist: v.int(0), refund: v.int(0) }),
  }),
  onboardings: v.array(
    v.object({
      id: v.nonEmpty(),
      orderId: v.nonEmpty(),
      state: v.nonEmpty(),
      stateLabel: v.string(),
      critical: v.boolean(),
      flowLabel: v.string(),
      nextAction: v.string(),
      packageName: v.string(),
      customer: v.string(),
      linkedToAccount: v.boolean(),
      totalLabel: v.string(),
      ownerId: v.nullable(v.string()),
      ownerName: v.nullable(v.string()),
      dueAt: v.nullable(v.iso()),
      overdue: v.boolean(),
      stateEnteredAt: v.iso(),
      preferences: v.nullable(v.string()),
      checklist: v.array(v.object({ key: v.nonEmpty(), label: v.string(), done: v.boolean() })),
      blockerReason: v.nullable(v.string()),
      allowedTransitions: v.array(option),
      transitions: v.array(v.object({ id: v.nonEmpty(), occurredAt: v.iso(), text: v.string() })),
    }),
  ),
  exceptions: v.array(
    v.object({
      id: v.nonEmpty(),
      title: v.string(),
      detail: v.string(),
      severity: v.oneOf(OPS_SEVERITIES),
      resolved: v.boolean(),
      owner: v.string(),
      nextAction: v.string(),
      dueAt: v.nullable(v.iso()),
      overdue: v.boolean(),
      createdAt: v.iso(),
      ctaLabel: v.string(),
      webPath: v.nullable(webPath),
    }),
  ),
  readiness: v.object({
    status: v.oneOf(["GO", "GAP"] as const),
    statusLabel: v.string(),
    rows: v.array(v.object({ task: v.string(), coverage: v.string(), status: v.oneOf(["GO", "GAP"] as const), statusLabel: v.string(), note: v.string() })),
  }),
  orders: v.array(v.object({ id: v.nonEmpty(), packageName: v.string(), customer: v.string(), linkedToAccount: v.boolean(), status: v.nonEmpty(), statusLabel: v.string(), paid: v.boolean(), totalLabel: v.string() })),
  leads: v.array(v.object({ id: v.nonEmpty(), fullName: v.string(), detail: v.string(), status: v.nonEmpty() })),
  leadStatuses: v.array(option),
  cron: v.object({
    ok: v.boolean(),
    jobs: v.array(
      v.object({
        name: v.nonEmpty(),
        label: v.string(),
        status: v.oneOf(["healthy", "stale", "failed", "missing"] as const),
        statusLabel: v.string(),
        lastSucceededAt: v.nullable(v.iso()),
        lastDurationMs: v.nullable(v.int(0)),
        processedCount: v.int(0),
        failedCount: v.int(0),
        errorCode: v.nullable(v.string()),
      }),
    ),
  }),
  emails: v.array(v.object({ id: v.nonEmpty(), subject: v.string(), status: v.nonEmpty(), statusLabel: v.string(), attempts: v.int(0), createdAt: v.iso(), retryable: v.boolean() })),
  students: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
  staff: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
});
export type MobileActivationDesk = Infer<typeof activationDesk>;
export type MobileOnboarding = MobileActivationDesk["onboardings"][number];
export function parseActivationDesk(input: unknown): ContractResult<MobileActivationDesk> {
  return check(activationDesk, input);
}

const okResult = v.object({ ok: v.literal(true) });
export function parseOkResult(input: unknown): ContractResult<Infer<typeof okResult>> {
  return check(okResult, input);
}

/* ================================================================== *
 * KİŞİLER & ERİŞİM — Faz 2.2
 *  - `GET /api/panel/admin/people?sekme&q&rol&urun&durum&sayfa` — web
 *    `app/panel/yonetim/kisiler` ile AYNI `loadPeopleDirectory`.
 *  - `GET /api/panel/admin/people/:userId` — web
 *    `app/panel/yonetim/kullanicilar/[id]` ile AYNI `loadPersonDetail`.
 * Yazmalar MEVCUT uçlarla (hepsi taze step-up): `POST /api/panel/users`,
 * `PATCH /api/panel/users/:id`, `POST …/status`, `POST …/reset-password`,
 * `PUT …/products`, `POST|DELETE …/staff-roles`, `PATCH …/coach-profile`,
 * `POST …/mfa-reset`, `POST /api/panel/mfa-resets/:id/approve`.
 * Toplu işlem mobil kapsamı dışında (E4).
 * ================================================================== */

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
export const MOBILE_ROLES_ALL = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
const tone = v.oneOf(["neutral", "info", "success", "warning", "critical"] as const);

const personSummary = v.object({
  id: v.nonEmpty(),
  name: v.string(),
  email: v.string(),
  role: v.oneOf(MOBILE_ROLES_ALL),
  roleLabel: v.string(),
  status: v.oneOf(USER_STATUSES),
  statusLabel: v.string(),
  statusTone: tone,
  invitePending: v.boolean(),
  lastLoginAt: v.nullable(v.iso()),
  detail: v.string(),
  badges: v.array(v.string()),
  /** Öğrencide Öğrenci 360 profil kimliği (web satırı da oraya açılır). */
  studentProfileId: v.optional(v.nullable(v.string()), null),
});

const pendingReset = v.object({
  id: v.nonEmpty(),
  targetId: v.nonEmpty(),
  targetName: v.string(),
  requestedByName: v.string(),
  reason: v.string(),
  createdAt: v.iso(),
  expiresAt: v.iso(),
  canApprove: v.boolean(),
});

const peopleDirectory = v.object({
  contractVersion: version,
  view: v.nonEmpty(),
  views: v.array(v.object({ id: v.nonEmpty(), label: v.string() })),
  roleFilterAllowed: v.boolean(),
  filters: v.object({ roles: v.array(v.object({ value: v.string(), label: v.string() })), products: v.array(v.object({ value: v.string(), label: v.string() })), statuses: v.array(v.object({ value: v.string(), label: v.string() })) }),
  query: v.object({ q: v.string(), rol: v.string(), urun: v.string(), durum: v.string() }),
  page: v.int(1),
  pages: v.int(1),
  total: v.int(0),
  people: v.array(personSummary),
  pendingMfaResets: v.array(pendingReset),
  /** Ödemesi alınmış, erişimi açılmamış öğrenci sayısı (web Öğrenciler sayfası başlığı). */
  studentsAwaitingAccess: v.optional(v.int(0), 0),
});
export type MobilePeopleDirectory = Infer<typeof peopleDirectory>;
export type MobilePersonSummary = Infer<typeof personSummary>;
export function parsePeopleDirectory(input: unknown): ContractResult<MobilePeopleDirectory> {
  return check(peopleDirectory, input);
}

const personDetail = v.object({
  contractVersion: version,
  id: v.nonEmpty(),
  name: v.string(),
  email: v.string(),
  phone: v.nullable(v.string()),
  role: v.oneOf(MOBILE_ROLES_ALL),
  roleLabel: v.string(),
  status: v.oneOf(USER_STATUSES),
  statusLabel: v.string(),
  statusTone: tone,
  invitePending: v.boolean(),
  isSelf: v.boolean(),
  createdAt: v.iso(),
  lastLoginAt: v.nullable(v.iso()),
  blockedOrder: v.nullable(v.object({ id: v.nonEmpty(), packageName: v.string(), createdAt: v.iso(), error: v.nullable(v.string()) })),
  profile: v.object({
    fullName: v.string(),
    phone: v.string(),
    classLevel: v.string(),
    schoolName: v.string(),
    targetGoal: v.string(),
    subjects: v.array(v.string()),
    bio: v.string(),
  }),
  memberships: v.array(
    v.object({
      id: v.nonEmpty(),
      productLabel: v.string(),
      sourceLabel: v.string(),
      startsAt: v.iso(),
      expiresAt: v.nullable(v.iso()),
      revokedAt: v.nullable(v.iso()),
      grantedBy: v.nullable(v.string()),
      orderPackage: v.nullable(v.string()),
      stateLabel: v.string(),
      stateTone: tone,
    }),
  ),
  productAccess: v.object({ editable: v.boolean(), active: v.array(v.oneOf(["OD", "OK", "ODK"] as const)), options: v.array(v.object({ value: v.oneOf(["OD", "OK", "ODK"] as const), label: v.string() })) }),
  orders: v.array(v.object({ id: v.nonEmpty(), packageName: v.string(), createdAt: v.iso(), statusText: v.string() })),
  staff: v.nullable(
    v.object({
      history: v.array(
        v.object({
          id: v.nonEmpty(),
          productLabel: v.string(),
          roleLabel: v.string(),
          grantedAt: v.iso(),
          grantedBy: v.nullable(v.string()),
          grantReason: v.nullable(v.string()),
          revokedAt: v.nullable(v.iso()),
          revokedBy: v.nullable(v.string()),
          revokeReason: v.nullable(v.string()),
          lastHolder: v.boolean(),
        }),
      ),
      options: v.array(v.object({ product: v.nonEmpty(), role: v.nonEmpty(), label: v.string() })),
      coachCapacity: v.nullable(v.int(0)),
      mfaPending: v.boolean(),
    }),
  ),
  relations: v.object({
    groups: v.array(v.object({ id: v.nonEmpty(), label: v.string(), detail: v.string() })),
    parents: v.array(v.object({ id: v.nonEmpty(), name: v.string(), relationship: v.string() })),
    children: v.array(v.object({ id: v.nonEmpty(), name: v.string(), relationship: v.string() })),
    coach: v.nullable(v.string()),
    attendance: v.nullable(v.string()),
    notes: v.array(v.object({ id: v.nonEmpty(), title: v.string(), body: v.string() })),
    teacher: v.nullable(
      v.object({
        subjects: v.string(),
        coach: v.string(),
        groupsAndStudents: v.string(),
        upcomingLessons: v.int(0),
        pendingClosures: v.int(0),
        openHelp: v.int(0),
        openInterventionsAndCoaching: v.int(0),
      }),
    ),
    branchStudents: v.array(v.object({ id: v.nonEmpty(), studentId: v.nonEmpty(), name: v.string(), subject: v.string() })),
    recentLessons: v.array(v.object({ id: v.nonEmpty(), title: v.string(), detail: v.string() })),
  }),
  security: v.object({
    mfaLabel: v.string(),
    pendingResets: v.array(pendingReset),
    canRequestReset: v.boolean(),
  }),
  history: v.array(v.object({ id: v.nonEmpty(), action: v.string(), summary: v.string(), createdAt: v.iso(), actorName: v.string() })),
  /** Öğrenci + `accessibilityProfile` bayrağı açıkken; `expectedVersion` ile kaydedilir. */
  accessibility: v.optional(v.nullable(v.object({ version: v.int(0), assessmentExtraPercent: v.int(0), breaksAllowed: v.boolean(), options: v.array(v.int(0)) })), null),
  /** Kayıt ve iletişim özeti (öğrenci / veli; kayıt yoksa null). */
  signup: v.optional(
    v.nullable(
      v.object({
        rows: v.array(v.object({ label: v.string(), value: v.string() })),
        note: v.nullable(v.string()),
        pendingChildren: v.array(v.object({ id: v.nonEmpty(), text: v.string() })),
        formFields: v.array(v.object({ label: v.string(), value: v.string() })),
      }),
    ),
    null,
  ),
  /** Öğretmen: branş bağlantısı kurulabilecek öğrenciler (web ile aynı ilk 80). */
  linkableStudents: v.optional(v.array(v.object({ id: v.nonEmpty(), name: v.string() })), []),
});
export type MobilePersonDetail = Infer<typeof personDetail>;
export function parsePersonDetail(input: unknown): ContractResult<MobilePersonDetail> {
  return check(personDetail, input);
}

const inviteResult = v.object({ invite: v.object({ url: v.nonEmpty(), message: v.string(), expiresAt: v.iso() }) });
export type MobileInviteResult = Infer<typeof inviteResult>;
export function parseInviteResult(input: unknown): ContractResult<MobileInviteResult> {
  return check(inviteResult, input);
}

/* ------------------------------------------------------------------ *
 * Kişi detayı ön izlemeleri (mevcut uçlar; hepsi taze step-up):
 *  - `GET /api/panel/users/:id` → silme ön koşulları,
 *  - `GET /api/panel/users/:id/archive-impact` → arşiv etkisi,
 *  - `GET /api/panel/users/:id/offboarding` → öğretmen devir ön izlemesi.
 * ------------------------------------------------------------------ */

const blocker = v.object({ code: v.nonEmpty(), label: v.string(), count: v.int(0) });

const deletePreview = v.object({ canDelete: v.boolean(), blockers: v.array(blocker), suggestedAction: v.oneOf(["DELETE", "ARCHIVE", "SUSPEND"] as const) });
export type MobileDeletePreview = Infer<typeof deletePreview>;
export function parseDeletePreview(input: unknown): ContractResult<MobileDeletePreview> {
  return check(deletePreview, input);
}

const archiveImpact = v.object({
  canHardDelete: v.boolean(),
  recommendArchive: v.boolean(),
  buckets: v.array(v.object({ key: v.nonEmpty(), label: v.string(), count: v.int(0), severity: v.oneOf(["info", "warning", "blocking"] as const) })),
  message: v.string(),
});
export type MobileArchiveImpact = Infer<typeof archiveImpact>;
export function parseArchiveImpact(input: unknown): ContractResult<MobileArchiveImpact> {
  return check(archiveImpact, input);
}

const person = v.object({ id: v.nonEmpty(), name: v.string(), email: v.string() });
const offboardingPreview = v.object({
  teacher: v.object({ id: v.nonEmpty(), name: v.string(), email: v.string(), status: v.oneOf(USER_STATUSES), subjects: v.array(v.string()), isCoach: v.boolean(), coachCapacity: v.nullable(v.int(0)) }),
  counts: v.object({ activeGroups: v.int(0), upcomingLessons: v.int(0), pendingLessonClosures: v.int(0), openHelpRequests: v.int(0), coachAssignments: v.int(0), openInterventions: v.int(0) }),
  blockers: v.array(blocker),
  options: v.object({
    teacherTransfers: v.array(v.object({ id: v.nonEmpty(), name: v.string(), email: v.string(), isCoach: v.boolean() })),
    coachTransfers: v.array(person),
    interventionOwners: v.array(v.object({ id: v.nonEmpty(), role: v.string(), name: v.string(), email: v.string() })),
  }),
});
export type MobileOffboardingPreview = Infer<typeof offboardingPreview>;
export function parseOffboardingPreview(input: unknown): ContractResult<MobileOffboardingPreview> {
  return check(offboardingPreview, input);
}

/* ================================================================== *
 * VELİLER — `GET /api/panel/admin/parents?q&durum&sayfa` (Faz 2.2).
 * Web `app/panel/yonetim/veliler` ile AYNI `loadParentsPage`. Yazmalar:
 * `POST /api/panel/relationships`, `PATCH|DELETE /api/panel/relationships/:id`
 * (taze step-up).
 * ================================================================== */

const parentsPage = v.object({
  contractVersion: version,
  query: v.object({ q: v.string(), durum: v.string() }),
  statuses: v.array(v.object({ value: v.string(), label: v.string() })),
  page: v.int(1),
  pages: v.int(1),
  total: v.int(0),
  withoutRelationshipCount: v.int(0),
  parents: v.array(v.object({ id: v.nonEmpty(), name: v.string(), email: v.string(), statusLabel: v.string(), attention: v.boolean(), studentCount: v.int(0), students: v.string() })),
  relationships: v.array(v.object({ id: v.nonEmpty(), parentId: v.nonEmpty(), parentName: v.string(), studentName: v.string(), relationship: v.nullable(v.string()) })),
  history: v.array(v.object({ id: v.nonEmpty(), title: v.string(), actionLabel: v.string(), detail: v.string() })),
  parentOptions: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
  studentOptions: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
});
export type MobileParentsPage = Infer<typeof parentsPage>;
export function parseParentsPage(input: unknown): ContractResult<MobileParentsPage> {
  return check(parentsPage, input);
}

/* ================================================================== *
 * ÖĞRETMENLER VE DOLULUK — `GET /api/panel/admin/educators` (Faz 2.2).
 * Web `app/panel/yonetim/egitmenler` ile AYNI `loadEducators`.
 * ================================================================== */

const educators = v.object({
  contractVersion: version,
  overCapacity: v.int(0),
  teachers: v.array(v.object({ id: v.nonEmpty(), name: v.string(), active: v.boolean(), statusLabel: v.string(), subjects: v.string(), levels: v.string(), fill: v.string(), over: v.boolean() })),
});
export type MobileEducators = Infer<typeof educators>;
export function parseEducators(input: unknown): ContractResult<MobileEducators> {
  return check(educators, input);
}

/* ================================================================== *
 * YENİ KAYITLAR — `GET /api/panel/admin/signups?sekme&filtre&sayfa` (Faz 2.2).
 * Web `app/panel/yonetim/basvurular` ile AYNI yükleyiciler. Yazmalar:
 * `PATCH /api/panel/signups/:userId/contact` (iletişim durumu + not),
 * `POST /api/panel/signups/children/:id/account` (çocuk hesabı; taze step-up).
 * ================================================================== */

const signups = v.object({
  contractVersion: version,
  tab: v.oneOf(["kayitlar", "cocuklar"] as const),
  counts: v.object({ newCount: v.int(0), pendingCount: v.int(0) }),
  filters: v.array(v.object({ value: v.string(), label: v.string() })),
  filter: v.string(),
  contactStatuses: v.array(v.object({ value: v.string(), label: v.string() })),
  page: v.int(1),
  pages: v.int(1),
  total: v.int(0),
  signups: v.array(
    v.object({
      id: v.nonEmpty(),
      name: v.string(),
      roleLabel: v.string(),
      email: v.string(),
      phone: v.nullable(v.string()),
      whatsAppUrl: v.nullable(v.string()),
      createdAt: v.iso(),
      interested: v.string(),
      purchase: v.object({ label: v.string(), tone: tone }),
      formDone: v.boolean(),
      contactStatus: v.string(),
      contactStatusLabel: v.string(),
      contactNote: v.nullable(v.string()),
      contactedAt: v.nullable(v.iso()),
      details: v.array(v.object({ label: v.string(), value: v.string() })),
    }),
  ),
  children: v.array(
    v.object({
      id: v.nonEmpty(),
      name: v.string(),
      detail: v.string(),
      paid: v.boolean(),
      packages: v.string(),
      parentId: v.nonEmpty(),
      parentName: v.string(),
      parentContact: v.string(),
      parentPhone: v.nullable(v.string()),
      childContact: v.nullable(v.string()),
      defaultEmail: v.nullable(v.string()),
    }),
  ),
});
export type MobileSignups = Infer<typeof signups>;
export function parseSignups(input: unknown): ContractResult<MobileSignups> {
  return check(signups, input);
}

const childAccountResult = v.object({
  student: v.object({ id: v.nonEmpty(), email: v.string(), fullName: v.string(), linkedExisting: v.boolean() }),
  invite: v.nullable(v.object({ url: v.nonEmpty(), message: v.string(), expiresAt: v.iso() })),
  /** Ödenmiş siparişlerin erişim açma sonuçları (web formuyla aynı özet). */
  provisioning: v.optional(v.array(v.object({ orderId: v.nonEmpty(), product: v.string(), outcome: v.string() })), []),
});
export type MobileChildAccountResult = Infer<typeof childAccountResult>;
export function parseChildAccountResult(input: unknown): ContractResult<MobileChildAccountResult> {
  return check(childAccountResult, input);
}

/* ================================================================== *
 * ÖĞRENCİ 360 — `GET /api/panel/admin/students/:profileId?sekme&gorunum`
 * (Faz 2.2). Web `app/panel/yonetim/ogrenciler/[id]` ile AYNI
 * `loadStudent360Bundle` ve AYNI üst sekme / alt görünüm kuralları. Bölümler
 * sunucuda karta çevrilir (etiket, sayı, ton); istemci hesap yapmaz.
 * Yazmalar: `POST /api/panel/admin/coach-assignments`,
 * `POST /api/panel/admin/orders/:id/provisioning-retry`.
 * ================================================================== */

const card = v.object({
  id: v.nonEmpty(),
  title: v.string(),
  metrics: v.array(v.object({ label: v.string(), value: v.string(), hint: v.nullable(v.string()), tone: tone })),
  rows: v.array(v.object({ title: v.string(), subtitle: v.nullable(v.string()), meta: v.nullable(v.string()), badge: v.nullable(v.object({ label: v.string(), tone: tone })) })),
  empty: v.nullable(v.string()),
});
export type MobileStudentCard = Infer<typeof card>;

const student360 = v.object({
  contractVersion: version,
  studentProfileId: v.nonEmpty(),
  studentUserId: v.nonEmpty(),
  summary: v.object({
    name: v.string(),
    email: v.string(),
    detail: v.string(),
    products: v.string(),
    groups: v.string(),
    coach: v.nullable(v.string()),
    packageStatus: v.object({ label: v.string(), tone: tone }),
    risk: v.object({ label: v.string(), tone: tone, reasons: v.array(v.string()) }),
    lastActivityAt: v.nullable(v.iso()),
  }),
  group: v.nonEmpty(),
  groups: v.array(v.object({ id: v.nonEmpty(), label: v.string() })),
  view: v.nullable(v.string()),
  views: v.array(v.object({ id: v.nonEmpty(), label: v.string() })),
  cards: v.array(card),
  coach: v.object({ revision: v.optional(v.nullable(v.nonEmpty()), null), currentCoachId: v.nullable(v.string()), cadenceDays: v.nullable(v.int(0)), options: v.array(v.object({ id: v.nonEmpty(), label: v.string() })) }),
  blockedOrders: v.array(v.object({ id: v.nonEmpty(), packageName: v.string(), revision: v.optional(v.nullable(v.nonEmpty()), null) })),
  /**
   * Yalnız ADMIN: web Veli / Branş öğretmenleri panellerindeki bağlantı
   * yönetimi. Listeler ilgili sekme yüklendiğinde dolu, yoksa null. Yazmalar
   * `relationships*` ve `student-teachers` uçları (web ile aynı).
   */
  manage: v.optional(
    v.nullable(
      v.object({
        parents: v.nullable(v.array(v.object({ id: v.nonEmpty(), name: v.string(), detail: v.string() }))),
        teachers: v.nullable(v.array(v.object({ id: v.nonEmpty(), name: v.string(), subject: v.string() }))),
        parentOptions: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
        teacherOptions: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
      }),
    ),
    null,
  ),
});
export type MobileStudent360 = Infer<typeof student360>;
export function parseStudent360(input: unknown): ContractResult<MobileStudent360> {
  return check(student360, input);
}

const provisioningRetry = v.object({ ok: v.literal(true), outcome: v.string(), succeeded: v.boolean(), message: v.string() });
export type MobileProvisioningRetry = Infer<typeof provisioningRetry>;
export function parseProvisioningRetry(input: unknown): ContractResult<MobileProvisioningRetry> {
  return check(provisioningRetry, input);
}
