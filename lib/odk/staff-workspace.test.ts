import assert from "node:assert/strict";
import { test } from "node:test";
import { STAFF_PERMISSIONS, staffPermissionsFor, type StaffPermission } from "@/lib/products/staff-permission-matrix";
import {
  EXAM_ANCHOR_TABS,
  defaultExamView,
  examCapabilities,
  examPrimaryAction,
  examViewOf,
  examWorkspaceHref,
  isOdkExamView,
  opsAttemptMatches,
  opsCounters,
  opsStateOf,
  parseOpsFilter,
  parseQuestionFilter,
  publicationStageOf,
  questionMatchesFilter,
  readinessChecklist,
  resolveExamTab,
  staffAttentionRows,
  visibleExamTabs,
  OPS_STATUS_FILTERS,
  type OpsAttempt,
} from "./staff-workspace";

const now = new Date("2026-10-10T10:00:00.000Z");
const min = (m: number) => new Date(now.getTime() + m * 60_000);
const perms = (...items: StaffPermission[]) => new Set(items);
const editor = staffPermissionsFor([{ productCode: "ODK", role: "EXAM_EDITOR" }]);
const operator = staffPermissionsFor([{ productCode: "ODK", role: "EXAM_OPERATOR" }]);
const publisher = staffPermissionsFor([{ productCode: "ODK", role: "RESULT_PUBLISHER" }]);
const all = new Set(STAFF_PERMISSIONS);

test("deneme görünümü yaşam döngüsünden türetilir", () => {
  assert.equal(examViewOf({ status: "DRAFT", startsAt: null, endsAt: null }, now), "hazirlik");
  assert.equal(examViewOf({ status: "READY", startsAt: min(60), endsAt: min(120) }, now), "hazirlik");
  assert.equal(examViewOf({ status: "SCHEDULED", startsAt: min(60), endsAt: min(120) }, now), "planlanan");
  assert.equal(examViewOf({ status: "SCHEDULED", startsAt: min(-5), endsAt: min(60) }, now), "canli");
  assert.equal(examViewOf({ status: "LIVE", startsAt: null, endsAt: null }, now), "canli");
  assert.equal(examViewOf({ status: "SCHEDULED", startsAt: min(-120), endsAt: min(-1) }, now), "puanlama");
  assert.equal(examViewOf({ status: "ENDED", startsAt: null, endsAt: null }, now), "puanlama");
  assert.equal(examViewOf({ status: "SCORED", startsAt: null, endsAt: null }, now), "puanlama");
  assert.equal(examViewOf({ status: "RELEASED", startsAt: null, endsAt: null }, now), "yayinlandi");
  assert.equal(examViewOf({ status: "ARCHIVED", startsAt: null, endsAt: null }, now), "arsiv");
  assert.equal(isOdkExamView("canli"), true);
  assert.equal(isOdkExamView("x"), false);
  assert.equal(isOdkExamView(undefined), false);
});

test("varsayılan görünüm role göre değişir", () => {
  assert.equal(defaultExamView({ isAdmin: true, permissions: new Set() }), "tumu");
  assert.equal(defaultExamView({ isAdmin: false, permissions: editor }), "hazirlik");
  assert.equal(defaultExamView({ isAdmin: false, permissions: operator }), "planlanan");
  assert.equal(defaultExamView({ isAdmin: false, permissions: publisher }), "puanlama");
  assert.equal(defaultExamView({ isAdmin: false, permissions: perms("odk:integrity:review") }), "tumu");
});

test("dikkat satırları yalnız izni olana gösterilir", () => {
  const input = {
    prep: [
      { id: "a", title: "TYT-4", blockingIssues: 3, firstIssue: "Soru 2: kazanım yok" },
      { id: "ok", title: "Hazır", blockingIssues: 0 },
    ],
    unscored: [{ id: "b", title: "AYT-2", count: 18 }, { id: "z", title: "Boş", count: 0 }],
    awaitingRelease: [{ id: "c", title: "LGS-3" }],
    integrity: [{ id: "d", title: "LGS-1", count: 4 }],
  };
  const adminRows = staffAttentionRows(input, all);
  assert.deepEqual(adminRows.map((row) => row.kind), ["PREP", "SCORE", "RELEASE", "INTEGRITY"]);
  assert.equal(adminRows[0].href, "/panel/odk/yonetim/sinavlar/a?sekme=genel");
  assert.match(adminRows[0].title, /3 bloke eden sorun · Soru 2/);
  assert.equal(adminRows[3].href, examWorkspaceHref("d", "butunluk"));
  assert.deepEqual(staffAttentionRows(input, editor).map((row) => row.kind), ["PREP"]);
  assert.deepEqual(staffAttentionRows(input, operator).map((row) => row.kind), ["INTEGRITY"]);
  assert.deepEqual(staffAttentionRows(input, publisher).map((row) => row.kind), ["SCORE", "RELEASE"]);
  const many = staffAttentionRows({ ...input, integrity: [{ id: "d", title: "A", count: 1 }, { id: "e", title: "B", count: 2 }] }, all);
  assert.equal(many.at(-1)?.title, "3 deneme bütünlük incelemesi bekliyor");
  assert.equal(many.at(-1)?.href, examWorkspaceHref("e", "butunluk"), "en çok sinyali olan deneme");
  assert.equal(examWorkspaceHref("x"), "/panel/odk/yonetim/sinavlar/x");
});

test("sekmeler izne göre çizilir; eski çapalar sekmeye eşlenir", () => {
  const ids = (p: Set<StaffPermission>, hasSessions = false) => visibleExamTabs(examCapabilities(p), { hasSessions }).map((tab) => tab.id);
  assert.deepEqual(ids(all, true), ["genel", "icerik", "sorular", "oturumlar", "zamanlama", "katilimcilar", "onizleme", "canli", "puanlama", "butunluk", "raporlar", "gecmis"]);
  assert.deepEqual(ids(editor), ["genel", "icerik", "sorular", "zamanlama", "onizleme", "gecmis"]);
  assert.deepEqual(ids(operator), ["genel", "zamanlama", "katilimcilar", "canli", "butunluk", "gecmis"]);
  assert.deepEqual(ids(publisher), ["genel", "puanlama", "raporlar", "gecmis"]);
  const visible = visibleExamTabs(examCapabilities(publisher), { hasSessions: false });
  assert.equal(resolveExamTab("puanlama", visible), "puanlama");
  assert.equal(resolveExamTab("sorular", visible), "genel", "görünmeyen sekme genel'e düşer");
  assert.equal(resolveExamTab(undefined, visible), "genel");
  assert.equal(EXAM_ANCHOR_TABS["adim-sonuc"], "puanlama");
  assert.equal(EXAM_ANCHOR_TABS["adim-integrity"], "butunluk");
  assert.equal(EXAM_ANCHOR_TABS["adim-json"], "icerik");
});

test("birincil eylem yaşam döngüsü ve izinle değişir", () => {
  const caps = examCapabilities(all);
  assert.deepEqual(examPrimaryAction("DRAFT", caps, false), { label: "Hazır olarak işaretle", tab: "zamanlama" });
  assert.deepEqual(examPrimaryAction("READY", caps, false), { label: "Planla", tab: "zamanlama" });
  assert.deepEqual(examPrimaryAction("ENDED", caps, true), { label: "Puanla", tab: "puanlama" });
  assert.deepEqual(examPrimaryAction("LIVE", caps, true), { label: "Puanla", tab: "puanlama" });
  assert.equal(examPrimaryAction("LIVE", caps, false), null);
  assert.deepEqual(examPrimaryAction("SCORED", caps, true), { label: "Yayın önizleme", tab: "puanlama" });
  assert.equal(examPrimaryAction("RELEASED", caps, true), null);
  assert.equal(examPrimaryAction("DRAFT", examCapabilities(operator), false), null);
  assert.equal(examPrimaryAction("SCORED", examCapabilities(editor), true), null);
});

test("hazırlık rayı sorunları kategoriye ayırır ve filtreye bağlar", () => {
  const ready = readinessChecklist({ examId: "e", questionCount: 90, sectionCount: 4, hasBooklet: true, issues: [], securityLabel: "Tam ekran önerilir" });
  assert.equal(ready.done, 5);
  assert.equal(ready.items[0].detail, "90 soru, 4 bölüm");
  const digital = readinessChecklist({ examId: "e", questionCount: 2, sectionCount: 1, hasBooklet: false, issues: [], securityLabel: "x" });
  assert.equal(digital.items[1].detail, "Dijital sorular · gerekmiyor");
  const broken = readinessChecklist({
    examId: "e",
    questionCount: 3,
    sectionCount: 1,
    hasBooklet: false,
    securityLabel: "x",
    issues: [
      { level: "error", code: "BOOKLET_MISSING", message: "" },
      { level: "error", code: "OUTCOME_MISSING", message: "", questionNumber: 1 },
      { level: "error", code: "OUTCOME_MISSING", message: "", questionNumber: 2 },
      { level: "error", code: "ANSWER_MISSING", message: "", questionNumber: 3 },
      { level: "error", code: "QUESTION_COUNT_MISMATCH", message: "" },
      { level: "warning", code: "SECTION_QUESTION_COUNT_NONSTANDARD", message: "" },
    ],
  });
  assert.equal(broken.done, 1);
  assert.equal(broken.items[0].detail, "1 yapı sorunu");
  assert.equal(broken.items[1].href, "/panel/odk/yonetim/sinavlar/e?sekme=icerik");
  assert.equal(broken.items[2].detail, "2 soruda kazanım yok");
  assert.equal(broken.items[2].href, "/panel/odk/yonetim/sinavlar/e?sekme=sorular&filtre=kazanimsiz");
  assert.equal(broken.items[3].href, "/panel/odk/yonetim/sinavlar/e?sekme=sorular&filtre=anahtarsiz");
});

test("soru filtreleri", () => {
  assert.equal(parseQuestionFilter("kazanimsiz"), "kazanimsiz");
  assert.equal(parseQuestionFilter("anahtarsiz"), "anahtarsiz");
  assert.equal(parseQuestionFilter("x"), "tumu");
  const bare = { correctOption: null, outcomeIds: [], primaryOutcomeId: null };
  const full = { correctOption: "A", outcomeIds: ["o"], primaryOutcomeId: "o" };
  assert.equal(questionMatchesFilter(bare, "kazanimsiz"), true);
  assert.equal(questionMatchesFilter(full, "kazanimsiz"), false);
  assert.equal(questionMatchesFilter(bare, "anahtarsiz"), true);
  assert.equal(questionMatchesFilter(full, "anahtarsiz"), false);
  assert.equal(questionMatchesFilter(full, "tumu"), true);
});

const attempt = (patch: Partial<OpsAttempt>): OpsAttempt => ({
  status: "IN_PROGRESS",
  deadlineAt: min(30),
  lastActivityAt: min(0),
  integrityLevel: "NORMAL",
  integrityReviewedAt: null,
  ...patch,
});

test("canlı operasyon durumları ve sayaçlar", () => {
  assert.equal(opsStateOf(attempt({}), now), "IN_PROGRESS");
  assert.equal(opsStateOf(attempt({ lastActivityAt: min(-3) }), now), "DISCONNECTED");
  assert.equal(opsStateOf(attempt({ deadlineAt: min(-1) }), now), "OTHER");
  assert.equal(opsStateOf(attempt({ status: "SUBMITTED" }), now), "SUBMITTED");
  assert.equal(opsStateOf(attempt({ status: "AUTO_SUBMITTED" }), now), "AUTO_SUBMITTED");
  assert.equal(opsStateOf(attempt({ status: "REVIEW_REQUIRED" }), now), "REVIEW");
  assert.equal(opsStateOf(attempt({ status: "VOID" }), now), "OTHER");
  const counters = opsCounters(
    [
      attempt({}),
      attempt({ lastActivityAt: min(-5) }),
      attempt({ status: "SUBMITTED", integrityLevel: "HIGH" }),
      attempt({ status: "SUBMITTED", integrityLevel: "REVIEW", integrityReviewedAt: min(-1) }),
      attempt({ status: "AUTO_SUBMITTED" }),
      attempt({ status: "REVIEW_REQUIRED" }),
    ],
    10,
    now,
  );
  assert.deepEqual(counters, { notStarted: 4, inProgress: 1, disconnected: 1, submitted: 2, autoSubmitted: 1, review: 2 });
  assert.equal(opsCounters([attempt({})], 0, now).notStarted, 0);
});

test("canlı operasyon filtreleri", () => {
  const base = { status: "tumu", integrity: "tumu", heartbeat: "tumu" } as const;
  const stale = attempt({ lastActivityAt: min(-6), integrityLevel: "REVIEW" });
  assert.equal(opsAttemptMatches(stale, base, now), true);
  assert.equal(opsAttemptMatches(stale, { ...base, status: "kopuk" }, now), true);
  assert.equal(opsAttemptMatches(stale, { ...base, status: "devam" }, now), false);
  assert.equal(opsAttemptMatches(stale, { ...base, status: "inceleme" }, now), true);
  assert.equal(opsAttemptMatches(attempt({ status: "SUBMITTED" }), { ...base, status: "teslim" }, now), true);
  assert.equal(opsAttemptMatches(stale, { ...base, integrity: "REVIEW" }, now), true);
  assert.equal(opsAttemptMatches(stale, { ...base, integrity: "HIGH" }, now), false);
  assert.equal(opsAttemptMatches(stale, { ...base, heartbeat: "5" }, now), true);
  assert.equal(opsAttemptMatches(stale, { ...base, heartbeat: "10" }, now), false);
  assert.equal(opsAttemptMatches(attempt({ status: "SUBMITTED", lastActivityAt: min(-60) }), { ...base, heartbeat: "2" }, now), false);
  assert.equal(parseOpsFilter("kopuk", OPS_STATUS_FILTERS), "kopuk");
  assert.equal(parseOpsFilter("x", OPS_STATUS_FILTERS), "tumu");
  assert.equal(parseOpsFilter(undefined, OPS_STATUS_FILTERS), "tumu");
});

test("yayın akışı aşamaları", () => {
  const exam = (status: Parameters<typeof publicationStageOf>[0]["status"], endsAt: Date | null = null, unscored = 0) =>
    publicationStageOf({ status, startsAt: null, endsAt, unscored }, now);
  assert.equal(exam("RELEASED"), "YAYINLANDI");
  assert.equal(exam("SCORED"), "INCELEME");
  assert.equal(exam("SCORED", null, 2), "PUANLANIYOR");
  assert.equal(exam("ENDED"), "PUANLANIYOR");
  assert.equal(exam("LIVE", min(-1)), "PUANLANIYOR");
  assert.equal(exam("LIVE", min(10)), "BEKLIYOR");
});

test("etkinlik akışı olayları birleştirir ve sıralar", async () => {
  const { examLifecycleEvents, importAuditEvent, answerKeyRevisionEvent, mergeActivity } = await import("./staff-workspace");
  const exam = { id: "e", title: "TYT-1" };
  const lifecycle = examLifecycleEvents({
    ...exam,
    createdAt: min(-100),
    contentLockedAt: min(-80),
    publishedAt: min(-60),
    resultsReleasedAt: min(-10),
    answerKeyReleasedAt: min(-5),
  });
  assert.deepEqual(lifecycle.map((event) => event.label), ["Taslak oluşturuldu", "Sürüm kilitlendi", "Planlandı", "Sonuçlar yayınlandı", "Cevap anahtarı açıldı"]);
  assert.equal(examLifecycleEvents({ ...exam, createdAt: min(-1), contentLockedAt: null, publishedAt: null, resultsReleasedAt: min(0), answerKeyReleasedAt: min(0) }).length, 2);
  const imported = importAuditEvent({ id: "i", kind: "OUTCOME", status: "COMMITTED", createdAt: min(-90), committedAt: min(-85), errorCount: 0, exam, actor: "Ada" });
  assert.equal(imported.label, "Kazanım eşlemesi JSON içe aktarıldı");
  assert.equal(imported.at.getTime(), min(-85).getTime());
  const rejected = importAuditEvent({ id: "j", kind: "ANSWER_KEY", status: "REJECTED", createdAt: min(-70), committedAt: null, errorCount: 3, exam });
  assert.equal(rejected.label, "Cevap anahtarı JSON reddedildi (3 hata)");
  const revision = answerKeyRevisionEvent({ id: "r", revisionNumber: 2, reason: "Soru 4 iptal", createdAt: min(-2), exam });
  assert.match(revision.label, /#2: Soru 4 iptal/);
  const merged = mergeActivity([lifecycle, [imported, rejected, revision]], 3);
  assert.deepEqual(merged.map((event) => event.id), ["revision:r", "key:e", "released:e"]);
});

test("olay etiketleri ve sinyal işareti", async () => {
  const { attemptEventPresentation } = await import("./staff-workspace");
  assert.deepEqual(attemptEventPresentation("TAB_HIDDEN"), { label: "Sekmeden ayrıldı", signal: true });
  assert.equal(attemptEventPresentation("EXAM_STARTED").signal, false);
  assert.deepEqual(attemptEventPresentation("YENI_OLAY"), { label: "YENI_OLAY", signal: false });
});

test("rapor satırı son denemeyi, değişimi ve zayıf kazanımları özetler", async () => {
  const { summarizeAudienceReport } = await import("./staff-workspace");
  assert.deepEqual(summarizeAudienceReport(null), {
    latestExamId: null,
    latestTitle: null,
    latestNet: null,
    delta: null,
    weakOutcomes: 0,
    examCount: 0,
    integrityNotice: null,
  });
  const summary = summarizeAudienceReport({
    exams: [
      { id: "b", title: "TYT-2", takenAt: min(-10), totalNet: 52.25, integrityNotice: "Not" },
      { id: "a", title: "TYT-1", takenAt: min(-100), totalNet: 48 },
    ],
    trends: [{ latestAccuracy: 30 }, { latestAccuracy: 49.9 }, { latestAccuracy: 50 }],
  });
  assert.equal(summary.latestTitle, "TYT-2");
  assert.equal(summary.delta, 4.25);
  assert.equal(summary.weakOutcomes, 2);
  assert.equal(summary.examCount, 2);
  assert.equal(summary.integrityNotice, "Not");
  assert.equal(summarizeAudienceReport({ exams: [{ id: "a", title: "A", takenAt: min(0), totalNet: 10 }], trends: [] }).delta, null);
});
