import assert from "node:assert/strict";
import test from "node:test";
import { createAccountClaimToken, materializeAccountClaimEmailHtml } from "../../lib/od/account-claim";
import {
  completeAccountClaim,
  issueAccountClaim,
  resolveAccountClaim,
  runAccountClaimMaintenance,
} from "../../lib/od/account-claim-server";
import { getStudentFirstValue, getParentFirstValue } from "../../lib/od/first-value-server";
import { getOdLifecycleQueue } from "../../lib/od/lifecycle-queue-server";
import { verifyPassword } from "../../lib/auth/password";
import { integration, prisma } from "./support/harness";
import {
  cleanupFixtures,
  createGroup,
  createLesson,
  createPaidOdOrder,
  createStudent,
  createTeacher,
  createUser,
  enroll,
  linkParent,
} from "./support/fixtures";

/**
 * OD-013 · ÖDEME SONRASI HESAP YAŞAM DÖNGÜSÜ.
 *
 * Bu akışın tamamı veritabanı durumudur: davet tek kullanımlık mı, parola
 * gerçekten değişti mi, veli bağı onaylandı mı, onboarding kendi kendine
 * ilerledi mi. Hiçbiri saf bir fonksiyonla ölçülemez — hepsi transaction ve
 * kısıt davranışı.
 */

const STRONG_PASSWORD = "mor bisiklet 42 kule";

/** Davetin ham token'ını testte bilmek için üretimi biz yapıyoruz. */
async function issueClaimFor(input: { userId: string; audience: "STUDENT" | "PARENT"; odOrderId?: string }) {
  const generated = await createAccountClaimToken();
  const result = await prisma.$transaction((tx) => issueAccountClaim(tx, { ...input, generated }));
  return { result, token: generated.token, claimId: generated.id };
}

integration("davet üretilir, outbox'a gizli değer yazılmaz, eski davet geçersizleşir", async () => {
  const { user } = await createStudent({ mustChangePassword: true });
  const order = await createPaidOdOrder({ studentUserId: user.id });

  const first = await issueClaimFor({ userId: user.id, audience: "STUDENT", odOrderId: order.id });
  assert.equal(first.result.issued, true);

  const outbox = await prisma.emailOutbox.findFirst({ where: { recipients: { contains: user.email } }, orderBy: { createdAt: "desc" } });
  assert.ok(outbox, "davet e-postası kuyruğa yazılmadı");
  assert.equal(outbox.html.includes(first.token), false, "kullanılabilir token veritabanına yazıldı");
  assert.match(outbox.html, /\{\{ACCOUNT_CLAIM_URL:[A-Za-z0-9_-]{24}\}\}/);
  assert.ok(materializeAccountClaimEmailHtml(outbox.html).includes(encodeURIComponent(first.token)));

  // İkinci davet birincisini geçersizleştirir: her an tek geçerli bağlantı.
  const second = await issueClaimFor({ userId: user.id, audience: "STUDENT", odOrderId: order.id });
  assert.equal(second.result.issued, true);
  assert.equal((await resolveAccountClaim(first.token)).ok, false);
  assert.equal((await resolveAccountClaim(second.token)).ok, true);
  assert.equal((await prisma.accountClaim.findUniqueOrThrow({ where: { id: first.claimId } })).status, "SUPERSEDED");
});

integration("parolasını belirlemiş hesaba davet gönderilmez", async () => {
  const { user } = await createStudent({ mustChangePassword: true });
  await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });

  const { result } = await issueClaimFor({ userId: user.id, audience: "STUDENT" });
  assert.deepEqual(result, { issued: false, reason: "ALREADY_CLAIMED" });
  assert.equal(await prisma.accountClaim.count({ where: { userId: user.id } }), 0);
});

integration("kurcalanmış, yabancı ve süresi dolmuş davetler reddedilir", async () => {
  const { user } = await createStudent({ mustChangePassword: true });
  const { token, claimId } = await issueClaimFor({ userId: user.id, audience: "STUDENT" });

  const [id, proof] = token.split(".");
  assert.deepEqual(await resolveAccountClaim(`${id}.${proof.slice(0, -1)}x`), { ok: false, reason: "TOKEN_INVALID" });

  // Başka bir davetin kimliğiyle bu davetin kanıtını birleştirmek: kimlik
  // gerçek, kanıt gerçek, ama eşleşme yok.
  const other = await issueClaimFor({ userId: (await createStudent({ mustChangePassword: true })).user.id, audience: "STUDENT" });
  const [otherId] = other.token.split(".");
  assert.equal((await resolveAccountClaim(`${otherId}.${proof}`)).ok, false);

  await prisma.accountClaim.update({ where: { id: claimId }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.deepEqual(await resolveAccountClaim(token), { ok: false, reason: "EXPIRED" });
});

integration("öğrenci hesabı devralınır: parola, tercihler ve onboarding tek işlemde ilerler", async () => {
  const { user, profile } = await createStudent({ mustChangePassword: true });
  const parent = await createUser("PARENT", { mustChangePassword: true });
  await linkParent(parent.id, profile.id);
  await prisma.parentStudent.updateMany({ where: { parentId: parent.id, studentId: profile.id }, data: { confirmedAt: new Date(), confirmedById: parent.id } });
  const order = await createPaidOdOrder({ studentUserId: user.id, state: "ACCOUNT_READY" });
  const stale = await prisma.session.create({ data: { userId: user.id, tokenHash: `stale-${crypto.randomUUID()}`, expiresAt: new Date(Date.now() + 86_400_000) } });

  const { token } = await issueClaimFor({ userId: user.id, audience: "STUDENT", odOrderId: order.id });
  const result = await completeAccountClaim({
    token,
    password: STRONG_PASSWORD,
    preferences: { emailEnabled: true, availableDays: [1, 3, 5], minutesPerDay: 60 },
  });
  assert.deepEqual(result, { ok: true, userId: user.id, audience: "STUDENT", relationship: null });

  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(after.mustChangePassword, false);
  assert.equal(await verifyPassword(STRONG_PASSWORD, after.passwordHash), true);
  // Provisioning'in rastgele parolasıyla açılmış oturumlar sahibine ait değil.
  assert.ok((await prisma.session.findUniqueOrThrow({ where: { id: stale.id } })).revokedAt);

  const preference = await prisma.studentPlanPreference.findUniqueOrThrow({ where: { studentId: profile.id } });
  assert.deepEqual(preference.availableDays, [1, 3, 5]);
  assert.equal(preference.minutesPerDay, 60);
  assert.equal((await prisma.notificationPreference.findUniqueOrThrow({ where: { userId: user.id } })).emailEnabled, true);

  // Veli bağı onaylı olduğu için otomasyon tavana kadar ilerler.
  assert.equal((await prisma.odOnboarding.findUniqueOrThrow({ where: { orderId: order.id } })).state, "PLACEMENT_PENDING");
  const systemTransitions = await prisma.odOnboardingTransition.findMany({ where: { onboarding: { orderId: order.id }, actorType: "SYSTEM" }, orderBy: { toState: "asc" } });
  assert.deepEqual(systemTransitions.map((row) => row.toState).sort(), ["PARENT_LINKED", "PLACEMENT_PENDING"]);
});

integration("davet tek kullanımlıktır; ikinci gönderim çakışma döner", async () => {
  const { user } = await createStudent({ mustChangePassword: true });
  const order = await createPaidOdOrder({ studentUserId: user.id });
  const { token } = await issueClaimFor({ userId: user.id, audience: "STUDENT", odOrderId: order.id });

  const first = await completeAccountClaim({ token, password: STRONG_PASSWORD, preferences: { emailEnabled: false, availableDays: [2], minutesPerDay: 30 } });
  assert.equal(first.ok, true);

  const second = await completeAccountClaim({ token, password: "baska bir parola 77", preferences: { emailEnabled: true } });
  assert.deepEqual(second, { ok: false, reason: "ALREADY_CLAIMED" });
  assert.equal(await verifyPassword(STRONG_PASSWORD, (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash), true);
});

integration("zayıf parola hesabı devralmaz ve daveti tüketmez", async () => {
  const { user } = await createStudent({ mustChangePassword: true });
  const { token, claimId } = await issueClaimFor({ userId: user.id, audience: "STUDENT" });

  const result = await completeAccountClaim({ token, password: "kısa", preferences: { emailEnabled: true } });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "WEAK_PASSWORD");
  assert.equal((await prisma.accountClaim.findUniqueOrThrow({ where: { id: claimId } })).status, "PENDING");
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).mustChangePassword, true);
});

integration("veli bağlantıyı onaylar: erişim aynı kalır, teyit kaydedilir", async () => {
  const { user: studentUser, profile } = await createStudent({ fullName: "Deniz Kaya" });
  const parent = await createUser("PARENT", { mustChangePassword: true });
  await linkParent(parent.id, profile.id);
  const order = await createPaidOdOrder({ studentUserId: studentUser.id, state: "ACCOUNT_READY" });

  const { token } = await issueClaimFor({ userId: parent.id, audience: "PARENT", odOrderId: order.id });
  const resolved = await resolveAccountClaim(token);
  assert.equal(resolved.ok && resolved.claim.pendingRelationship?.studentName, "Deniz Kaya");

  const result = await completeAccountClaim({ token, password: STRONG_PASSWORD, relationshipDecision: "CONFIRM", preferences: { emailEnabled: true } });
  assert.deepEqual(result, { ok: true, userId: parent.id, audience: "PARENT", relationship: "CONFIRMED" });

  const link = await prisma.parentStudent.findUniqueOrThrow({ where: { parentId_studentId: { parentId: parent.id, studentId: profile.id } } });
  assert.ok(link.confirmedAt);
  assert.equal(link.confirmedById, parent.id);
});

integration("veli reddederse bağ silinir ve sipariş istisnaya düşer", async () => {
  const { user: studentUser, profile } = await createStudent({ mustChangePassword: true });
  const parent = await createUser("PARENT", { mustChangePassword: true });
  await linkParent(parent.id, profile.id);
  const order = await createPaidOdOrder({ studentUserId: studentUser.id, state: "ACCOUNT_READY" });

  const { token } = await issueClaimFor({ userId: parent.id, audience: "PARENT", odOrderId: order.id });
  const result = await completeAccountClaim({ token, password: STRONG_PASSWORD, relationshipDecision: "REJECT", preferences: { emailEnabled: false } });
  assert.equal(result.ok && result.relationship, "REJECTED");

  assert.equal(await prisma.parentStudent.count({ where: { parentId: parent.id, studentId: profile.id } }), 0, "reddedilen bağ silinmedi");
  const onboarding = await prisma.odOnboarding.findUniqueOrThrow({ where: { orderId: order.id } });
  assert.equal(onboarding.state, "MANUAL_REVIEW");
  assert.match(onboarding.blockerReason ?? "", /reddetti/);

  const queue = await getOdLifecycleQueue();
  const row = queue.exceptions.find((item) => item.orderId === order.id);
  assert.ok(row, "reddedilen bağ istisna kuyruğunda görünmedi");
  assert.ok(row.codes.includes("RELATIONSHIP_REJECTED"));
});

integration("veli kararı vermeden hesap kurulamaz", async () => {
  const { user: studentUser, profile } = await createStudent({ mustChangePassword: true });
  const parent = await createUser("PARENT", { mustChangePassword: true });
  await linkParent(parent.id, profile.id);
  const order = await createPaidOdOrder({ studentUserId: studentUser.id });

  const { token } = await issueClaimFor({ userId: parent.id, audience: "PARENT", odOrderId: order.id });
  const result = await completeAccountClaim({ token, password: STRONG_PASSWORD, preferences: { emailEnabled: true } });
  assert.deepEqual(result, { ok: false, reason: "RELATIONSHIP_DECISION_REQUIRED" });
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: parent.id } })).mustChangePassword, true);
});

integration("bakım işi süresi dolanı kapatır, zamanı geleni hatırlatır", async () => {
  const { user: expiring } = await createStudent({ mustChangePassword: true });
  const { user: nudged } = await createStudent({ mustChangePassword: true });
  const { user: fresh } = await createStudent({ mustChangePassword: true });

  const expired = await issueClaimFor({ userId: expiring.id, audience: "STUDENT" });
  const reminded = await issueClaimFor({ userId: nudged.id, audience: "STUDENT" });
  await issueClaimFor({ userId: fresh.id, audience: "STUDENT" });

  await prisma.accountClaim.update({ where: { id: expired.claimId }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await prisma.accountClaim.update({ where: { id: reminded.claimId }, data: { createdAt: new Date(Date.now() - 4 * 86_400_000) } });

  const before = await prisma.emailOutbox.count();
  const result = await runAccountClaimMaintenance();
  assert.ok(result.expired >= 1);
  assert.ok(result.reminded >= 1);

  assert.equal((await prisma.accountClaim.findUniqueOrThrow({ where: { id: expired.claimId } })).status, "EXPIRED");
  const nudgedRow = await prisma.accountClaim.findUniqueOrThrow({ where: { id: reminded.claimId } });
  assert.equal(nudgedRow.reminderCount, 1);
  assert.ok(nudgedRow.lastRemindedAt);
  assert.ok(await prisma.emailOutbox.count() > before, "hatırlatma e-postası kuyruğa yazılmadı");

  // Aynı işi tekrar koşmak ikinci hatırlatmayı hemen göndermez.
  const again = await runAccountClaimMaintenance();
  assert.equal(again.reminded, 0);
});

integration("operasyon kuyruğu istisna, insan kararı ve otomatik akışı ayırır", async () => {
  const { user: automatedStudent } = await createStudent({ mustChangePassword: true });
  const automated = await createPaidOdOrder({ studentUserId: automatedStudent.id, state: "ACCOUNT_READY" });
  await issueClaimFor({ userId: automatedStudent.id, audience: "STUDENT", odOrderId: automated.id });

  const { user: placementStudent, profile: placementProfile } = await createStudent({ mustChangePassword: true });
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  await enroll(group.id, placementProfile.id);
  await createLesson(group.id, teacher.id, { status: "PLANNED" });
  const parent = await createUser("PARENT", { mustChangePassword: true });
  await linkParent(parent.id, placementProfile.id);
  await prisma.parentStudent.updateMany({ where: { parentId: parent.id, studentId: placementProfile.id }, data: { confirmedAt: new Date(), confirmedById: parent.id } });
  const placement = await createPaidOdOrder({ studentUserId: placementStudent.id, state: "PLACEMENT_PENDING" });

  const { user: brokenStudent } = await createStudent({ mustChangePassword: true });
  const broken = await createPaidOdOrder({ studentUserId: brokenStudent.id, state: "ACCOUNT_READY", provisioningStatus: "RETRY_PENDING" });

  const queue = await getOdLifecycleQueue();
  const ids = {
    exceptions: queue.exceptions.map((row) => row.orderId),
    decisions: queue.humanDecisions.map((row) => row.orderId),
  };
  assert.ok(ids.exceptions.includes(broken.id));
  assert.ok(ids.decisions.includes(placement.id));
  assert.equal(ids.exceptions.includes(automated.id), false, "otomatik ilerleyen sipariş istisna sayıldı");
  assert.equal(ids.decisions.includes(automated.id), false);
  assert.ok(queue.automatedCount >= 1);

  const brokenRow = queue.exceptions.find((row) => row.orderId === broken.id)!;
  assert.ok(brokenRow.codes.includes("PROVISIONING_FAILED"));
});

integration("ilk değer listesi gerçek kayıtları izler ve tamamlanınca kapanır", async () => {
  const { user: studentUser, profile } = await createStudent({ mustChangePassword: true });
  const parent = await createUser("PARENT", { mustChangePassword: true });
  await linkParent(parent.id, profile.id);

  const initial = await getStudentFirstValue(studentUser.id);
  assert.deepEqual(
    initial.map((step) => [step.key, step.done]),
    [["ACCOUNT_CLAIMED", false], ["RELATIONSHIP_CONFIRMED", false], ["BASELINE_PREFERENCES", false], ["GROUP_ASSIGNED", false], ["FIRST_LESSON_SCHEDULED", false]],
  );

  const order = await createPaidOdOrder({ studentUserId: studentUser.id });
  const { token } = await issueClaimFor({ userId: studentUser.id, audience: "STUDENT", odOrderId: order.id });
  await completeAccountClaim({ token, password: STRONG_PASSWORD, preferences: { emailEnabled: true, availableDays: [1, 2], minutesPerDay: 45 } });

  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  await enroll(group.id, profile.id);
  await createLesson(group.id, teacher.id, { status: "PLANNED" });
  await prisma.parentStudent.updateMany({ where: { parentId: parent.id, studentId: profile.id }, data: { confirmedAt: new Date(), confirmedById: parent.id } });

  const done = await getStudentFirstValue(studentUser.id);
  assert.deepEqual(done.filter((step) => !step.done), [], "gerçek kayıtlar tamamken liste hâlâ eksik gösteriyor");

  // Veli listesi seçili çocuğa göre hesaplanır.
  const parentSteps = await getParentFirstValue(parent.id, profile.id);
  assert.equal(parentSteps.find((step) => step.key === "RELATIONSHIP_CONFIRMED")?.done, true);
  assert.equal(parentSteps.find((step) => step.key === "ACCOUNT_CLAIMED")?.done, false);
});

test.after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});
