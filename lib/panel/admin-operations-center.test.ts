import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminOperationsCenter,
  buildRiskDistribution,
  countBand,
  formatAuditActivity,
  formatOpsAge,
  sortOpsActions,
  summaryLine,
  parseOpsGroupFilter,
  OPS_ACTION_GROUP,
  type AdminOperationsCenterInput,
  type OpsActionItem,
} from "./admin-operations-center";

const NOW = new Date("2026-09-01T09:00:00.000Z");

function baseInput(overrides: Partial<AdminOperationsCenterInput> = {}): AdminOperationsCenterInput {
  return {
    now: NOW,
    flags: {
      interventionInbox: false,
      studentCheckIn: false,
      mockExamAnalysis: false,
      baselineMetrics: true,
    },
    partialData: false,
    counts: {
      todayLessons: 0,
      activeStudents: 0,
      pendingJobs: 0,
      openInterventions: null,
      newOrdersToday: 0,
      provisioningPending: 0,
      todayExams: 0,
      manualReview: 0,
      retryPending: 0,
      invitePending: 0,
      studentsWithoutGroup: 0,
      studentsWithoutParent: 0,
      groupsWithInactiveTeacher: 0,
      lessonsMissingPlan: 0,
      openHelpRequests: 0,
      cancelledLessonsToday: 0,
      unnotedLessons: 0,
      stalePlans: 0,
      unifiedOpenOps: 0,
      unifiedBlockingOps: 0,
      failedExams: 0,
      profileMismatch: 0,
    },
    samples: {
      manualReviewOrders: [],
      pendingOrders: [],
      retryOrders: [],
      invites: [],
      studentsWithoutGroup: [],
      studentsWithoutParent: [],
      groupsWithInactiveTeacher: [],
      lessonsMissingPlan: [],
      helpRequests: [],
      interventions: [],
      paidNoAccount: [],
      failedExams: [],
      audits: [],
    },
    riskStudentIds: { critical: [], watch: [] },
    health: {
      database: "ok",
      databaseDetail: "12 ms",
      jobs: "ok",
      jobsDetail: "sağlıklı",
      email: "ok",
      emailDetail: "temiz",
      payment: "ok",
      paymentDetail: "hazır",
      meta: "unknown",
      metaDetail: "kapalı",
      backup: "unknown",
      backupDetail: "tanımsız",
    },
    ...overrides,
  };
}

test("velisiz öğrenci aksiyonu üretir", () => {
  const snapshot = buildAdminOperationsCenter(
    baseInput({
      counts: {
        ...baseInput().counts,
        studentsWithoutParent: 1,
      },
      samples: {
        ...baseInput().samples,
        studentsWithoutParent: [
          {
            profileId: "sp1",
            label: "Ayşe Yılmaz",
            since: new Date("2026-08-20T09:00:00.000Z"),
          },
        ],
      },
    }),
  );
  const action = snapshot.actions.find((item) => item.code === "STUDENT_NO_PARENT");
  assert.ok(action);
  assert.equal(action?.severity, "WATCH");
  assert.match(action?.href || "", /sekme=veli/);
});

test("boş sistem: aksiyon yok, özet kartları tıklanabilir hedef taşır", () => {
  const snapshot = buildAdminOperationsCenter(baseInput());
  assert.equal(snapshot.actions.length, 0);
  assert.equal(snapshot.openActionCount, 0);
  assert.equal(snapshot.blockingCount, 0);
  assert.equal(snapshot.activities.length, 0);
  assert.equal(snapshot.risk.total, 0);

  const hrefs = snapshot.summary.map((tile) => tile.href);
  assert.ok(hrefs.includes("/panel/yonetim/takvim"));
  assert.ok(hrefs.includes("/panel/yonetim/isler"));
  assert.ok(hrefs.includes("/panel/yonetim/siparisler?filtre=sorun"));
  assert.ok(hrefs.includes("/panel/odk/yonetim/operasyon"));

  const interventions = snapshot.summary.find((tile) => tile.id === "open_interventions");
  assert.equal(interventions?.available, false);
  assert.equal(interventions?.href, "/panel/yonetim/raporlar");
});

test("yoğun operasyon: kritik aksiyonlar önce gelir ve CTA hedefleri dolu", () => {
  const snapshot = buildAdminOperationsCenter(
    baseInput({
      flags: {
        interventionInbox: true,
        studentCheckIn: true,
        mockExamAnalysis: true,
        baselineMetrics: true,
      },
      counts: {
        ...baseInput().counts,
        activeStudents: 40,
        todayLessons: 8,
        pendingJobs: 12,
        openInterventions: 3,
        provisioningPending: 5,
        unifiedOpenOps: 4,
        unifiedBlockingOps: 2,
        invitePending: 2,
        studentsWithoutGroup: 1,
        groupsWithInactiveTeacher: 1,
        lessonsMissingPlan: 1,
        openHelpRequests: 1,
        failedExams: 1,
        profileMismatch: 0,
      },
      samples: {
        ...baseInput().samples,
        manualReviewOrders: [
          {
            id: "o1",
            packageName: "OD YKS",
            updatedAt: new Date("2026-08-31T08:00:00.000Z"),
            ownerLabel: "Ali Veli",
          },
        ],
        paidNoAccount: [
          {
            id: "o2",
            packageName: "OD LGS",
            updatedAt: new Date("2026-08-31T10:00:00.000Z"),
            ownerLabel: "hesap bağlantısı bekleniyor",
          },
        ],
        invites: [
          {
            id: "u1",
            label: "Ayşe",
            role: "STUDENT",
            inviteSentAt: new Date("2026-08-30T09:00:00.000Z"),
            createdAt: new Date("2026-08-29T09:00:00.000Z"),
          },
        ],
        studentsWithoutGroup: [
          {
            profileId: "sp1",
            label: "Mehmet",
            since: new Date("2026-08-28T09:00:00.000Z"),
          },
        ],
        groupsWithInactiveTeacher: [
          {
            id: "g1",
            name: "8A",
            teacherLabel: "Eski Öğretmen",
            updatedAt: new Date("2026-08-27T09:00:00.000Z"),
          },
        ],
        lessonsMissingPlan: [
          {
            id: "l1",
            title: "Matematik",
            groupName: "8A",
            startsAt: new Date("2026-09-01T14:00:00.000Z"),
            reason: "toplantı linki yok",
          },
        ],
        helpRequests: [
          {
            id: "h1",
            studentLabel: "Zeynep",
            groupName: "9B",
            createdAt: new Date("2026-08-31T12:00:00.000Z"),
            dueAt: new Date("2026-08-31T18:00:00.000Z"),
            ownerLabel: "Öğretmen A",
          },
        ],
        interventions: [
          {
            id: "i1",
            studentLabel: "Can",
            explanation: "Devamsızlık örüntüsü",
            createdAt: new Date("2026-08-30T09:00:00.000Z"),
            dueAt: new Date("2026-08-31T09:00:00.000Z"),
            ownerLabel: "Admin",
            overdue: true,
          },
        ],
        failedExams: [
          {
            id: "e1",
            title: "TYT Deneme",
            detail: "Meet linki yok",
            updatedAt: new Date("2026-09-01T07:00:00.000Z"),
          },
        ],
        audits: [
          {
            id: "a1",
            action: "od.provisioning.succeeded",
            summary: "Sipariş #123 provision edildi.",
            entityType: "OdOrder",
            entityId: "order-123",
            createdAt: new Date("2026-09-01T08:30:00.000Z"),
            actorLabel: "Sistem",
          },
        ],
      },
      riskStudentIds: {
        critical: ["sp-critical", "sp-help"],
        watch: ["sp-watch", "sp-critical"],
      },
      health: {
        ...baseInput().health,
        jobs: "degraded",
        jobsDetail: "email-retry gecikmiş",
      },
    }),
  );

  assert.ok(snapshot.actions.length >= 6);
  assert.equal(snapshot.actions[0]?.severity, "BLOCKING");
  assert.ok(snapshot.actions.every((item) => item.href.startsWith("/panel/")));
  assert.ok(snapshot.actions.every((item) => item.ctaLabel.length > 0));

  const codes = new Set(snapshot.actions.map((item) => item.code));
  assert.ok(codes.has("PROVISIONING_FAILED"));
  assert.ok(codes.has("PAID_NO_ACCOUNT"));
  assert.ok(codes.has("HELP_REQUEST_OPEN"));
  assert.ok(codes.has("HIGH_RISK_STUDENT"));
  assert.ok(codes.has("MOCK_EXAM_FAILED"));

  assert.equal(snapshot.activities[0]?.text, "Sipariş #123 provision edildi.");
  assert.equal(snapshot.activities[0]?.href, "/panel/yonetim/siparisler/order-123");

  assert.equal(snapshot.risk.critical, 2);
  assert.equal(snapshot.risk.watch, 1);
  assert.equal(snapshot.risk.normal, 37);

  const interventions = snapshot.summary.find((tile) => tile.id === "open_interventions");
  assert.equal(interventions?.available, true);
  assert.equal(interventions?.href, "/panel/yonetim/mudahale");
  assert.equal(interventions?.value, 3);
});

test("feature flag kapalıyken müdahale ve yardım sinyalleri üretilmez", () => {
  const snapshot = buildAdminOperationsCenter(
    baseInput({
      flags: {
        interventionInbox: false,
        studentCheckIn: false,
        mockExamAnalysis: false,
        baselineMetrics: true,
      },
      samples: {
        ...baseInput().samples,
        helpRequests: [
          {
            id: "h1",
            studentLabel: "Zeynep",
            groupName: "9B",
            createdAt: NOW,
            dueAt: NOW,
            ownerLabel: null,
          },
        ],
        interventions: [
          {
            id: "i1",
            studentLabel: "Can",
            explanation: "Plan",
            createdAt: NOW,
            dueAt: NOW,
            ownerLabel: null,
            overdue: true,
          },
        ],
      },
    }),
  );

  assert.ok(!snapshot.actions.some((item) => item.code === "HELP_REQUEST_OPEN"));
  assert.ok(!snapshot.actions.some((item) => item.code === "HIGH_RISK_STUDENT"));
  assert.equal(snapshot.summary.find((t) => t.id === "open_interventions")?.available, false);
  assert.equal(snapshot.risk.watchHref, "/panel/yonetim/ogrenciler?durum=dikkat");
});

test("kritik CTA navigasyon hedefleri kararlıdır", () => {
  const snapshot = buildAdminOperationsCenter(
    baseInput({
      samples: {
        ...baseInput().samples,
        manualReviewOrders: [
          {
            id: "ord-9",
            packageName: "Paket",
            updatedAt: NOW,
            ownerLabel: "Ali",
          },
        ],
        groupsWithInactiveTeacher: [
          {
            id: "grp-1",
            name: "7A",
            teacherLabel: "X",
            updatedAt: NOW,
          },
        ],
      },
      health: {
        ...baseInput().health,
        database: "down",
        databaseDetail: "yok",
      },
    }),
  );

  const byCode = new Map(snapshot.actions.map((item) => [item.code, item]));
  assert.equal(byCode.get("PROVISIONING_FAILED")?.href, "/panel/yonetim/siparisler/ord-9");
  assert.equal(byCode.get("GROUP_TEACHER_INACTIVE")?.href, "/panel/yonetim/gruplar/grp-1");
  assert.equal(byCode.get("SYSTEM_CRON")?.href, "/panel/yonetim/isler#cron-durumu");
});

test("risk dağılımı kritik öğrenciyi watch'tan düşer", () => {
  const risk = buildRiskDistribution({
    activeStudentCount: 10,
    criticalStudentIds: ["a", "b"],
    watchStudentIds: ["b", "c", "d"],
  });
  assert.equal(risk.critical, 2);
  assert.equal(risk.watch, 2);
  assert.equal(risk.normal, 6);
});

test("audit aktivitesi summary yoksa okunabilir fallback üretir", () => {
  const activity = formatAuditActivity({
    id: "1",
    action: "user.invite_resent",
    summary: null,
    entityType: "User",
    entityId: "u1",
    createdAt: NOW,
    actorLabel: "Admin",
  });
  assert.match(activity.text, /davet/i);
  assert.equal(activity.href, "/panel/yonetim/kullanicilar");
});

test("öncelik sıralaması severity sonra yaşa göre çalışır", () => {
  const older: OpsActionItem = {
    id: "1",
    code: "PROVISIONING_PENDING",
    group: "COMMERCE",
    severity: "ACTION_REQUIRED",
    title: "eski",
    subject: "x",
    ageLabel: "2 gün",
    owner: null,
    href: "/a",
    ctaLabel: "Aç",
    createdAt: new Date("2026-08-30T09:00:00.000Z"),
  };
  const newerBlocking: OpsActionItem = {
    id: "2",
    code: "PROVISIONING_FAILED",
    group: "COMMERCE",
    severity: "BLOCKING",
    title: "yeni bloke",
    subject: "y",
    ageLabel: "1 sa",
    owner: null,
    href: "/b",
    ctaLabel: "Çöz",
    createdAt: new Date("2026-09-01T08:00:00.000Z"),
  };
  const sorted = [older, newerBlocking].sort(sortOpsActions);
  assert.equal(sorted[0]?.id, "2");
});

test("yaş ve bant yardımcıları deterministik", () => {
  assert.equal(formatOpsAge(new Date("2026-09-01T08:30:00.000Z"), NOW), "30 dk");
  assert.equal(formatOpsAge(new Date("2026-08-31T09:00:00.000Z"), NOW), "1 gün");
  assert.equal(countBand(0), "0");
  assert.equal(countBand(3), "1-5");
  assert.equal(countBand(12), "6-20");
  assert.equal(countBand(40), "21+");
});

test("kısmi veri sinyali aksiyon üretir", () => {
  const snapshot = buildAdminOperationsCenter(baseInput({ partialData: true }));
  assert.ok(snapshot.actions.some((item) => item.code === "SYSTEM_PARTIAL_DATA"));
  assert.equal(snapshot.partialData, true);
});

test("Yön, Deneme Ligi ve Güvenlik kaynakları gruplu gelen kutusu satırı üretir (§13)", () => {
  const since = new Date("2026-08-28T09:00:00.000Z");
  const snapshot = buildAdminOperationsCenter(
    baseInput({
      extended: {
        yonNoCoach: { count: 3, samples: [{ profileId: "sp9", label: "Selin D.", since }] },
        coachOverCapacity: [{ id: "c1", label: "Zeynep A.", load: 18, capacity: 15 }],
        yonSessionOverdue: { count: 2, samples: [{ profileId: "sp2", label: "Ali K.", since, days: 4 }] },
        dlIncomplete: [{ id: "e1", title: "TYT-4", detail: "3 bloke sorun", updatedAt: since }],
        dlUnscored: [{ id: "e2", title: "AYT-2", detail: "", updatedAt: since, count: 18 }],
        dlAwaitingRelease: [{ id: "e3", title: "LGS-3", detail: "", updatedAt: since }],
        dlIntegrity: [{ id: "e4", title: "LGS-1", detail: "", updatedAt: since, count: 4 }],
        mfaResetPending: [{ id: "m1", targetUserId: "u1", targetLabel: "Mehmet Y.", requestedByLabel: "Admin K.", createdAt: since }],
        staffWithoutMfa: [{ userId: "u2", label: "Elif K.", since }],
      },
    }),
  );
  const byCode = (code: string) => snapshot.actions.filter((item) => item.code === code);
  assert.equal(byCode("YON_NO_COACH").length, 2, "örnek + 'daha fazla' satırı");
  assert.match(byCode("YON_NO_COACH")[0]!.href, /onizle=ata:sp9/);
  assert.equal(byCode("YON_NO_COACH")[1]!.title, "2 öğrenci daha koç bekliyor");
  assert.equal(byCode("YON_COACH_OVER_CAPACITY")[0]!.subject, "Zeynep A. · 18/15");
  assert.match(byCode("YON_SESSION_OVERDUE")[0]!.subject, /Ali K\. · 4 gün ve diğerleri/);
  const unscored = byCode("DL_UNSCORED")[0]!;
  assert.equal(unscored.severity, "BLOCKING");
  assert.equal(unscored.href, "/panel/odk/yonetim/sinavlar/e2?sekme=puanlama");
  assert.equal(byCode("DL_AWAITING_RELEASE")[0]!.ctaLabel, "Yayın önizleme");
  assert.equal(byCode("DL_INTEGRITY_REVIEW")[0]!.href, "/panel/odk/yonetim/sinavlar/e4?sekme=butunluk");
  assert.equal(byCode("DL_EXAM_INCOMPLETE")[0]!.href, "/panel/odk/yonetim/sinavlar/e1?sekme=genel");
  assert.equal(byCode("SECURITY_MFA_RESET_PENDING")[0]!.ctaLabel, "Onayla");
  assert.equal(byCode("SECURITY_STAFF_NO_MFA")[0]!.href, "/panel/yonetim/kullanicilar/u2");
  assert.ok(snapshot.actions.every((item) => item.group === OPS_ACTION_GROUP[item.code]));
  assert.equal(snapshot.actions[0]!.severity, "BLOCKING", "kritik en üstte");
  const groups = new Set(snapshot.actions.map((item) => item.group));
  assert.deepEqual([...groups].sort(), ["DL", "SECURITY", "YON"]);
});

test("tek kişi geciken görüşme ve gün bilgisi olmadan da okunur", () => {
  const since = new Date("2026-08-28T09:00:00.000Z");
  const empty = { count: 0, samples: [] };
  const snapshot = buildAdminOperationsCenter(
    baseInput({
      extended: {
        yonNoCoach: empty,
        coachOverCapacity: [],
        yonSessionOverdue: { count: 1, samples: [{ profileId: "sp2", label: "Ali K.", since, days: null }] },
        dlIncomplete: [],
        dlUnscored: [],
        dlAwaitingRelease: [],
        dlIntegrity: [],
        mfaResetPending: [],
        staffWithoutMfa: [],
      },
    }),
  );
  assert.equal(snapshot.actions.length, 1);
  assert.equal(snapshot.actions[0]!.subject, "Ali K.");
  const noSample = buildAdminOperationsCenter(
    baseInput({
      extended: {
        yonNoCoach: empty,
        coachOverCapacity: [],
        yonSessionOverdue: { count: 2, samples: [] },
        dlIncomplete: [],
        dlUnscored: [],
        dlAwaitingRelease: [],
        dlIntegrity: [],
        mfaResetPending: [],
        staffWithoutMfa: [],
      },
    }),
  );
  assert.equal(noSample.actions[0]!.subject, "Koçluk");
});

test("gelen kutusu süzgeci ve bugün satırı", () => {
  assert.equal(parseOpsGroupFilter("YON"), "YON");
  assert.equal(parseOpsGroupFilter("x"), "tumu");
  assert.equal(parseOpsGroupFilter(undefined), "tumu");
  const snapshot = buildAdminOperationsCenter(
    baseInput({ counts: { ...baseInput().counts, todayLessons: 12, activeStudents: 340, todayExams: 2, newOrdersToday: 5, openInterventions: null } }),
  );
  const line = summaryLine(snapshot.summary);
  assert.ok(line.some((item) => item.text === "12 ders"));
  assert.ok(line.some((item) => item.text === "340 aktif öğrenci"));
  assert.ok(line.every((item) => item.href.startsWith("/panel/")));
  assert.ok(!line.some((item) => item.id === "open_interventions"), "kullanılamayan kutucuk satıra girmez");
});
