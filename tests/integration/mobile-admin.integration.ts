import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after } from "node:test";

import { prisma as db } from "@/lib/prisma";
import { getInterventionInbox, listInterventionStudentOptions } from "@/lib/intervention-inbox-server";
import { toMobileInterventionInbox } from "@/lib/mobile/admin-views";
import { parseInterventionInbox } from "@/lib/mobile-contracts/admin";
import { integration } from "./integration-utils";

/**
 * Faz 2 — mobil yönetim projeksiyonları GERÇEK veriyle sözleşmeye uyar.
 * Route katmanı (Bearer, 403/401, no-store) `tests/e2e/mobile-api.spec.ts`.
 */

const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";
const createdUserIds: string[] = [];

const createdOrderIds: string[] = [];

after(async () => {
  const ids = createdUserIds;
  await db.odOnboardingTransition.deleteMany({ where: { onboarding: { orderId: { in: createdOrderIds } } } });
  await db.odOnboarding.deleteMany({ where: { orderId: { in: createdOrderIds } } });
  await db.odOrder.deleteMany({ where: { id: { in: createdOrderIds } } });
  await db.mfaResetRequest.deleteMany({ where: { OR: [{ targetUserId: { in: ids } }, { requestedById: { in: ids } }] } });
  await db.parentStudent.deleteMany({ where: { OR: [{ parentId: { in: ids } }, { student: { userId: { in: ids } } }] } });
  await db.productMembership.deleteMany({ where: { userId: { in: ids } } });
  await db.teacherProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.interventionCaseActivity.deleteMany({ where: { case: { student: { userId: { in: ids } } } } });
  await db.interventionCase.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.studentProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

async function user(role: "ADMIN" | "STUDENT" | "PARENT" | "TEACHER", label: string) {
  const row = await db.user.create({
    data: { email: `p2-${label}-${randomUUID().slice(0, 8)}@example.com`, passwordHash: PASSWORD_HASH, inviteAcceptedAt: new Date(), role, status: "ACTIVE", fullName: `P2 ${label}` },
  });
  createdUserIds.push(row.id);
  return row;
}

integration("Faz 2.1 müdahale kutusu: gerçek kayıt + etkinlik sözleşmeye uyar; öğrenci seçenekleri aynı listeden", async () => {
  const admin = await user("ADMIN", "admin");
  const studentUser = await user("STUDENT", "ogrenci");
  const profile = await db.studentProfile.create({ data: { userId: studentUser.id } });
  const now = new Date();
  await db.interventionCase.create({
    data: {
      studentId: profile.id,
      ruleVersion: "p2-test",
      reasonCode: "OVERDUE_WORK",
      fingerprint: randomUUID(),
      explanation: "Üç çalışma gecikti",
      suggestedAction: "Kısa görüşme",
      evidenceCount: 3,
      windowStart: now,
      windowEnd: now,
      dueAt: new Date(now.getTime() + 86_400_000),
      status: "OPEN",
      activities: { create: [{ type: "GENERATED", note: "Kural" }] },
    },
  });

  const [rows, students] = await Promise.all([getInterventionInbox({ role: "ADMIN", userId: admin.id }), listInterventionStudentOptions()]);
  const parsed = parseInterventionInbox(JSON.parse(JSON.stringify(toMobileInterventionInbox(rows, students))));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  const mine = parsed.value.rows.find((row) => row.studentName === "P2 ogrenci");
  assert.ok(mine, "yeni kayıt kutuda");
  assert.equal(mine.status, "OPEN");
  assert.equal(mine.canAct, true, "yönetici her kayıtta işlem yapabilir");
  assert.equal(mine.activities[0].actorName, "Sistem");
  assert.ok(parsed.value.students.some((student) => student.id === profile.id));
});

integration("Faz 2.1 raporlar: gerçek veritabanıyla yükleyici sözleşmeye uyar", async () => {
  const { loadAdminReports } = await import("@/lib/panel/admin-reports-server");
  const { parseAdminReports, MOBILE_ADMIN_CONTRACT_VERSION } = await import("@/lib/mobile-contracts/admin");
  const parsed = parseAdminReports(JSON.parse(JSON.stringify({ contractVersion: MOBILE_ADMIN_CONTRACT_VERSION, ...(await loadAdminReports()) })));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  assert.equal(parsed.value.rangeDays, 30);
});

integration("Faz 2.1 aktivasyon masası: ödenmiş sipariş + onboarding sözleşmeye uyar; izinli geçişler sunucudan", async () => {
  const { loadActivationDesk } = await import("@/lib/panel/activation-desk-server");
  const { toMobileActivationDesk } = await import("@/lib/mobile/admin-desk-views");
  const { parseActivationDesk } = await import("@/lib/mobile-contracts/admin");
  const { allowedOdOnboardingTransitions } = await import("@/lib/od/onboarding-state");
  const owner = await user("ADMIN", "desk-owner");
  const order = await db.odOrder.create({
    data: {
      packageName: "P2 Masa",
      category: "LGS",
      subject: "Matematik Ders Paketi",
      subtotalCents: 150000,
      totalCents: 150000,
      status: "PAID",
      buyerInfo: { placementPreferences: { timeRanges: ["WEEKDAY_EVENING"], earliestStartDate: null, noSlotPreference: "CONTACT" } },
      onboarding: { create: { state: "PAID", ownerId: owner.id } },
    },
  });
  createdOrderIds.push(order.id);
  const parsed = parseActivationDesk(JSON.parse(JSON.stringify(toMobileActivationDesk(await loadActivationDesk()))));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  const row = parsed.value.onboardings.find((item) => item.orderId === order.id);
  assert.ok(row, "yeni onboarding masada");
  assert.equal(row.linkedToAccount, false);
  assert.equal(row.totalLabel, "1.500 ₺");
  assert.equal(row.ownerName, "P2 desk-owner");
  assert.deepEqual(row.allowedTransitions.map((entry) => entry.value), allowedOdOnboardingTransitions("PAID", null));
  assert.match(row.preferences ?? "", /Müsaitlik: Hafta içi 17.00–21.00/);
  assert.deepEqual(row.checklist.map((entry) => entry.done), [false, false, false, false]);
  assert.ok(parsed.value.staff.some((person) => person.id === owner.id));
});

integration("Faz 2.2 kişiler: dizin görünümleri + bekleyen MFA sıfırlama + kişi detayı gerçek veriyle sözleşmeye uyar", async () => {
  const { loadPeopleDirectory } = await import("@/lib/panel/people-directory-server");
  const { listPendingMfaResets } = await import("@/lib/panel/mfa-reset-queue-server");
  const { loadPersonDetail } = await import("@/lib/panel/person-detail-server");
  const { toMobilePeopleDirectory, toMobilePersonDetail } = await import("@/lib/mobile/admin-people-views");
  const { parsePeopleDirectory, parsePersonDetail } = await import("@/lib/mobile-contracts/admin");
  const viewer = await user("ADMIN", "people-viewer");
  const otherAdmin = await user("ADMIN", "people-other");
  const requester = await user("ADMIN", "people-requester");
  const studentUser = await user("STUDENT", "people-student");
  const parent = await user("PARENT", "people-parent");
  const teacher = await user("TEACHER", "people-teacher");
  await db.teacherProfile.create({ data: { userId: teacher.id, subjects: ["Matematik"] } });
  const profile = await db.studentProfile.create({ data: { userId: studentUser.id, classLevel: "8" } });
  await db.parentStudent.create({ data: { parentId: parent.id, studentId: profile.id, relationship: "Anne" } });
  await db.productMembership.create({ data: { userId: studentUser.id, product: "OD", startsAt: new Date(0) } });
  await db.mfaResetRequest.create({ data: { targetUserId: otherAdmin.id, requestedById: requester.id, reason: "Telefon kayboldu, yeniden kurulum", expiresAt: new Date(Date.now() + 3_600_000) } });

  const pending = await listPendingMfaResets();
  for (const view of ["tumu", "ogrenciler", "veliler", "ogretmenler", "koclar", "personel"]) {
    const directory = await loadPeopleDirectory({ sekme: view, q: "P2 people" });
    const parsed = parsePeopleDirectory(JSON.parse(JSON.stringify(toMobilePeopleDirectory(directory, pending, viewer.id))));
    assert.ok(parsed.ok, `${view}: ${parsed.ok ? "" : parsed.error}`);
  }
  const students = parsePeopleDirectory(JSON.parse(JSON.stringify(toMobilePeopleDirectory(await loadPeopleDirectory({ sekme: "ogrenciler", q: "P2 people-student" }), pending, viewer.id))));
  assert.ok(students.ok);
  const row = students.value.people.find((person) => person.id === studentUser.id);
  assert.ok(row);
  assert.match(row.detail, /Veli: P2 people-parent/);
  const reset = students.value.pendingMfaResets.find((entry) => entry.targetId === otherAdmin.id);
  assert.equal(reset?.canApprove, true, "isteyen ve hedef dışındaki yönetici onaylayabilir");
  const asRequester = toMobilePeopleDirectory(await loadPeopleDirectory({}), pending, requester.id).pendingMfaResets.find((entry) => entry.targetId === otherAdmin.id);
  assert.equal(asRequester?.canApprove, false, "isteği açan onaylayamaz");

  for (const target of [studentUser, parent, teacher, otherAdmin]) {
    const detail = await loadPersonDetail(target.id, { security: true, history: true });
    assert.ok(detail);
    const parsed = parsePersonDetail(JSON.parse(JSON.stringify(toMobilePersonDetail(detail, viewer.id))));
    assert.ok(parsed.ok, `${target.role}: ${parsed.ok ? "" : parsed.error}`);
    if (target.id === studentUser.id) {
      assert.deepEqual(parsed.value.productAccess, { editable: true, active: ["OD"], options: parsed.value.productAccess.options });
      assert.deepEqual(parsed.value.relations.parents.map((link) => link.relationship), ["Anne"]);
    }
    if (target.id === teacher.id) assert.ok(parsed.value.staff, "öğretmende sorumluluk bölümü");
    if (target.id === otherAdmin.id) {
      assert.equal(parsed.value.security.canRequestReset, true);
      assert.equal(parsed.value.security.pendingResets.length, 1);
      assert.equal(parsed.value.productAccess.editable, false);
    }
  }
  assert.equal(await loadPersonDetail("yok-boyle-biri", { security: true, history: true }), null);
});
