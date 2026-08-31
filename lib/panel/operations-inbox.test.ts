import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveLeadLifecycleStatus,
  deriveUnifiedOperationItems,
} from "./operations-inbox";

test("lifecycle handoff durumları satıştan öğrenciye deterministik ilerler", () => {
  assert.equal(
    deriveLeadLifecycleStatus({
      stage: "CONTACTED",
      productInterest: "ONLINE_DERSHANEM",
      relatedOdOrderId: null,
      relatedOdkOrderId: null,
      relatedOdUserId: null,
      relatedOdkUserId: null,
    }).code,
    "PRE_SALE",
  );
  assert.equal(
    deriveLeadLifecycleStatus({
      stage: "WON",
      productInterest: "ONLINE_DERSHANEM",
      relatedOdOrderId: null,
      relatedOdkOrderId: null,
      relatedOdUserId: null,
      relatedOdkUserId: null,
    }).code,
    "WON_WITHOUT_ORDER",
  );
  assert.equal(
    deriveLeadLifecycleStatus({
      stage: "WON",
      productInterest: "ONLINE_DERSHANEM",
      relatedOdOrderId: "od-1",
      relatedOdkOrderId: null,
      relatedOdUserId: null,
      relatedOdkUserId: null,
    }).code,
    "PAID_ACCOUNT_PENDING",
  );
  assert.equal(
    deriveLeadLifecycleStatus({
      stage: "WON",
      productInterest: "ONLINE_DERSHANEM",
      relatedOdOrderId: "od-1",
      relatedOdkOrderId: null,
      relatedOdUserId: "user-1",
      relatedOdkUserId: null,
    }).code,
    "ACCOUNT_READY",
  );
});

test("unified operations inbox gerçek istisnaları üretir", () => {
  const now = new Date("2026-09-01T09:00:00.000Z");
  const items = deriveUnifiedOperationItems({
    now,
    onboardings: [
      {
        id: "ob-1",
        orderId: "order-1",
        packageName: "OD YKS",
        state: "PAID",
        blockerReason: null,
        ownerName: null,
        dueAt: new Date("2026-09-01T08:00:00.000Z"),
        stateEnteredAt: new Date("2026-09-01T07:00:00.000Z"),
        studentLabel: "Ali",
        hasAccount: false,
        hasParent: false,
        hasGroup: false,
        hasFirstLesson: false,
        studentProfileId: null,
        nextAction: "İletişim",
      },
      {
        id: "ob-2",
        orderId: "order-2",
        packageName: "OD LGS",
        state: "PLACEMENT_PENDING",
        blockerReason: null,
        ownerName: "Operasyon",
        dueAt: new Date("2026-09-01T08:00:00.000Z"),
        stateEnteredAt: new Date("2026-09-01T06:00:00.000Z"),
        studentLabel: "Ayşe",
        hasAccount: true,
        hasParent: true,
        hasGroup: false,
        hasFirstLesson: false,
        studentProfileId: "student-2",
        nextAction: "Grup ata",
      },
    ],
    cancelledLessons: [
      {
        id: "lesson-1",
        title: "Fonksiyonlar",
        startsAt: new Date("2026-09-01T05:00:00.000Z"),
        groupName: "TYT Sayısal",
        teacherName: "Öğretmen",
        hasFollowUpLesson: false,
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => item.code),
    ["PAID_NO_ACCOUNT", "TEACHER_HANDOFF_NEEDED", "LESSON_CANCELLED"],
  );
  assert.equal(items[0].severity, "BLOCKING");
  assert.equal(items[1].owner, "Operasyon");
  assert.equal(items[2].resolution, "OPEN");
});
