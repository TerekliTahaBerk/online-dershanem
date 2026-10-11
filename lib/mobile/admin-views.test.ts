import assert from "node:assert/strict";
import test from "node:test";
import { parseGlobalSearch, parseOperationsCenter, parseStepUpResult } from "@/lib/mobile-contracts/admin";
import type { AdminOperationsCenterSnapshot } from "@/lib/panel/admin-operations-center";
import { toMobileOperationsCenter, toPanelPath } from "./admin-views";

const at = new Date("2026-10-11T08:00:00.000Z");

const snapshot: AdminOperationsCenterSnapshot = {
  generatedAt: at,
  partialData: false,
  openActionCount: 3,
  blockingCount: 1,
  actions: [
    { id: "a1", code: "PROVISIONING_FAILED", group: "COMMERCE", severity: "BLOCKING", title: "Provizyon başarısız", subject: "Paket A", ageLabel: "2 sa", owner: "Ada", href: "/panel/yonetim/siparisler/o1?sekme=log", ctaLabel: "Siparişi aç", createdAt: at },
    { id: "a2", code: "STUDENT_NO_GROUP", group: "OD", severity: "ACTION_REQUIRED", title: "Grupsuz öğrenci", subject: "Ece", ageLabel: "1 g", owner: null, href: "/panel/yonetim/ogrenciler/s1", ctaLabel: "Öğrenciyi aç", createdAt: null },
    { id: "a3", code: "SYSTEM_CRON", group: "SYSTEM", severity: "WATCH", title: "Cron gecikmesi", subject: "panel-reminders", ageLabel: "5 dk", owner: null, href: "https://kotu.example.com/panel", ctaLabel: "Aç", createdAt: at },
  ],
  summary: [{ id: "today_lessons", label: "Bugünkü dersler", value: 4, hint: "2 tamamlandı", href: "/panel/yonetim/takvim?gun=bugun", tone: "neutral", available: true }],
  activities: [{ id: "l1", text: "Ada bir grup oluşturdu", href: null, occurredAt: at, actorLabel: "Ada" }],
  risk: { critical: 1, watch: 2, normal: 3, total: 6, criticalHref: "/x", watchHref: "/y", normalHref: "/z" },
  health: [{ id: "database", label: "Veritabanı", status: "ok", detail: "12 ms", href: "/panel/yonetim/raporlar" }],
};

test("operasyon merkezi: sözleşmeye uyar; tarihler ISO, yollar sorgusuz panel yolu", () => {
  const view = toMobileOperationsCenter(snapshot, "tumu");
  const parsed = parseOperationsCenter(JSON.parse(JSON.stringify(view)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  assert.equal(view.actions[0].webPath, "/panel/yonetim/siparisler/o1");
  assert.equal(view.actions[1].createdAt, null);
  assert.equal(view.actions[2].webPath, null, "panel dışı adres hedef üretmez");
  assert.equal(view.summary[0].webPath, "/panel/yonetim/takvim");
  assert.equal(view.groups.find((group) => group.id === "tumu")?.count, 3);
  assert.equal(view.groups.find((group) => group.id === "COMMERCE")?.count, 1);
});

test("operasyon merkezi: grup süzgeci yalnız eylemleri daraltır, sayaçlar tüm kutuyu yansıtır", () => {
  const view = toMobileOperationsCenter(snapshot, "OD");
  assert.deepEqual(view.actions.map((action) => action.id), ["a2"]);
  assert.equal(view.groups.find((group) => group.id === "SYSTEM")?.count, 1);
  assert.equal(view.group, "OD");
});

test("operasyon merkezi sözleşmesi: panel dışı webPath reddedilir", () => {
  const view = JSON.parse(JSON.stringify(toMobileOperationsCenter(snapshot, "tumu")));
  view.actions[0].webPath = "https://example.com/panel";
  assert.equal(parseOperationsCenter(view).ok, false);
  view.actions[0].webPath = "/panel/../giris";
  assert.equal(parseOperationsCenter(view).ok, false);
});

test("toPanelPath: sorgu ve sondaki eğik çizgi atılır; bozuk yol null", () => {
  assert.equal(toPanelPath("/panel/yonetim/?grup=OD"), "/panel/yonetim");
  assert.equal(toPanelPath("/panel"), "/panel");
  assert.equal(toPanelPath("//evil.example/panel"), null);
  assert.equal(toPanelPath("/panel/a/../b"), null);
  assert.equal(toPanelPath(null), null);
});

test("global arama ve step-up sözleşmeleri", () => {
  assert.ok(parseGlobalSearch({ query: "ada", commands: [], results: [{ kind: "STUDENT", id: "s1", label: "Ada", detail: "OD", href: "/panel/yonetim/ogrenciler/s1" }] }).ok);
  assert.equal(parseGlobalSearch({ query: "ada", commands: [], results: [{ kind: "SECRET", id: "s1", label: "", detail: "", href: "" }] }).ok, false);
  const legacy = parseStepUpResult({ verified: true, redirect: "/panel" });
  assert.deepEqual(legacy.ok && legacy.value, { verified: true, stepUpExpiresAt: null });
  assert.equal(parseStepUpResult({ verified: false }).ok, false);
});

test("müdahale kutusu: satırlar ve tek sözlük sözleşmeye uyar; bilinmeyen durum reddedilir", async () => {
  const { toMobileInterventionInbox } = await import("./admin-views");
  const { parseInterventionInbox } = await import("@/lib/mobile-contracts/admin");
  const row = {
    id: "c1", studentName: "Ece", reasonCode: "OVERDUE_WORK", explanation: "3 çalışma gecikti", suggestedAction: "Kısa görüşme", evidenceCount: 3,
    dueAt: "2026-10-12T20:59:59.999Z", status: "OPEN" as const, ownerName: null, canAct: true, firstActionAt: null, snoozedUntil: null, outcomeCode: null, version: 1,
    activities: [{ id: "a1", type: "GENERATED", note: null, outcomeCode: null, falsePositiveReason: null, actorName: "Sistem", createdAt: "2026-10-11T08:00:00.000Z" }],
  };
  const view = toMobileInterventionInbox([row], [{ id: "s1", name: "Ece" }]);
  const parsed = parseInterventionInbox(JSON.parse(JSON.stringify(view)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  assert.deepEqual(view.vocabulary.snoozeDays, [1, 3, 7]);
  assert.ok(view.vocabulary.outcomes.some((entry) => entry.value === "SUPPORT_PLANNED"));
  assert.equal(view.vocabulary.manualReasons[0].value, "TEACHER_OBSERVED");
  const broken = JSON.parse(JSON.stringify(view));
  broken.rows[0].status = "ARCHIVED";
  assert.equal(parseInterventionInbox(broken).ok, false);
});
