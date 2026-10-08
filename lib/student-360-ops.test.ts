import assert from "node:assert/strict";
import test from "node:test";

import {
  canViewStudent360Commerce,
  derivePackageStatus,
  deriveStudent360Issues,
  deriveStudent360RiskSignals,
  examNetDelta,
  isStudent360ViewerRole,
  parseStudent360Tab,
  pickNearestUpcomingExam,
  pickNearestUpcomingLesson,
  planCompletionPercent,
  summarizeStudent360Risk,
  visibleStudent360Actions,
  visibleStudent360Tabs,
} from "./panel/student-360";
import type { PanelFeatureFlags } from "./panel-feature-flags";
import { panelFeatureDefaults } from "./panel-feature-flags";

const allFlagsOn: PanelFeatureFlags = Object.fromEntries(
  Object.keys(panelFeatureDefaults).map((key) => [key, true]),
) as PanelFeatureFlags;

const allFlagsOff: PanelFeatureFlags = { ...panelFeatureDefaults };

test("en yakın yaklaşan dersi seçer", () => {
  const now = new Date("2026-08-31T09:00:00.000Z");
  const lesson = pickNearestUpcomingLesson(
    [
      { id: "lesson-1", title: "Geçmiş", startsAt: new Date("2026-08-31T08:00:00.000Z") },
      { id: "lesson-2", title: "Yakın", startsAt: new Date("2026-08-31T09:30:00.000Z") },
      { id: "lesson-3", title: "Uzak", startsAt: new Date("2026-08-31T12:00:00.000Z") },
    ],
    now,
  );
  assert.equal(lesson?.id, "lesson-2");
});

test("canlı denemeyi yaklaşan planlı denemeye tercih eder", () => {
  const now = new Date("2026-08-31T09:00:00.000Z");
  const exam = pickNearestUpcomingExam(
    [
      {
        id: "exam-1",
        title: "Planlı deneme",
        status: "SCHEDULED",
        startsAt: new Date("2026-08-31T10:00:00.000Z"),
        endsAt: new Date("2026-08-31T12:00:00.000Z"),
      },
      {
        id: "exam-2",
        title: "Canlı deneme",
        status: "LIVE",
        startsAt: new Date("2026-08-31T08:30:00.000Z"),
        endsAt: new Date("2026-08-31T11:00:00.000Z"),
      },
    ],
    now,
  );
  assert.equal(exam?.id, "exam-2");
});

test("erişim sinyallerini ürün ve atama durumuna göre üretir", () => {
  const issues = deriveStudent360Issues({
    products: ["OD", "OK"],
    blockedProvisioningCount: 1,
    hasActiveGroup: false,
    hasParentLink: false,
    hasCoachAssignment: false,
  });
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["PROVISIONING_BLOCKED", "GROUP_MISSING", "PARENT_MISSING", "COACH_MISSING"],
  );
});

test("admin ticari sekmeyi görür, öğretmen görmez", () => {
  assert.equal(canViewStudent360Commerce("ADMIN"), true);
  assert.equal(canViewStudent360Commerce("TEACHER"), false);

  const adminTabs = visibleStudent360Tabs({
    role: "ADMIN",
    canViewCommerce: true,
    flags: allFlagsOn,
  });
  const teacherTabs = visibleStudent360Tabs({
    role: "TEACHER",
    canViewCommerce: false,
    flags: allFlagsOn,
  });
  assert.ok(adminTabs.includes("paket"));
  assert.equal(teacherTabs.includes("paket"), false);
});

test("feature flag kombinasyonları sekmeleri gizler", () => {
  const minimal = visibleStudent360Tabs({
    role: "TEACHER",
    canViewCommerce: false,
    flags: allFlagsOff,
  });
  assert.deepEqual(minimal, ["genel", "dersler", "odevler", "veli", "takvim", "gelisim"]);

  const full = visibleStudent360Tabs({
    role: "ADMIN",
    canViewCommerce: true,
    flags: allFlagsOn,
  });
  assert.ok(full.includes("odevler"));
  assert.ok(full.includes("ogretmenler"));
  assert.ok(full.includes("takvim"));
  assert.ok(full.includes("gelisim"));
  assert.ok(full.includes("kocluk"));
  assert.ok(full.includes("denemeler"));
  assert.ok(full.includes("risk"));
  assert.ok(full.includes("paket"));
});

test("geçersiz sekme güvenli varsayılana düşer", () => {
  assert.equal(parseStudent360Tab("paket", ["genel", "dersler"]), "genel");
  assert.equal(parseStudent360Tab("dersler", ["genel", "dersler", "odevler"]), "dersler");
  assert.equal(parseStudent360Tab(undefined, ["genel", "veli"]), "genel");
});

test("aksiyonlar role ve permission'a göre filtrelenir", () => {
  const admin = visibleStudent360Actions({
    role: "ADMIN",
    studentProfileId: "stu-1",
    studentUserId: "user-1",
    canViewCommerce: true,
    hasCoachAccess: true,
    flags: allFlagsOn,
  });
  assert.ok(admin.some((action) => action.id === "MANAGE_ACCOUNT_PACKAGE"));
  assert.ok(admin.some((action) => action.id === "MANAGE_GROUP"));

  const teacher = visibleStudent360Actions({
    role: "TEACHER",
    studentProfileId: "stu-1",
    studentUserId: "user-1",
    canViewCommerce: false,
    hasCoachAccess: false,
    flags: allFlagsOn,
  });
  assert.equal(teacher.some((action) => action.id === "MANAGE_ACCOUNT_PACKAGE"), false);
  assert.equal(teacher.some((action) => action.id === "MANAGE_GROUP"), false);
  assert.equal(teacher.some((action) => action.id === "ADD_COACHING_NOTE"), false);

  const coachTeacher = visibleStudent360Actions({
    role: "TEACHER",
    studentProfileId: "stu-1",
    studentUserId: "user-1",
    canViewCommerce: false,
    hasCoachAccess: true,
    flags: allFlagsOn,
  });
  assert.ok(coachTeacher.some((action) => action.id === "ADD_COACHING_NOTE"));
});

test("riskli öğrenci için açıklanabilir sinyaller üretir", () => {
  const items = deriveStudent360RiskSignals({
    attendanceAbsentCount14d: 2,
    attendanceTotalCount14d: 4,
    overdueAssignmentCount: 3,
    planCompletionPercent: 42,
    planTaskTotal: 7,
    examNetDrop: 4.5,
    openHelpRequestCount: 1,
    daysSinceLastLogin: 16,
    reviewDueCount: 10,
    blockedProvisioningCount: 0,
    products: ["OD"],
    hasActiveGroup: true,
    hasParentLink: true,
    hasCoachAssignment: true,
    now: new Date("2026-09-01T10:00:00.000Z"),
  });

  assert.ok(items.some((item) => item.code === "ABSENCE" && item.reason.includes("2 ders kaçırdı")));
  assert.ok(items.some((item) => item.code === "OVERDUE_ASSIGNMENT" && item.reason.includes("3 ödev")));
  assert.ok(
    items.some((item) => item.code === "PLAN_UNDERPERFORMING" && item.reason.includes("%42")),
  );
  assert.ok(items.some((item) => item.code === "EXAM_DROP"));
  assert.ok(items.some((item) => item.code === "HELP_REQUEST"));
  assert.ok(items.some((item) => item.code === "INACTIVE_LOGIN"));
  assert.ok(items.some((item) => item.code === "REVIEW_QUEUE_GROWTH"));

  const summary = summarizeStudent360Risk(items);
  assert.equal(summary.level, "high");
  assert.ok(summary.whyRisky.length >= 1);
  assert.ok(summary.totalPoints >= 50);
});

test("paketi olmayan ve denemesi olmayan öğrenci için risk üretmez", () => {
  const items = deriveStudent360RiskSignals({
    attendanceAbsentCount14d: 0,
    attendanceTotalCount14d: 0,
    overdueAssignmentCount: 0,
    planCompletionPercent: null,
    planTaskTotal: 0,
    examNetDrop: null,
    openHelpRequestCount: 0,
    daysSinceLastLogin: 2,
    reviewDueCount: 0,
    blockedProvisioningCount: 0,
    products: [],
    hasActiveGroup: false,
    hasParentLink: false,
    hasCoachAssignment: false,
  });
  assert.deepEqual(items, []);
  assert.equal(summarizeStudent360Risk(items).level, "none");
  assert.equal(examNetDelta(null, null), null);
  assert.equal(planCompletionPercent(0, 0), null);
  assert.equal(derivePackageStatus({ activeProductCount: 0, blockedProvisioningCount: 0, nearestExpiryAt: null }), "none");
});

test("paket durumu provisioning ve yenilemeyi ayırır", () => {
  assert.equal(
    derivePackageStatus({
      activeProductCount: 1,
      blockedProvisioningCount: 1,
      nearestExpiryAt: null,
    }),
    "provisioning_blocked",
  );
  assert.equal(
    derivePackageStatus({
      activeProductCount: 2,
      blockedProvisioningCount: 0,
      nearestExpiryAt: new Date("2026-09-15T00:00:00.000Z"),
      now: new Date("2026-09-01T00:00:00.000Z"),
    }),
    "expiring",
  );
  assert.equal(
    derivePackageStatus({
      activeProductCount: 1,
      blockedProvisioningCount: 0,
      nearestExpiryAt: null,
    }),
    "active",
  );
});

test("veli ve öğrenci Student 360 izleyicisi değildir", () => {
  assert.equal(isStudent360ViewerRole("PARENT"), false);
  assert.equal(isStudent360ViewerRole("STUDENT"), false);
  assert.equal(isStudent360ViewerRole("ADMIN"), true);
  assert.equal(isStudent360ViewerRole("TEACHER"), true);
});

test("permission isolation: öğretmen aksiyonlarında ticari işlem yoktur", () => {
  const teacher = visibleStudent360Actions({
    role: "TEACHER",
    studentProfileId: "stu-1",
    studentUserId: "user-1",
    canViewCommerce: false,
    hasCoachAccess: true,
    flags: {
      adaptivePlan: true,
      interventionInbox: true,
    },
  });
  for (const action of teacher) {
    assert.notEqual(action.id, "MANAGE_ACCOUNT_PACKAGE");
    assert.equal(action.href.includes("/siparisler"), false);
    assert.equal(action.href.includes("/kullanicilar/"), false);
  }
});

test("üst sekmeler bölümlerden türetilir; eski sekmeler takma adla doğru yere düşer (§12)", async () => {
  const { resolveStudent360Location, visibleStudent360Groups, student360GroupHref, STUDENT_360_TAB_ALIASES } = await import("./panel/student-360");
  const all = visibleStudent360Tabs({ role: "ADMIN", canViewCommerce: true, flags: allFlagsOn });
  assert.deepEqual(visibleStudent360Groups(all), ["genel", "ogrenme", "yon", "deneme-ligi", "etkinlik", "risk", "paket"]);
  const minimal = visibleStudent360Tabs({ role: "TEACHER", canViewCommerce: false, flags: allFlagsOff });
  assert.deepEqual(visibleStudent360Groups(minimal), ["genel", "ogrenme", "etkinlik"]);

  const at = (sekme?: string, gorunum?: string, sections = all) => resolveStudent360Location({ sekme, gorunum, sections });
  assert.deepEqual(at(), { group: "genel", view: null, sections: ["genel", "ogretmenler", "veli"], anchor: null });
  assert.deepEqual(at(undefined, undefined, minimal).sections, ["genel", "veli"], "öğretmen bölümü yalnız ADMIN");
  assert.deepEqual(at("dersler"), { group: "ogrenme", view: "dersler", sections: ["dersler"], anchor: null });
  assert.equal(at("gelisim").view, "gelisim");
  assert.equal(at("ogrenme").view, "dersler", "alt görünüm yoksa ilk görünüm");
  assert.equal(at("ogrenme", "takvim").view, "takvim");
  assert.equal(at("ogrenme", "bilinmeyen").view, "dersler");
  assert.equal(at("veli").anchor, "iliskiler");
  assert.equal(at("ogretmenler").group, "genel");
  assert.deepEqual(at("kocluk").sections, ["kocluk"]);
  assert.equal(at("kocluk").group, "yon");
  assert.equal(at("denemeler").group, "deneme-ligi");
  assert.deepEqual(at("etkinlik").sections, []);
  assert.equal(at("paket").group, "paket");
  assert.equal(at("paket", undefined, minimal).group, "genel", "görünmeyen sekme Genel'e düşer");
  assert.equal(at("yok").group, "genel");
  assert.equal(resolveStudent360Location({ sekme: ["risk", "x"], sections: all }).group, "risk");
  for (const tab of all) assert.ok(STUDENT_360_TAB_ALIASES[tab], `${tab} için takma ad`);
  assert.equal(student360GroupHref("/p/s1", "ogrenme", "odevler"), "/p/s1?sekme=ogrenme&gorunum=odevler");
  assert.equal(student360GroupHref("/p/s1?x=1", "genel"), "/p/s1?x=1&sekme=genel");
});

test("bölüm kümesi veri yükleme kararlarını verir", async () => {
  const { deriveStudent360QueryRequirements } = await import("./panel/student-360/policy");
  const access = { role: "ADMIN", canViewCommerce: true } as Parameters<typeof deriveStudent360QueryRequirements>[0]["access"];
  const genel = deriveStudent360QueryRequirements({ access, tab: "genel", flags: allFlagsOn, sections: ["genel", "ogretmenler", "veli"] });
  assert.equal(genel.needsOverview && genel.needsTeachersTab && genel.needsParent, true);
  assert.equal(genel.needsLessons, false);
  const etkinlik = deriveStudent360QueryRequirements({ access, tab: "genel", flags: allFlagsOn, sections: [] });
  assert.equal(etkinlik.needsOverview, false, "Etkinlik bölüm yüklemez");
  const legacy = deriveStudent360QueryRequirements({ access, tab: "dersler", flags: allFlagsOn });
  assert.equal(legacy.needsLessons, true);
});

test("OD ilişkisi olmayan koç Öğrenme'yi yalnız özet olarak görür", async () => {
  const { restrictStudent360SectionsForAccess, resolveStudent360Location, visibleStudent360Groups } = await import("./panel/student-360");
  const teacherTabs = visibleStudent360Tabs({ role: "TEACHER", canViewCommerce: false, flags: allFlagsOn });
  const coach = restrictStudent360SectionsForAccess(teacherTabs, "coach");
  assert.equal(coach.includes("dersler") || coach.includes("odevler") || coach.includes("takvim"), false);
  assert.ok(coach.includes("gelisim"));
  assert.ok(visibleStudent360Groups(coach).includes("ogrenme"));
  assert.equal(resolveStudent360Location({ sekme: "dersler", sections: coach }).view, "gelisim", "eski ders bağlantısı özete düşer");
  assert.deepEqual(restrictStudent360SectionsForAccess(teacherTabs, "teacher_group"), teacherTabs);
});
