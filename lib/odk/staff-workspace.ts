import type { OdkAttemptStatus, OdkExamStatus } from "@prisma/client";
import type { StaffPermission } from "@/lib/products/staff-permission-matrix";

/**
 * DENEME LİGİ PERSONEL ÇALIŞMA ALANI — saf kurallar (docs/panel-design-roadmap.md
 * §11.8, §15). Sayfalar veriyi sunucuda okur; görünüm, dikkat satırı, sekme ve
 * hazırlık kararları burada verilir ki izin filtresi test edilebilir kalsın.
 * Buradaki her karar SUNUMDUR: uçlar ve sayfa guard'ları izni ayrıca doğrular.
 */

export type StaffPermissionSet = ReadonlySet<StaffPermission>;

/* ── Denemeler: kayıtlı görünümler (§15.4) ───────────────────────────── */

export const ODK_EXAM_VIEWS = [
  { id: "hazirlik", label: "Hazırlıkta" },
  { id: "planlanan", label: "Planlanan" },
  { id: "canli", label: "Canlı" },
  { id: "puanlama", label: "Puanlama bekliyor" },
  { id: "yayinlandi", label: "Yayınlandı" },
  { id: "arsiv", label: "Arşiv" },
  { id: "tumu", label: "Tümü" },
] as const;
export type OdkExamViewId = (typeof ODK_EXAM_VIEWS)[number]["id"];

export type ExamLifecycleInput = { status: OdkExamStatus; startsAt: Date | null; endsAt: Date | null };

/** Sınav penceresi bitti mi (durum henüz ENDED'a geçmemiş olsa da). */
export function examWindowEnded(exam: ExamLifecycleInput, now: Date): boolean {
  return Boolean(exam.endsAt && exam.endsAt <= now);
}

/** Denemenin düştüğü tek görünüm ("tumu" hariç). */
export function examViewOf(exam: ExamLifecycleInput, now: Date): Exclude<OdkExamViewId, "tumu"> {
  switch (exam.status) {
    case "DRAFT":
    case "READY":
      return "hazirlik";
    case "SCHEDULED":
    case "LIVE":
      if (examWindowEnded(exam, now)) return "puanlama";
      if (exam.status === "LIVE" || (exam.startsAt && exam.startsAt <= now)) return "canli";
      return "planlanan";
    case "ENDED":
    case "SCORED":
      return "puanlama";
    case "RELEASED":
      return "yayinlandi";
    default:
      return "arsiv";
  }
}

export function isOdkExamView(value: string | undefined): value is OdkExamViewId {
  return ODK_EXAM_VIEWS.some((view) => view.id === value);
}

/**
 * Rol varsayılan görünümü: ADMIN her şeyi görür; editör → Hazırlıkta,
 * operatör → Planlanan, yayıncı → Puanlama bekliyor. Birden çok rolü olan
 * personelde iş akışı sırası (hazırlık → plan → puanlama) belirleyicidir.
 */
export function defaultExamView(input: { isAdmin: boolean; permissions: StaffPermissionSet }): OdkExamViewId {
  if (input.isAdmin) return "tumu";
  if (input.permissions.has("odk:exam:edit")) return "hazirlik";
  if (input.permissions.has("odk:exam:schedule") || input.permissions.has("odk:exam:assign")) return "planlanan";
  if (input.permissions.has("odk:result:score")) return "puanlama";
  return "tumu";
}

/* ── Personel ana sayfası: dikkat bekleyenler (§11.8) ────────────────── */

export type AttentionKind = "PREP" | "SCORE" | "RELEASE" | "INTEGRITY";
export type AttentionRow = {
  key: string;
  kind: AttentionKind;
  tone: "critical" | "warning" | "info";
  title: string;
  actionLabel: string;
  href: string;
};

const ATTENTION_PERMISSION: Record<AttentionKind, StaffPermission> = {
  PREP: "odk:exam:edit",
  SCORE: "odk:result:score",
  RELEASE: "odk:result:release",
  INTEGRITY: "odk:integrity:review",
};

export type AttentionInput = {
  /** Hazırlıktaki (DRAFT) denemeler ve bloke eden hazırlık sorunu sayısı. */
  prep: Array<{ id: string; title: string; blockingIssues: number; firstIssue?: string }>;
  /** Penceresi bitmiş, puanı olmayan teslimleri bulunan denemeler. */
  unscored: Array<{ id: string; title: string; count: number }>;
  /** Puanlanmış ama yayınlanmamış denemeler. */
  awaitingRelease: Array<{ id: string; title: string }>;
  /** İncelenmemiş bütünlük sinyali olan deneme sayısı (deneme → sayı). */
  integrity: Array<{ id: string; title: string; count: number }>;
};

export function examWorkspaceHref(examId: string, tab?: string): string {
  return `/panel/odk/yonetim/sinavlar/${examId}${tab ? `?sekme=${tab}` : ""}`;
}

/** Dikkat satırları; her satır yalnız izni olan personele gösterilir. */
export function staffAttentionRows(input: AttentionInput, permissions: StaffPermissionSet): AttentionRow[] {
  const rows: AttentionRow[] = [];
  for (const exam of input.prep) {
    if (exam.blockingIssues <= 0) continue;
    rows.push({
      key: `prep:${exam.id}`,
      kind: "PREP",
      tone: "critical",
      title: `${exam.title} hazırlıkta: ${exam.blockingIssues} bloke eden sorun${exam.firstIssue ? ` · ${exam.firstIssue}` : ""}`,
      actionLabel: "Hazırlığa git",
      href: examWorkspaceHref(exam.id, "genel"),
    });
  }
  for (const exam of input.unscored) {
    if (exam.count <= 0) continue;
    rows.push({
      key: `score:${exam.id}`,
      kind: "SCORE",
      tone: "critical",
      title: `${exam.title} bitti, ${exam.count} teslim puanlanmadı`,
      actionLabel: "Puanla",
      href: examWorkspaceHref(exam.id, "puanlama"),
    });
  }
  for (const exam of input.awaitingRelease) {
    rows.push({
      key: `release:${exam.id}`,
      kind: "RELEASE",
      tone: "warning",
      title: `${exam.title} puanlandı, yayın bekliyor`,
      actionLabel: "Yayın önizleme",
      href: examWorkspaceHref(exam.id, "puanlama"),
    });
  }
  const integrityTotal = input.integrity.reduce((sum, item) => sum + item.count, 0);
  if (integrityTotal > 0) {
    const single = input.integrity.length === 1 ? input.integrity[0] : null;
    // Birden çok denemede: en çok sinyali olan denemenin Bütünlük sekmesinden başlanır.
    const busiest = [...input.integrity].sort((x, y) => y.count - x.count)[0]!;
    rows.push({
      key: "integrity",
      kind: "INTEGRITY",
      tone: "info",
      title: single
        ? `${single.title}: ${integrityTotal} deneme bütünlük incelemesi bekliyor`
        : `${integrityTotal} deneme bütünlük incelemesi bekliyor`,
      actionLabel: "İncele",
      href: examWorkspaceHref(busiest.id, "butunluk"),
    });
  }
  return rows.filter((row) => permissions.has(ATTENTION_PERMISSION[row.kind]));
}

/* ── Deneme çalışma alanı: sekmeler ve birincil eylem (§15.2) ────────── */

export type ExamCapabilities = {
  edit: boolean;
  schedule: boolean;
  assign: boolean;
  ops: boolean;
  score: boolean;
  rescore: boolean;
  release: boolean;
  integrity: boolean;
  reports: boolean;
};

export function examCapabilities(permissions: StaffPermissionSet): ExamCapabilities {
  return {
    edit: permissions.has("odk:exam:edit"),
    schedule: permissions.has("odk:exam:schedule"),
    assign: permissions.has("odk:exam:assign"),
    ops: permissions.has("odk:ops:live"),
    score: permissions.has("odk:result:score"),
    rescore: permissions.has("odk:key:revise"),
    release: permissions.has("odk:result:release"),
    integrity: permissions.has("odk:integrity:review"),
    reports: permissions.has("odk:report:read_all"),
  };
}

export const EXAM_WORKSPACE_TABS = [
  { id: "genel", label: "Genel" },
  { id: "icerik", label: "İçerik" },
  { id: "sorular", label: "Sorular" },
  { id: "oturumlar", label: "Oturumlar" },
  { id: "zamanlama", label: "Zamanlama" },
  { id: "katilimcilar", label: "Katılımcılar" },
  { id: "onizleme", label: "Önizleme" },
  { id: "canli", label: "Canlı" },
  { id: "puanlama", label: "Puanlama ve yayın" },
  { id: "butunluk", label: "Bütünlük" },
  { id: "raporlar", label: "Raporlar" },
  { id: "gecmis", label: "Geçmiş" },
] as const;
export type ExamWorkspaceTabId = (typeof EXAM_WORKSPACE_TABS)[number]["id"];

/**
 * Görülebilen sekmeler — kullanılamayan sekme HİÇ çizilmez. Zamanlama hem
 * planlama (editör) hem planlama yayını (operatör) içerir; Oturumlar yalnız
 * oturum planı olan (LGS tam) denemelerde görünür.
 */
export function visibleExamTabs(caps: ExamCapabilities, options: { hasSessions: boolean }): Array<(typeof EXAM_WORKSPACE_TABS)[number]> {
  const allowed: Record<ExamWorkspaceTabId, boolean> = {
    genel: true,
    icerik: caps.edit,
    sorular: caps.edit,
    oturumlar: options.hasSessions,
    zamanlama: caps.edit || caps.schedule,
    katilimcilar: caps.assign,
    onizleme: caps.edit,
    canli: caps.ops,
    puanlama: caps.score || caps.rescore,
    butunluk: caps.integrity,
    raporlar: caps.reports,
    gecmis: true,
  };
  return EXAM_WORKSPACE_TABS.filter((tab) => allowed[tab.id]);
}

/** Eski bölüm çapaları → sekme (başka sayfalar `#adim-sonuc` gibi bağlantı verir). */
export const EXAM_ANCHOR_TABS: Record<string, ExamWorkspaceTabId> = {
  "adim-1": "zamanlama",
  "adim-2": "icerik",
  "adim-3": "sorular",
  "adim-4": "zamanlama",
  "adim-5": "puanlama",
  "adim-7": "katilimcilar",
  "adim-8": "zamanlama",
  "adim-9": "onizleme",
  "adim-json": "icerik",
  "adim-sonuc": "puanlama",
  "adim-integrity": "butunluk",
};

export function resolveExamTab(requested: string | undefined, visible: ReadonlyArray<{ id: string }>): ExamWorkspaceTabId {
  const match = visible.find((tab) => tab.id === requested);
  return (match?.id ?? "genel") as ExamWorkspaceTabId;
}

export type PrimaryAction = { label: string; tab: ExamWorkspaceTabId } | null;

/** Yaşam döngüsü ve izne göre başlıktaki tek birincil eylem. */
export function examPrimaryAction(status: OdkExamStatus, caps: ExamCapabilities, windowEnded: boolean): PrimaryAction {
  if (status === "DRAFT" && caps.edit) return { label: "Hazır olarak işaretle", tab: "zamanlama" };
  if (status === "READY" && caps.schedule) return { label: "Planla", tab: "zamanlama" };
  if ((status === "ENDED" || ((status === "SCHEDULED" || status === "LIVE") && windowEnded)) && caps.score) {
    return { label: "Puanla", tab: "puanlama" };
  }
  if (status === "SCORED" && caps.release) return { label: "Yayın önizleme", tab: "puanlama" };
  return null;
}

/* ── Hazırlık rayı (§15.3) ───────────────────────────────────────────── */

export type ReadinessIssue = { level: "error" | "warning"; code: string; message: string; questionNumber?: number };
export type ReadinessItem = { id: string; label: string; ok: boolean; detail: string; href?: string };

const STRUCTURE_CODES = new Set([
  "VERSION_MISSING",
  "INVALID_DURATION",
  "SCORING_POLICY_MISMATCH",
  "SECTION_MISSING",
  "SECTION_TEMPLATE_MISMATCH",
  "SECTION_QUESTION_COUNT_NONSTANDARD",
  "DUPLICATE_SECTION",
  "QUESTION_COUNT_MISMATCH",
  "DUPLICATE_QUESTION",
  "QUESTION_OUT_OF_RANGE",
]);

function countErrors(issues: readonly ReadinessIssue[], predicate: (code: string) => boolean) {
  return issues.filter((issue) => issue.level === "error" && predicate(issue.code)).length;
}

export function readinessChecklist(input: {
  examId: string;
  questionCount: number;
  sectionCount: number;
  hasBooklet: boolean;
  issues: readonly ReadinessIssue[];
  securityLabel: string;
}): { items: ReadinessItem[]; done: number } {
  const { examId, issues } = input;
  const structureErrors = countErrors(issues, (code) => STRUCTURE_CODES.has(code));
  const bookletMissing = countErrors(issues, (code) => code === "BOOKLET_MISSING") > 0;
  const outcomeErrors = countErrors(issues, (code) => code.includes("OUTCOME"));
  const answerErrors = countErrors(issues, (code) => code === "ANSWER_MISSING");
  const items: ReadinessItem[] = [
    {
      id: "yapi",
      label: "Yapı",
      ok: structureErrors === 0,
      detail: structureErrors ? `${structureErrors} yapı sorunu` : `${input.questionCount} soru, ${input.sectionCount} bölüm`,
      href: structureErrors ? examWorkspaceHref(examId, "icerik") : undefined,
    },
    {
      id: "kitapcik",
      label: "Kitapçık PDF",
      ok: !bookletMissing,
      detail: bookletMissing ? "Kitapçık yüklenmedi" : input.hasBooklet ? "Yüklendi" : "Dijital sorular · gerekmiyor",
      href: bookletMissing ? examWorkspaceHref(examId, "icerik") : undefined,
    },
    {
      id: "kazanim",
      label: "Kazanım eşlemesi",
      ok: outcomeErrors === 0,
      detail: outcomeErrors ? `${outcomeErrors} soruda kazanım yok` : "Tüm sorular eşlendi",
      href: outcomeErrors ? `${examWorkspaceHref(examId, "sorular")}&filtre=kazanimsiz` : undefined,
    },
    {
      id: "anahtar",
      label: "Cevap anahtarı",
      ok: answerErrors === 0,
      detail: answerErrors ? `${answerErrors} soruda cevap yok` : "Tamam",
      href: answerErrors ? `${examWorkspaceHref(examId, "sorular")}&filtre=anahtarsiz` : undefined,
    },
    { id: "guvenlik", label: "Güvenlik politikası", ok: true, detail: input.securityLabel },
  ];
  return { items, done: items.filter((item) => item.ok).length };
}

/* ── Sorular sekmesi filtreleri ──────────────────────────────────────── */

export type QuestionFilter = "tumu" | "kazanimsiz" | "anahtarsiz";

export function parseQuestionFilter(value: string | undefined): QuestionFilter {
  return value === "kazanimsiz" || value === "anahtarsiz" ? value : "tumu";
}

export function questionMatchesFilter(
  question: { correctOption: string | null; outcomeIds: readonly string[]; primaryOutcomeId: string | null },
  filter: QuestionFilter,
): boolean {
  if (filter === "kazanimsiz") return question.outcomeIds.length === 0 && !question.primaryOutcomeId;
  if (filter === "anahtarsiz") return !question.correctOption;
  return true;
}

/* ── Canlı operasyon (§15.5) ─────────────────────────────────────────── */

export type OpsAttempt = {
  status: OdkAttemptStatus;
  deadlineAt: Date;
  lastActivityAt: Date;
  integrityLevel: "NORMAL" | "REVIEW" | "HIGH";
  integrityReviewedAt: Date | null;
};

export type OpsState = "IN_PROGRESS" | "DISCONNECTED" | "SUBMITTED" | "AUTO_SUBMITTED" | "REVIEW" | "OTHER";

export const OPS_STALE_MS = 2 * 60_000;

export function opsStateOf(attempt: OpsAttempt, now: Date): OpsState {
  if (attempt.status === "IN_PROGRESS") {
    if (attempt.deadlineAt <= now) return "OTHER";
    return now.getTime() - attempt.lastActivityAt.getTime() > OPS_STALE_MS ? "DISCONNECTED" : "IN_PROGRESS";
  }
  if (attempt.status === "SUBMITTED") return "SUBMITTED";
  if (attempt.status === "AUTO_SUBMITTED") return "AUTO_SUBMITTED";
  if (attempt.status === "REVIEW_REQUIRED") return "REVIEW";
  return "OTHER";
}

export type OpsCounters = {
  notStarted: number;
  inProgress: number;
  disconnected: number;
  submitted: number;
  autoSubmitted: number;
  review: number;
};

/** Tek satırlık sayaçlar. `assigned` aktif atama sayısıdır; başlamayan = atanan − deneme kaydı. */
export function opsCounters(attempts: readonly OpsAttempt[], assigned: number, now: Date): OpsCounters {
  const counters: OpsCounters = { notStarted: Math.max(0, assigned - attempts.length), inProgress: 0, disconnected: 0, submitted: 0, autoSubmitted: 0, review: 0 };
  for (const attempt of attempts) {
    const state = opsStateOf(attempt, now);
    if (state === "IN_PROGRESS") counters.inProgress += 1;
    else if (state === "DISCONNECTED") counters.disconnected += 1;
    else if (state === "SUBMITTED") counters.submitted += 1;
    else if (state === "AUTO_SUBMITTED") counters.autoSubmitted += 1;
    if (state === "REVIEW" || (attempt.integrityLevel !== "NORMAL" && !attempt.integrityReviewedAt)) counters.review += 1;
  }
  return counters;
}

export const OPS_STATUS_FILTERS = ["tumu", "devam", "kopuk", "teslim", "inceleme"] as const;
export type OpsStatusFilter = (typeof OPS_STATUS_FILTERS)[number];
export const OPS_HEARTBEAT_FILTERS = ["tumu", "2", "5", "10"] as const;
export type OpsHeartbeatFilter = (typeof OPS_HEARTBEAT_FILTERS)[number];

export function parseOpsFilter<T extends string>(value: string | undefined, allowed: readonly T[]): T {
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : allowed[0];
}

export function opsAttemptMatches(
  attempt: OpsAttempt,
  filters: { status: OpsStatusFilter; integrity: "tumu" | "REVIEW" | "HIGH"; heartbeat: OpsHeartbeatFilter },
  now: Date,
): boolean {
  const state = opsStateOf(attempt, now);
  const statusOk =
    filters.status === "tumu" ||
    (filters.status === "devam" && state === "IN_PROGRESS") ||
    (filters.status === "kopuk" && state === "DISCONNECTED") ||
    (filters.status === "teslim" && (state === "SUBMITTED" || state === "AUTO_SUBMITTED")) ||
    (filters.status === "inceleme" && (state === "REVIEW" || (attempt.integrityLevel !== "NORMAL" && !attempt.integrityReviewedAt)));
  const integrityOk =
    filters.integrity === "tumu" ||
    (filters.integrity === "REVIEW" ? attempt.integrityLevel !== "NORMAL" : attempt.integrityLevel === "HIGH");
  const heartbeatOk =
    filters.heartbeat === "tumu" ||
    (attempt.status === "IN_PROGRESS" && now.getTime() - attempt.lastActivityAt.getTime() > Number(filters.heartbeat) * 60_000);
  return statusOk && integrityOk && heartbeatOk;
}

/* ── Puanlama ve yayın kuyruğu (§15.4, §15.6) ────────────────────────── */

export type PublicationStage = "BEKLIYOR" | "PUANLANIYOR" | "INCELEME" | "YAYINLANDI";

export const PUBLICATION_STAGES: Array<{ id: PublicationStage; label: string; tone: "warning" | "info" | "success" | "critical" }> = [
  { id: "PUANLANIYOR", label: "Puanlama bekliyor", tone: "critical" },
  { id: "INCELEME", label: "İnceleme / yayın bekliyor", tone: "warning" },
  { id: "BEKLIYOR", label: "Sınav sürüyor", tone: "info" },
  { id: "YAYINLANDI", label: "Yayınlandı", tone: "success" },
];

/**
 * Yayın akışındaki aşama: ENDED (ya da penceresi bitmiş planlı/canlı) ve puanı
 * eksik teslim → Puanlama; SCORED → İnceleme/yayın; RELEASED → Yayınlandı.
 * "Puanlama başarısız" kalıcı durumu yok (DENEME); geçici olarak penceresi
 * bitmiş ama puansız teslimler "Puanlama bekliyor" sayılır.
 */
export function publicationStageOf(input: ExamLifecycleInput & { unscored: number }, now: Date): PublicationStage {
  if (input.status === "RELEASED") return "YAYINLANDI";
  if (input.status === "SCORED") return input.unscored > 0 ? "PUANLANIYOR" : "INCELEME";
  if (input.status === "ENDED" || examWindowEnded(input, now)) return "PUANLANIYOR";
  return "BEKLIYOR";
}

/* ── Etkinlik akışı (ana sayfa "Son etkinlik", çalışma alanı "Geçmiş") ─ */

export type ActivityEvent = { id: string; at: Date; label: string; examId: string; examTitle: string; actor?: string | null };

const IMPORT_KIND_LABEL = { ANSWER_KEY: "Cevap anahtarı", OUTCOME: "Kazanım eşlemesi" } as const;
const IMPORT_STATUS_LABEL = { PREVIEW: "önizlendi", COMMITTED: "içe aktarıldı", REJECTED: "reddedildi" } as const;

/** Durum zaman damgalarından okunan olaylar (ayrı olay tablosu yok). */
export function examLifecycleEvents(exam: {
  id: string;
  title: string;
  createdAt: Date;
  contentLockedAt: Date | null;
  publishedAt: Date | null;
  resultsReleasedAt: Date | null;
  answerKeyReleasedAt: Date | null;
}): ActivityEvent[] {
  const base = { examId: exam.id, examTitle: exam.title };
  const events: ActivityEvent[] = [{ ...base, id: `created:${exam.id}`, at: exam.createdAt, label: "Taslak oluşturuldu" }];
  if (exam.contentLockedAt) events.push({ ...base, id: `locked:${exam.id}`, at: exam.contentLockedAt, label: "Sürüm kilitlendi" });
  if (exam.publishedAt) events.push({ ...base, id: `scheduled:${exam.id}`, at: exam.publishedAt, label: "Planlandı" });
  if (exam.resultsReleasedAt) events.push({ ...base, id: `released:${exam.id}`, at: exam.resultsReleasedAt, label: "Sonuçlar yayınlandı" });
  if (exam.answerKeyReleasedAt && exam.answerKeyReleasedAt.getTime() !== exam.resultsReleasedAt?.getTime()) {
    events.push({ ...base, id: `key:${exam.id}`, at: exam.answerKeyReleasedAt, label: "Cevap anahtarı açıldı" });
  }
  return events;
}

export function importAuditEvent(audit: {
  id: string;
  kind: keyof typeof IMPORT_KIND_LABEL;
  status: keyof typeof IMPORT_STATUS_LABEL;
  createdAt: Date;
  committedAt: Date | null;
  errorCount: number;
  exam: { id: string; title: string };
  actor?: string | null;
}): ActivityEvent {
  const errors = audit.status === "REJECTED" && audit.errorCount ? ` (${audit.errorCount} hata)` : "";
  return {
    id: `import:${audit.id}`,
    at: audit.committedAt ?? audit.createdAt,
    label: `${IMPORT_KIND_LABEL[audit.kind]} JSON ${IMPORT_STATUS_LABEL[audit.status]}${errors}`,
    examId: audit.exam.id,
    examTitle: audit.exam.title,
    actor: audit.actor,
  };
}

export function answerKeyRevisionEvent(revision: {
  id: string;
  revisionNumber: number;
  reason: string;
  createdAt: Date;
  exam: { id: string; title: string };
  actor?: string | null;
}): ActivityEvent {
  return {
    id: `revision:${revision.id}`,
    at: revision.createdAt,
    label: `Cevap anahtarı revizyonu #${revision.revisionNumber}: ${revision.reason}`,
    examId: revision.exam.id,
    examTitle: revision.exam.title,
    actor: revision.actor,
  };
}

/** Olayları yeniden eskiye sıralar ve keser. */
export function mergeActivity(groups: ReadonlyArray<readonly ActivityEvent[]>, limit: number): ActivityEvent[] {
  return groups
    .flat()
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

/* ── Deneme kaydı olay zaman çizelgesi (operasyon yan paneli) ─────────── */

export const ATTEMPT_EVENT_LABEL: Record<string, { label: string; signal: boolean }> = {
  EXAM_STARTED: { label: "Denemeyi başlattı", signal: false },
  QUESTION_OPENED: { label: "Soru açtı", signal: false },
  QUESTION_CLOSED: { label: "Sorudan çıktı", signal: false },
  ANSWER_SELECTED: { label: "Cevap seçti", signal: false },
  ANSWER_CHANGED: { label: "Cevap değiştirdi", signal: false },
  QUESTION_FLAGGED: { label: "Soruyu işaretledi", signal: false },
  SECTION_CHANGED: { label: "Bölüm değiştirdi", signal: false },
  TAB_HIDDEN: { label: "Sekmeden ayrıldı", signal: true },
  TAB_VISIBLE: { label: "Sekmeye döndü", signal: false },
  WINDOW_BLUR: { label: "Pencere odağını kaybetti", signal: true },
  WINDOW_FOCUS: { label: "Pencereye döndü", signal: false },
  FULLSCREEN_ENTER: { label: "Tam ekrana geçti", signal: false },
  FULLSCREEN_EXIT: { label: "Tam ekrandan çıktı", signal: true },
  COPY_ATTEMPT: { label: "Kopyalama denedi", signal: true },
  PASTE_ATTEMPT: { label: "Yapıştırma denedi", signal: true },
  CONTEXT_MENU: { label: "Sağ tık menüsü açtı", signal: true },
  NETWORK_OFFLINE: { label: "Bağlantı koptu", signal: true },
  NETWORK_ONLINE: { label: "Bağlantı geri geldi", signal: false },
  EXAM_SUBMITTED: { label: "Teslim etti", signal: false },
  AUTO_SUBMITTED: { label: "Süre bitti · otomatik teslim", signal: false },
};

export function attemptEventPresentation(type: string): { label: string; signal: boolean } {
  return ATTEMPT_EVENT_LABEL[type] ?? { label: type, signal: false };
}

/* ── Sonuç raporu tablosu (§11.7): öğrenci × son deneme ──────────────── */

export type AudienceReportLike = {
  exams: Array<{ id: string; title: string; takenAt: Date; totalNet: number; integrityNotice?: string | null }>;
  trends: Array<{ latestAccuracy: number }>;
};

export type ReportRowSummary = {
  latestExamId: string | null;
  latestTitle: string | null;
  latestNet: number | null;
  delta: number | null;
  weakOutcomes: number;
  examCount: number;
  integrityNotice: string | null;
};

/** Zayıf kazanım eşiği: son ölçümde %50 altı (rapor ekranlarıyla aynı). */
export const WEAK_OUTCOME_THRESHOLD = 50;

export function summarizeAudienceReport(report: AudienceReportLike | null): ReportRowSummary {
  const exams = [...(report?.exams ?? [])].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const latest = exams.at(-1) ?? null;
  const previous = exams.length > 1 ? exams[exams.length - 2]! : null;
  return {
    latestExamId: latest?.id ?? null,
    latestTitle: latest?.title ?? null,
    latestNet: latest?.totalNet ?? null,
    delta: latest && previous ? Math.round((latest.totalNet - previous.totalNet) * 100) / 100 : null,
    weakOutcomes: (report?.trends ?? []).filter((trend) => trend.latestAccuracy < WEAK_OUTCOME_THRESHOLD).length,
    examCount: exams.length,
    integrityNotice: latest?.integrityNotice ?? null,
  };
}
