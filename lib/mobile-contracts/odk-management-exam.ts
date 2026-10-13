import { check, v, type Infer } from "./validate";

/**
 * K03 · DENEME ÇALIŞMA ALANI — `GET /api/panel/odk/management/exams/[id]?sekme=`.
 * Web sekmeleriyle aynı izin süzgeci; sekmeye özgü bloklar yalnız o sekmede
 * dolar (diğerleri `null`). Cevap anahtarı yalnız `caps.edit` iken döner;
 * öğrenci yalnız adla görünür. Eski sunucuda olmayabilecek alanlar opsiyoneldir.
 */
const tone = () => v.oneOf(["neutral", "info", "success", "warning", "critical"]);
export const ODK_EXAM_TABS = ["genel", "icerik", "sorular", "oturumlar", "zamanlama", "katilimcilar", "onizleme", "canli", "puanlama", "butunluk", "raporlar", "gecmis"] as const;
export type OdkExamTab = (typeof ODK_EXAM_TABS)[number];
const tabId = () => v.oneOf(ODK_EXAM_TABS);
const counters = v.object({ notStarted: v.int(0), inProgress: v.int(0), disconnected: v.int(0), submitted: v.int(0), autoSubmitted: v.int(0), review: v.int(0) });

const workspace = v.object({
  contractVersion: v.literal(1),
  revision: v.nonEmpty(),
  tab: tabId(),
  tabs: v.array(v.object({ id: tabId(), label: v.string() })),
  caps: v.object({ edit: v.boolean(), schedule: v.boolean(), assign: v.boolean(), ops: v.boolean(), score: v.boolean(), rescore: v.boolean(), release: v.boolean(), integrity: v.boolean(), reports: v.boolean() }),
  exam: v.object({
    id: v.nonEmpty(),
    title: v.string(),
    familyCode: v.string(),
    status: v.oneOf(["DRAFT", "READY", "SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED", "ARCHIVED"]),
    statusLabel: v.string(),
    tone: tone(),
    versionNumber: v.int(1),
    versionStatus: v.string(),
    description: v.string(),
    startsAt: v.nullable(v.iso()),
    endsAt: v.nullable(v.iso()),
    lateEntryMinutes: v.int(0),
    durationMinutes: v.int(0),
    meet: v.string(),
    createdAt: v.iso(),
    contentLockedAt: v.nullable(v.iso()),
    publishedAt: v.nullable(v.iso()),
    resultsReleasedAt: v.nullable(v.iso()),
    windowEnded: v.boolean(),
    draftEditable: v.boolean(),
    /** K03b: düzenleme formu için (yalnız düzenleme / planlama izniyle). */
    meetRequired: v.optional(v.boolean(), false),
    meetUrl: v.optional(v.nullable(v.string()), null),
  }),
  counts: v.object({ assigned: v.int(0), attempts: v.int(0), submitted: v.int(0), scored: v.int(0), review: v.int(0) }),
  primaryAction: v.nullable(v.object({ label: v.string(), tab: tabId() })),
  readiness: v.object({ done: v.int(0), items: v.array(v.object({ id: v.nonEmpty(), label: v.string(), ok: v.boolean(), detail: v.string() })) }),
  issues: v.object({ total: v.int(0), items: v.array(v.object({ level: v.oneOf(["error", "warning"]), message: v.string(), questionNumber: v.nullable(v.int(0)) })) }),
  questions: v.nullable(
    v.object({
      filter: v.oneOf(["tumu", "kazanimsiz", "anahtarsiz"]),
      counts: v.object({ tumu: v.int(0), kazanimsiz: v.int(0), anahtarsiz: v.int(0) }),
      rows: v.array(v.object({ id: v.nonEmpty(), number: v.int(0), section: v.string(), correctOption: v.nullable(v.string()), outcomeCount: v.int(0), hasPrimaryOutcome: v.boolean(), contentType: v.string(), bookletPage: v.nullable(v.int(0)) })),
    }),
  ),
  files: v.nullable(v.array(v.object({ id: v.nonEmpty(), type: v.string(), fileName: v.string() }))),
  sessions: v.nullable(v.array(v.object({ key: v.nonEmpty(), title: v.string(), sections: v.array(v.string()), durationMinutes: v.int(0), breakAfterMinutes: v.int(0) }))),
  schedule: v.nullable(
    v.object({
      fullscreenMode: v.optional(v.oneOf(["OFF", "SUGGESTED", "REQUIRED"]), "SUGGESTED"),
      fullscreenLabel: v.string(),
      blockCopyPaste: v.boolean(),
      logCopyPaste: v.boolean(),
      trackVisibility: v.boolean(),
      allowExtraTimeMinutes: v.int(0),
      autoSubmit: v.boolean(),
    }),
  ),
  live: v.nullable(counters),
  integrity: v.nullable(v.array(v.object({ id: v.nonEmpty(), name: v.string(), statusLabel: v.string(), tone: tone(), level: v.oneOf(["NORMAL", "REVIEW", "HIGH"]), levelLabel: v.string(), levelTone: tone(), reviewed: v.boolean() }))),
  report: v.nullable(
    v.object({
      submitted: v.int(0),
      participation: v.int(0),
      averageNet: v.nullable(v.number()),
      medianNet: v.nullable(v.number()),
      integrityReviewCount: v.int(0),
      sections: v.array(v.object({ code: v.string(), title: v.string(), averageNet: v.nullable(v.number()), averageAccuracy: v.nullable(v.number()) })),
      weakest: v.array(v.object({ outcomeId: v.nonEmpty(), title: v.string(), accuracy: v.number() })),
    }),
  ),
  /** K03b · katılımcılar sekmesi: aktif atamalar ve atama kaynakları (öğrenci yalnız adla). */
  assignments: v.optional(
    v.nullable(
      v.object({
        active: v.int(0),
        total: v.int(0),
        rows: v.array(v.object({ id: v.nonEmpty(), name: v.string(), source: v.string(), active: v.boolean(), assignedAt: v.iso() })),
        options: v.object({
          groups: v.array(v.object({ id: v.nonEmpty(), label: v.string(), memberCount: v.int(0) })),
          classLevels: v.array(v.string()),
          packages: v.array(v.object({ id: v.nonEmpty(), title: v.string() })),
          cohorts: v.array(v.object({ id: v.nonEmpty(), name: v.string(), status: v.string() })),
        }),
      }),
    ),
    null,
  ),
  /** K03b · önizleme sekmesi: öğrenci / öğretmen / veli görünümü (deneme başlatmaz). */
  previews: v.optional(v.nullable(v.array(v.object({ kind: v.nonEmpty(), label: v.string(), disclaimer: v.string(), lines: v.array(v.string()) }))), null),
  history: v.nullable(v.array(v.object({ id: v.nonEmpty(), label: v.string(), actor: v.nullable(v.string()), at: v.iso() }))),
});

export type OdkExamWorkspaceView = Infer<typeof workspace>;

export function parseOdkExamWorkspace(input: unknown) {
  return check(workspace, input);
}

/** `POST /api/panel/odk/management/exams/[id]` komutları (sunucu: rota `commandSchema`). */
export type OdkExamCommand =
  | { operation: "update"; input: { title: string; startsAt: string | null; endsAt: string | null; lateEntryMinutes: number; meetRequired: boolean; meetUrl: string | null; autoSubmit?: boolean; security?: { fullscreenMode: "OFF" | "SUGGESTED" | "REQUIRED"; blockCopyPaste: boolean; logCopyPaste: boolean; trackVisibility: boolean; allowExtraTimeMinutes: number; autoSubmit: boolean } } }
  | { operation: "ready" }
  | { operation: "schedule" }
  | { operation: "sessions"; sessions: Array<{ key: string; durationMinutes: number; breakAfterMinutes: number }> }
  | { operation: "assign"; input: { source: "STUDENT" | "GROUP" | "CLASS" | "COHORT" | "BULK"; groupId?: string; classLevel?: string; packageId?: string; cohortId?: string; studentEmails?: string[] } }
  | { operation: "import.preview"; kind: "answer-key" | "outcomes"; payload: unknown }
  | { operation: "import.commit"; kind: "answer-key" | "outcomes"; importId: string };

export function parseOdkExamCommandResult(input: unknown) {
  return check(v.object({ ok: v.literal(true), operation: v.nonEmpty(), result: v.optional(v.object({ importId: v.optional(v.nullable(v.string()), null), summary: v.optional(v.nullable(v.object({ message: v.optional(v.string(), "") })), null), issues: v.optional(v.array(v.object({ level: v.optional(v.string(), "error"), message: v.optional(v.string(), "") })), []), total: v.optional(v.nullable(v.int(0)), null), count: v.optional(v.nullable(v.int(0)), null) }), { importId: null, summary: null, issues: [], total: null, count: null }), replayed: v.boolean() }), input);
}
