/**
 * Online Koçum — production readiness regresyon testleri.
 *
 * Her test, canlıya çıkabilecek GERÇEK bir hatayı sabitler. Test adları
 * hatanın ne olduğunu söyler; "çalışıyor mu" değil "eskiden ne bozuktu".
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  activePlanSourceKeys,
  evaluateTaskTransition,
  isCompletionTransition,
  mergeTaskActuals,
  planSourceKey,
  selectTasksForPlanCopy,
  type KocumTaskStatus,
} from "./plan-tasks";
import { isDateWithinPlanWeek } from "./schedule";
import { buildTodayItems, dedupeLinkedWorkItems } from "@/lib/student-success/calendar";
import { serializeUnifiedTodayItem } from "@/lib/student-success/unified-today-serializer";
import type { UnifiedCalendarEvent } from "@/lib/student-success/types";
import { istanbulDayStart, istanbulWeekStart } from "@/lib/istanbul-time";

/* ---------------------------------------------------------------- *
 * §5 — Görev durum makinesi
 * ---------------------------------------------------------------- */

test("tamamlanmış görev açık duruma geri döndürülemez", () => {
  // Eskiden serbestti: `completedAt` siliniyor, tamamlanma kanıtı yok oluyordu.
  assert.equal(evaluateTaskTransition("DONE", "IN_PROGRESS").kind, "REJECT");
  assert.equal(evaluateTaskTransition("PARTIAL", "PLANNED").kind, "REJECT");
  assert.equal(evaluateTaskTransition("COULD_NOT", "IN_PROGRESS").kind, "REJECT");
});

test("terminal durumlar arası düzeltmeye izin verilir", () => {
  assert.equal(evaluateTaskTransition("DONE", "PARTIAL").kind, "APPLY");
  assert.equal(evaluateTaskTransition("COULD_NOT", "DONE").kind, "APPLY");
});

test("yeniden planlanacak görev öğrenci tarafından kapatılamaz", () => {
  const outcome = evaluateTaskTransition("SKIPPED", "DONE");
  assert.equal(outcome.kind, "REJECT");
  assert.equal(
    outcome.kind === "REJECT" ? outcome.reason : "",
    "Bu görev yeniden planlanacak durumda.",
  );
});

test("aynı durumun tekrar gönderilmesi çift tamamlama saymaz", () => {
  // Çift tıklama / mobil tekrar gönderim: yazma yapılır, yan etki tekrarlanmaz.
  assert.equal(evaluateTaskTransition("DONE", "DONE").kind, "NOOP");
  assert.equal(isCompletionTransition("DONE", "DONE"), false);
  assert.equal(isCompletionTransition("PLANNED", "DONE"), true);
  assert.equal(isCompletionTransition("IN_PROGRESS", "PARTIAL"), true);
  // COULD_NOT tamamlanma DEĞİLDİR — kanıt/bildirim üretmemeli.
  assert.equal(isCompletionTransition("PLANNED", "COULD_NOT"), false);
});

test("normal ilerleme yolu açık kalır", () => {
  const path: Array<[KocumTaskStatus, KocumTaskStatus]> = [
    ["PLANNED", "IN_PROGRESS"],
    ["IN_PROGRESS", "DONE"],
  ];
  for (const [from, to] of path) {
    assert.equal(evaluateTaskTransition(from, to).kind, "APPLY", `${from}->${to}`);
  }
});

/* ---------------------------------------------------------------- *
 * §4, §6 — Planlanan vs gerçekleşen; türe göre alan doğrulama
 * ---------------------------------------------------------------- */

test("atlanan alan önceki gerçekleşen değeri silmez", () => {
  // Eskiden `?? null` yazılıyordu: yalnız süre gönderen bir istek daha önce
  // kaydedilmiş soru sayısını siliyordu.
  const patch = mergeTaskActuals({ actualMinutes: 30 }, "QUESTION_PRACTICE");
  assert.deepEqual(patch, { actualMinutes: 30 });
  assert.equal("actualQuestions" in patch, false);
});

test("açıkça null gönderilen alan temizlenir", () => {
  const patch = mergeTaskActuals({ actualMinutes: null }, "QUESTION_PRACTICE");
  assert.deepEqual(patch, { actualMinutes: null });
});

test("görev türüne uymayan gerçekleşen alan yok sayılır", () => {
  // VIDEO görevine doğru/yanlış sayısı yazılamaz (§6).
  const patch = mergeTaskActuals(
    { actualMinutes: 25, actualCorrect: 10, actualQuestions: 20 },
    "VIDEO",
  );
  assert.deepEqual(patch, { actualMinutes: 25 });
});

test("soru çözümü görevinde soru alanları kabul edilir", () => {
  const patch = mergeTaskActuals(
    { actualQuestions: 40, actualCorrect: 30, studentNote: "zor" },
    "QUESTION_PRACTICE",
  );
  assert.deepEqual(patch, { actualQuestions: 40, actualCorrect: 30, studentNote: "zor" });
});

/* ---------------------------------------------------------------- *
 * §9, §10 — Plan kopyalama ve devretme
 * ---------------------------------------------------------------- */

const copyTask = (status: KocumTaskStatus, extra: Partial<{ sourceType: "ASSIGNMENT" | "MANUAL_COACH"; sourceReferenceId: string | null }> = {}) => ({
  status,
  sourceType: extra.sourceType ?? ("MANUAL_COACH" as const),
  sourceReferenceId: extra.sourceReferenceId ?? null,
});

test("devretme YAPILAMAYAN işi taşır, tamamlananı taşımaz", () => {
  /*
   * ESKİ DAVRANIŞ HATALIYDI: `carryOverIncomplete` açıkken DONE kopyalanıyor,
   * COULD_NOT ve PARTIAL — yani gerçekten eksik kalan iş — atlanıyordu.
   */
  const picked = selectTasksForPlanCopy(
    [
      copyTask("PLANNED"),
      copyTask("IN_PROGRESS"),
      copyTask("COULD_NOT"),
      copyTask("PARTIAL"),
      copyTask("DONE"),
      copyTask("SKIPPED"),
    ],
    { carryOverIncomplete: true },
  );
  assert.deepEqual(
    picked.map((t) => t.status),
    ["PLANNED", "IN_PROGRESS", "COULD_NOT"],
  );
});

test("tam kopyada SKIPPED dışında her görev taşınır", () => {
  const picked = selectTasksForPlanCopy(
    [copyTask("DONE"), copyTask("PLANNED"), copyTask("SKIPPED")],
    { carryOverIncomplete: false },
  );
  assert.deepEqual(picked.map((t) => t.status), ["DONE", "PLANNED"]);
});

test("aynı ödev hedef haftaya iki kez taşınmaz", () => {
  const picked = selectTasksForPlanCopy(
    [
      copyTask("PLANNED", { sourceType: "ASSIGNMENT", sourceReferenceId: "asg-1" }),
      copyTask("COULD_NOT", { sourceType: "ASSIGNMENT", sourceReferenceId: "asg-1" }),
      copyTask("PLANNED", { sourceType: "ASSIGNMENT", sourceReferenceId: "asg-2" }),
    ],
    { carryOverIncomplete: true },
  );
  assert.deepEqual(picked.map((t) => t.sourceReferenceId), ["asg-1", "asg-2"]);
});

/* ---------------------------------------------------------------- *
 * §21 — Birleşik "Bugün": aynı iş iki kez görünmez
 * ---------------------------------------------------------------- */

const DAY = new Date("2026-09-02T09:00:00.000Z");

function assignmentEvent(id: string): UnifiedCalendarEvent {
  return {
    id: `assignment:${id}`,
    type: "ASSIGNMENT_DUE",
    product: "OD",
    productLabel: "Dershanem",
    title: "Türev soruları",
    description: "Son tarih",
    startsAt: DAY,
    endsAt: null,
    href: "/panel/ogrenci/odevler",
    sourceId: id,
    sourceType: "Assignment",
  };
}

function coachingTaskEvent(id: string, linkedAssignmentId: string | null, isFlexible = true): UnifiedCalendarEvent {
  return {
    id: `coaching-task:${id}`,
    type: "COACHING_TASK",
    product: "OK",
    productLabel: "Koçum",
    title: "Türev soruları",
    description: null,
    startsAt: DAY,
    endsAt: null,
    href: "/panel/ogrenci/plan",
    sourceId: id,
    sourceType: "WeeklyPlanTask",
    linkedAssignmentId,
    isFlexible,
  };
}

test("plana yansıtılan ödev Bugün ekranında iki satır olmaz", () => {
  /*
   * OD + OK sahibi öğrencide bir ödev İKİ olay üretiyordu: ödevin kendi son
   * tarihi ve `assignment-projection`'ın plana yazdığı görev. Öğrenci tek işi
   * iki kez görüyordu.
   */
  const deduped = dedupeLinkedWorkItems([
    assignmentEvent("asg-1"),
    coachingTaskEvent("task-1", "asg-1"),
  ]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].type, "ASSIGNMENT_DUE");
  assert.equal(deduped[0].description, "Son tarih · haftalık planında");
});

test("ödeve bağlı olmayan plan görevi korunur", () => {
  const deduped = dedupeLinkedWorkItems([
    assignmentEvent("asg-1"),
    coachingTaskEvent("task-1", null),
  ]);
  assert.equal(deduped.length, 2);
});

test("ödevi görünmeyen bir plan görevi tek başına düşürülmez", () => {
  // Ödev pencerenin dışındaysa plan görevi tek temsilcidir; silinmemeli.
  const deduped = dedupeLinkedWorkItems([coachingTaskEvent("task-1", "asg-9")]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].type, "COACHING_TASK");
});

/* ---------------------------------------------------------------- *
 * §22 — Esnek görev sahte saatle gösterilmez
 * ---------------------------------------------------------------- */

test("esnek plan görevi saat etiketi taşımaz", () => {
  const dayStart = istanbulDayStart(DAY);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const flexible = { ...coachingTaskEvent("task-1", null, true), startsAt: dayStart };
  const [item] = buildTodayItems([flexible], DAY, dayStart, dayEnd);
  assert.equal(item.isFlexible, true);
  // Gün başlangıcından "00:00" üretmek öğrenciye uydurma bir randevu gösterir.
  assert.equal(serializeUnifiedTodayItem(item).timeLabel, null);
});

test("saatli plan görevi saat etiketini korur", () => {
  const dayStart = istanbulDayStart(DAY);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const scheduled = { ...coachingTaskEvent("task-2", null, false), startsAt: DAY };
  const [item] = buildTodayItems([scheduled], DAY, dayStart, dayEnd);
  assert.equal(item.isFlexible, false);
  assert.notEqual(serializeUnifiedTodayItem(item).timeLabel, null);
});

/* ---------------------------------------------------------------- *
 * §3 — Hafta sınırı (Europe/Istanbul)
 * ---------------------------------------------------------------- */

test("hafta sınırı pazar gecesi ve pazartesi 00:00'da kaymaz", () => {
  // 2026-09-06 Pazar, 2026-09-07 Pazartesi (İstanbul).
  const sundayLate = new Date("2026-09-06T20:59:00.000Z"); // 23:59 İstanbul
  const mondayStart = new Date("2026-09-06T21:00:00.000Z"); // 00:00 İstanbul, Pzt
  const weekOfSunday = istanbulWeekStart(sundayLate);
  const weekOfMonday = istanbulWeekStart(mondayStart);

  assert.notEqual(weekOfSunday.getTime(), weekOfMonday.getTime());
  assert.equal(isDateWithinPlanWeek(sundayLate, weekOfSunday), true);
  assert.equal(isDateWithinPlanWeek(mondayStart, weekOfSunday), false);
  assert.equal(isDateWithinPlanWeek(mondayStart, weekOfMonday), true);
});

test("öneri haftasına düşmeyen bugün, hafta başına sabitlenir", () => {
  /*
   * Öneri kabulünde kullanılan kural: "bugün" önerinin haftasında değilse
   * görev hafta başına yazılır. Eskiden koşulsuz "bugün" yazılıyordu ve
   * gelecek haftaya ait öneriden doğan görev, planının haftası DIŞINDA
   * kalıyordu — hafta görünümünde hiç listelenmiyordu.
   */
  const today = istanbulDayStart(new Date("2026-09-02T12:00:00.000Z"));
  const nextWeekStart = istanbulWeekStart(new Date("2026-09-09T12:00:00.000Z"));
  const scheduledFor = isDateWithinPlanWeek(today, nextWeekStart) ? today : nextWeekStart;
  assert.equal(scheduledFor.getTime(), nextWeekStart.getTime());
  assert.equal(isDateWithinPlanWeek(scheduledFor, nextWeekStart), true);
});

/* ---------------------------------------------------------------- *
 * §9, §10 — Plan yeniden üretimi yarım işi çoğaltmaz
 * ---------------------------------------------------------------- */

test("yeniden üretimde ayakta kalan görevin kaynağı yeniden eklenmez", () => {
  /*
   * Eskiden yalnız DONE görevlerin kaynağı dışlanıyordu. PARTIAL,
   * IN_PROGRESS ve COULD_NOT görevler yeniden üretimde SKIPPED
   * işaretlenmediği için ayakta kalıyor, aynı ödev İKİNCİ bir görev olarak
   * da ekleniyordu.
   */
  const keys = activePlanSourceKeys([
    { status: "DONE", sourceType: "ASSIGNMENT", sourceReferenceId: "asg-done", title: "a" },
    { status: "PARTIAL", sourceType: "ASSIGNMENT", sourceReferenceId: "asg-partial", title: "b" },
    { status: "IN_PROGRESS", sourceType: "REVIEW", sourceReferenceId: "rev-1", title: "c" },
    { status: "COULD_NOT", sourceType: "ASSIGNMENT", sourceReferenceId: "asg-failed", title: "d" },
    // Emekliye ayrılmış görev: kaynağı yeniden planlanabilir olmalı.
    { status: "SKIPPED", sourceType: "ASSIGNMENT", sourceReferenceId: "asg-skipped", title: "e" },
  ]);

  assert.ok(keys.has(planSourceKey({ sourceType: "ASSIGNMENT", sourceReferenceId: "asg-partial", title: "b" })));
  assert.ok(keys.has(planSourceKey({ sourceType: "REVIEW", sourceReferenceId: "rev-1", title: "c" })));
  assert.ok(keys.has(planSourceKey({ sourceType: "ASSIGNMENT", sourceReferenceId: "asg-failed", title: "d" })));
  assert.equal(
    keys.has(planSourceKey({ sourceType: "ASSIGNMENT", sourceReferenceId: "asg-skipped", title: "e" })),
    false,
    "SKIPPED görevin kaynağı yeniden planlanabilmeli",
  );
});

test("referanssız görevler başlığa göre eşleşir", () => {
  const keys = activePlanSourceKeys([
    { status: "PLANNED", sourceType: "WEAK_OUTCOME", sourceReferenceId: null, title: "Köklü ifadeler" },
  ]);
  assert.ok(
    keys.has(planSourceKey({ sourceType: "WEAK_OUTCOME", sourceReferenceId: null, title: "Köklü ifadeler" })),
  );
});
