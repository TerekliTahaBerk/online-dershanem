import assert from "node:assert/strict";
import test from "node:test";

import { evaluateLeadUserMatch } from "./identity";
import { calculateLifecycleFunnelMetrics } from "./metrics";
import {
  deriveLifecycleStudentStatus,
  provisioningErrorGuidance,
  toLifecycleLeadStage,
  toLifecycleOrderStatus,
  toLifecycleProvisioningStatus,
} from "./states";
import { buildLeadLifecycleTimeline } from "./timeline";

test("mevcut enumlar lifecycle view kodlarına map edilir (duplicate enum yok)", () => {
  assert.equal(toLifecycleLeadStage("OFFER_SENT"), "OFFERED");
  assert.equal(toLifecycleLeadStage("PAYMENT_PENDING"), "OFFERED");
  assert.equal(toLifecycleLeadStage("SPAM"), "LOST");
  assert.equal(toLifecycleOrderStatus("PENDING"), "PAYMENT_PENDING");
  assert.equal(toLifecycleOrderStatus("PAID"), "PAID");
  assert.equal(toLifecycleOrderStatus("REFUNDED"), "REFUNDED");
  assert.equal(toLifecycleOrderStatus("CANCELLED"), "CANCELLED");
  assert.equal(toLifecycleProvisioningStatus("SUCCEEDED"), "COMPLETED");
  assert.equal(toLifecycleProvisioningStatus("RETRY_PENDING"), "FAILED");
  assert.equal(toLifecycleProvisioningStatus("MANUAL_REVIEW"), "NEEDS_REVIEW");
});

test("öğrenci onboarding türetilmiş durumları readiness sinyallerinden gelir", () => {
  assert.equal(
    deriveLifecycleStudentStatus({
      hasAccount: true,
      inviteSentAt: null,
      inviteAcceptedAt: null,
      packageActive: false,
      hasGroup: false,
    }),
    "ACCOUNT_CREATED",
  );
  assert.equal(
    deriveLifecycleStudentStatus({
      hasAccount: true,
      inviteSentAt: new Date(),
      inviteAcceptedAt: null,
      packageActive: false,
      hasGroup: false,
    }),
    "INVITED",
  );
  assert.equal(
    deriveLifecycleStudentStatus({
      hasAccount: true,
      inviteSentAt: new Date(),
      inviteAcceptedAt: new Date(),
      packageActive: true,
      hasGroup: false,
    }),
    "GROUP_PENDING",
  );
  assert.equal(
    deriveLifecycleStudentStatus({
      hasAccount: true,
      inviteSentAt: new Date(),
      inviteAcceptedAt: new Date(),
      packageActive: true,
      hasGroup: true,
    }),
    "READY",
  );
});

test("normal sale timeline: IG → lead → görüşme → teklif → won → order → payment → provision → hesap", () => {
  const t0 = new Date("2026-08-01T10:00:00.000Z");
  const events = buildLeadLifecycleTimeline({
    leadId: "lead-1",
    createdAt: new Date("2026-08-01T10:01:00.000Z"),
    source: "INSTAGRAM_ORGANIC",
    conversationId: "conv-1",
    firstMessageAt: t0,
    activities: [
      {
        id: "a1",
        type: "STAGE_CHANGED",
        fromValue: "NEW",
        toValue: "CONTACTED",
        actorUserId: "admin-1",
        metadata: null,
        createdAt: new Date("2026-08-01T11:00:00.000Z"),
      },
      {
        id: "a2",
        type: "STAGE_CHANGED",
        fromValue: "CONTACTED",
        toValue: "OFFER_SENT",
        actorUserId: "admin-1",
        metadata: null,
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
      },
      {
        id: "a3",
        type: "STAGE_CHANGED",
        fromValue: "OFFER_SENT",
        toValue: "WON",
        actorUserId: "admin-1",
        metadata: null,
        createdAt: new Date("2026-08-01T13:00:00.000Z"),
      },
      {
        id: "a4",
        type: "PAYMENT_COMPLETED",
        fromValue: "OFFER_SENT",
        toValue: "WON",
        actorUserId: null,
        metadata: { orderId: "od-1" },
        createdAt: new Date("2026-08-01T14:00:00.000Z"),
      },
    ],
    relatedOdOrderId: "od-1",
    relatedOdkOrderId: null,
    relatedOdUserId: "user-1",
    relatedOdkUserId: null,
    orderEvents: [
      {
        id: "od-1",
        product: "OD",
        status: "PAID",
        createdAt: new Date("2026-08-01T13:30:00.000Z"),
        paidAt: new Date("2026-08-01T14:00:00.000Z"),
        provisioningStatus: "SUCCEEDED",
        provisionedAt: new Date("2026-08-01T14:00:05.000Z"),
        provisioningError: null,
        userId: "user-1",
      },
    ],
  });

  const kinds = events.map((e) => e.kind);
  assert.ok(kinds.includes("INSTAGRAM_MESSAGE"));
  assert.ok(kinds.includes("LEAD_CREATED"));
  assert.ok(kinds.includes("CONTACTED"));
  assert.ok(kinds.includes("OFFERED"));
  assert.ok(kinds.includes("WON"));
  assert.ok(kinds.includes("ORDER"));
  assert.ok(kinds.includes("PAYMENT"));
  assert.ok(kinds.includes("PROVISIONING"));
  assert.ok(kinds.includes("STUDENT_ACCOUNT"));
  assert.equal(events[0].kind, "INSTAGRAM_MESSAGE");
});

test("existing user eşleşmesi yüksek güvende LINK, rol çatışmasında BLOCK", () => {
  const link = evaluateLeadUserMatch(
    { email: "a@b.com", phone: "+905551234567" },
    [
      {
        userId: "u1",
        role: "STUDENT",
        status: "ACTIVE",
        email: "a@b.com",
        phone: "+905551234567",
        fullName: "Ali",
      },
    ],
  );
  assert.equal(link.decision, "LINK");

  const blocked = evaluateLeadUserMatch(
    { email: "teacher@b.com" },
    [
      {
        userId: "u2",
        role: "TEACHER",
        status: "ACTIVE",
        email: "teacher@b.com",
        phone: null,
        fullName: "Ayşe",
      },
    ],
  );
  assert.equal(blocked.decision, "BLOCK");
});

test("funnel metrikleri: conversion + provision süresi + failed oranı", () => {
  const metrics = calculateLifecycleFunnelMetrics({
    leadsTotal: 100,
    qualified: 40,
    won: 20,
    paidOrders: 18,
    provisionedOrders: 15,
    failedProvisioningOrders: 2,
    provisionDurationsMs: [1000, 2000, 3000, 4000, 10_000],
  });
  const byKey = Object.fromEntries(metrics.map((m) => [m.key, m]));
  assert.equal(byKey.lead_to_qualified.value, 40);
  assert.equal(byKey.qualified_to_won.value, 50);
  assert.equal(byKey.won_to_paid.value, 90);
  assert.equal(byKey.paid_to_provisioned.value, Math.round((15 / 18) * 10_000) / 100);
  assert.equal(byKey.failed_provisioning_rate.value, Math.round((2 / 18) * 10_000) / 100);
  assert.equal(byKey.provision_duration_p50_ms.value, 3000);
  assert.equal(byKey.provision_duration_p50_ms.unit, "ms");
});

test("cancelled / refunded order status map'i", () => {
  assert.equal(toLifecycleOrderStatus("CANCELLED"), "CANCELLED");
  assert.equal(toLifecycleOrderStatus("REFUNDED"), "REFUNDED");
});

test("failed provisioning hata rehberi açıklayıcıdır", () => {
  assert.match(provisioningErrorGuidance("STUDENT_EMAIL_CONFLICT"), /e-posta/i);
  assert.match(provisioningErrorGuidance("ORDER_NOT_PAID"), /ödenmemiş|iptal|iade/i);
  assert.match(provisioningErrorGuidance("PACKAGE_PROBLEM"), /paket/i);
});

test("manual link senaryosu timeline'a ACCOUNT_LINKED olarak düşer", () => {
  const events = buildLeadLifecycleTimeline({
    leadId: "lead-2",
    createdAt: new Date("2026-08-02T10:00:00.000Z"),
    source: "MANUAL",
    conversationId: null,
    firstMessageAt: null,
    activities: [
      {
        id: "m1",
        type: "ACCOUNT_LINKED",
        fromValue: "WON",
        toValue: "WON",
        actorUserId: "admin-2",
        metadata: { userId: "u-9", force: true },
        createdAt: new Date("2026-08-02T11:00:00.000Z"),
      },
    ],
    relatedOdOrderId: null,
    relatedOdkOrderId: null,
    relatedOdUserId: "u-9",
    relatedOdkUserId: null,
  });
  assert.ok(events.some((e) => e.kind === "STUDENT_ACCOUNT" && e.label.includes("hesabı")));
});

test("duplicate payment activity timeline'da tekilleşir", () => {
  const paidAt = new Date("2026-08-03T14:00:00.000Z");
  const events = buildLeadLifecycleTimeline({
    leadId: "lead-3",
    createdAt: new Date("2026-08-03T10:00:00.000Z"),
    source: "OD_WEB_FORM",
    conversationId: null,
    firstMessageAt: null,
    activities: [
      {
        id: "p1",
        type: "PAYMENT_COMPLETED",
        fromValue: "QUALIFIED",
        toValue: "WON",
        actorUserId: null,
        metadata: { orderId: "od-2" },
        createdAt: paidAt,
      },
    ],
    relatedOdOrderId: "od-2",
    relatedOdkOrderId: null,
    relatedOdUserId: null,
    relatedOdkUserId: null,
    orderEvents: [
      {
        id: "od-2",
        product: "OD",
        status: "PAID",
        createdAt: new Date("2026-08-03T13:00:00.000Z"),
        paidAt,
        provisioningStatus: "RETRY_PENDING",
        provisionedAt: null,
        provisioningError: "STUDENT_EMAIL_CONFLICT",
        userId: null,
      },
    ],
  });
  const payments = events.filter((e) => e.kind === "PAYMENT");
  assert.equal(payments.length, 1);
  assert.ok(events.some((e) => e.kind === "PROVISIONING" && e.detail?.includes("RETRY_PENDING")));
});
