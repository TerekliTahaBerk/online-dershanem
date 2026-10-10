import assert from "node:assert/strict";
import { test } from "node:test";

import { parseOdHome } from "@/lib/mobile-contracts/student";
import { buildStudentHomeActionPlan } from "@/lib/panel/student-home-actions";
import type { StudentHomeProductData } from "@/lib/panel/student-home-data";
import type { SerializedUnifiedTodayItem } from "@/lib/student-success/unified-today-serializer";

import { actionTarget, buildOdHome, buildOdToday, firstNameOf, isOdAction } from "./od-home";

const now = new Date("2026-10-08T09:00:00.000Z"); // 12:00 İstanbul
const at = (minutes: number) => new Date(now.getTime() + minutes * 60000);

function productData(overrides: Partial<StudentHomeProductData> = {}): StudentHomeProductData {
  return {
    OD: {
      todayLessons: [
        { id: "l-soon", startsAt: at(10), title: "Matematik", teacherName: "Ece Öğretmen", groupName: "8-A" },
        { id: "l-late", startsAt: at(300), title: "Fen", teacherName: null, groupName: "8-A" },
      ],
      nextRecovery: { id: "rp-1", lessonId: "l-missed", lessonTitle: "Türkçe", dueAt: at(600) },
    },
    OK: {
      weeklyPlan: null,
      todayTasks: [{ id: "t-1", title: "Yön görevi", durationMinutes: 30, scheduledFor: at(60), status: "PLANNED", reasonCode: "DUE_SOON" }],
      overdueTasks: [],
    },
    ODK: null,
    SHARED: { dueReview: { id: "rv-1", title: "Kesirler tekrarı", dueAt: at(-60) } },
    ...overrides,
  };
}

function feedItem(partial: Partial<SerializedUnifiedTodayItem> & Pick<SerializedUnifiedTodayItem, "id" | "kind">): SerializedUnifiedTodayItem {
  return {
    product: "OD",
    productLabel: "onlinedershanem.",
    title: partial.id,
    subtitle: null,
    startsAt: null,
    dueAt: null,
    priority: 90,
    href: "/panel/ogrenci/takvim",
    timeLabel: null,
    isFlexible: false,
    ...partial,
  };
}

test("OD Bugün: 'Şimdi' web ile aynı öncelik planından gelir; katılım penceresi işaretlenir", () => {
  const plan = buildStudentHomeActionPlan({ now, productData: productData(), products: ["OD"] });
  const home = buildOdHome({ now, fullName: "Ada Yılmaz", hasProfile: true, nowAction: plan.nowAction, actions: plan.allActions, feed: [], week: null, insight: null });
  assert.equal(home.now?.id, "lesson-l-soon");
  assert.equal(home.now?.joinable, true);
  assert.deepEqual(home.now?.target, { type: "lesson", lessonId: "l-soon" });
  assert.equal(home.firstName, "Ada");
  const parsed = parseOdHome(JSON.parse(JSON.stringify(home)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
});

test("OD Bugün: Yön görevi ve Deneme Ligi eylemi OD listesine GİRMEZ", () => {
  const plan = buildStudentHomeActionPlan({ now, productData: productData(), products: ["OD", "OK"] });
  assert.ok(plan.allActions.some((action) => action.product === "OK"), "ön koşul: plan Yön eylemi içeriyor");
  const today = buildOdToday({ nowAction: plan.nowAction, actions: plan.allActions, feed: [feedItem({ id: "coaching-task:t-1", kind: "COACHING_TASK", product: "OK" })] });
  assert.ok(today.every((item) => !item.id.includes("t-1")));
  assert.ok(today.every((item) => item.webPath !== "/panel/ogrenci/plan"));
});

test("OD Bugün: aynı varlık iki satır olmaz; 'Şimdi' dersi listede tekrar edilmez", () => {
  const plan = buildStudentHomeActionPlan({ now, productData: productData(), products: ["OD"] });
  const feed = [
    feedItem({ id: "lesson:l-soon", kind: "LESSON", startsAt: at(10).toISOString() }),
    feedItem({ id: "lesson:l-late", kind: "LESSON", startsAt: at(300).toISOString() }),
    feedItem({ id: "assignment:a-1", kind: "ASSIGNMENT_DUE", dueAt: at(200).toISOString(), href: "/panel/ogrenci/odevler" }),
  ];
  const today = buildOdToday({ nowAction: plan.nowAction, actions: plan.allActions, feed });
  const ids = today.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes("lesson:l-soon"), "Şimdi eylemi listede tekrar edilmez");
  assert.equal(ids.filter((id) => id === "lesson:l-late").length, 1);
  assert.deepEqual(
    today.find((item) => item.id === "assignment:a-1")?.target,
    { type: "assignment", assignmentId: "a-1" },
  );
});

test("OD Bugün: liste kronolojik; esnek / saatsiz öğeler sona", () => {
  const today = buildOdToday({
    nowAction: null,
    actions: [],
    feed: [
      feedItem({ id: "assignment:late", kind: "ASSIGNMENT_DUE", dueAt: at(500).toISOString() }),
      feedItem({ id: "other:flex", kind: "OTHER", startsAt: at(-500).toISOString(), isFlexible: true }),
      feedItem({ id: "lesson:early", kind: "LESSON", startsAt: at(5).toISOString() }),
    ],
  });
  assert.deepEqual(today.map((item) => item.id), ["lesson:early", "assignment:late", "other:flex"]);
});

test("OD Bugün: telafi ve tekrar eylemleri doğru native hedefe gider", () => {
  const plan = buildStudentHomeActionPlan({ now, productData: productData(), products: ["OD"] });
  const recovery = plan.allActions.find((action) => action.actionKind === "OPEN_RECOVERY")!;
  const review = plan.allActions.find((action) => action.actionKind === "OPEN_REVIEW")!;
  assert.deepEqual(actionTarget(recovery), { type: "recovery", lessonId: "l-missed" });
  assert.deepEqual(actionTarget(review), { type: "review" });
  assert.equal(isOdAction(review), true);
  assert.equal(isOdAction({ ...review, product: "OK", actionKind: "OPEN_PLAN" }), false);
  assert.deepEqual(actionTarget({ ...review, actionKind: "OPEN_PLAN" }), { type: "none" });
  assert.deepEqual(actionTarget({ ...recovery, href: "/panel/ogrenci/telafi" }), { type: "recovery", lessonId: null });
  assert.deepEqual(actionTarget({ ...plan.nowAction!, entityKey: "lesson:" }), { type: "lessons" });
});

test("OD Bugün: profil yoksa ürün verisi dönmez", () => {
  const home = buildOdHome({ now, fullName: null, hasProfile: false, nowAction: null, actions: [], feed: [], week: null, insight: null });
  assert.equal(home.state, "NO_PROFILE");
  assert.equal(home.now, null);
  assert.deepEqual(home.today, []);
  assert.equal(home.firstName, null);
});

test("OD Bugün: OD dışı 'Şimdi' eylemi (ör. Yön) hiç gösterilmez", () => {
  const plan = buildStudentHomeActionPlan({
    now,
    productData: productData({ OD: { todayLessons: [], nextRecovery: null }, SHARED: null }),
    products: ["OD", "OK"],
  });
  assert.equal(plan.nowAction?.product, "OK");
  const home = buildOdHome({ now, fullName: "Ada", hasProfile: true, nowAction: plan.nowAction, actions: plan.allActions, feed: [], week: null, insight: null });
  assert.equal(home.now, null);
  assert.deepEqual(home.today, []);
});

test("firstNameOf", () => {
  assert.equal(firstNameOf("  Ada   Yılmaz "), "Ada");
  assert.equal(firstNameOf(""), null);
  assert.equal(firstNameOf(undefined), null);
});
