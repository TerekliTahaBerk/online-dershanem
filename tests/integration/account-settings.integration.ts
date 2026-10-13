import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { settingsCommandSchema } from "@/lib/account/settings-commands";
import { loadAccountSettings, runSettingsCommand, type SettingsActor } from "@/lib/account/settings-service";
import { parseAccountSettings } from "@/lib/mobile-contracts/account-settings";
import { CommandError } from "@/lib/panel/command-receipt";
import { requestParentPackageMeeting } from "@/lib/panel/parent-package-meeting";
import { integration } from "./integration-utils";

/**
 * P5.2 — Hesap ayarları ortak servisi gerçek Postgres ile: mobil projeksiyon
 * sözleşmeye uyar; rol bölüm kapsamı; işlem anahtarı tekrarı / farklı gövde;
 * eski revizyon; bekleyen çocuk ekle-iptal ve başka velinin kaydı; veli paket
 * görüşmesi yalnız bağlı çocuk için ve tekrarda tek talep.
 */
const command = (input: unknown) => settingsCommandSchema.parse(input);
const rejects = (code: string) => (error: unknown) => error instanceof CommandError && error.code === code;

integration("P5.2 Hesap ayarları: projeksiyon, rol kapsamı, makbuz, revizyon ve çocuk kayıtları", async () => {
  const run = randomUUID().slice(0, 8);
  const parentUser = await db.user.create({ data: { email: `p52-parent-${run}@example.com`, role: "PARENT", status: "ACTIVE", passwordHash: "unused", fullName: "P52 Veli" } });
  const otherParent = await db.user.create({ data: { email: `p52-other-${run}@example.com`, role: "PARENT", status: "ACTIVE", passwordHash: "unused", fullName: "P52 Diğer" } });
  const studentUser = await db.user.create({ data: { email: `p52-student-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused", fullName: "P52 Öğrenci" } });
  const teacher = await db.user.create({ data: { email: `p52-teacher-${run}@example.com`, role: "TEACHER", status: "ACTIVE", passwordHash: "unused", fullName: "P52 Öğretmen" } });
  const studentProfile = await db.studentProfile.create({ data: { userId: studentUser.id, classLevel: "12" } });
  await db.productMembership.create({ data: { userId: studentUser.id, product: "OD", startsAt: new Date(0) } });
  await db.parentStudent.create({ data: { parentId: parentUser.id, studentId: studentProfile.id } });
  const parent: SettingsActor = { userId: parentUser.id, role: "PARENT", fullName: parentUser.fullName, email: parentUser.email };
  const student: SettingsActor = { userId: studentUser.id, role: "STUDENT", fullName: studentUser.fullName, email: studentUser.email };
  const staff: SettingsActor = { userId: teacher.id, role: "TEACHER", fullName: teacher.fullName, email: teacher.email };

  try {
    const view = await loadAccountSettings(parent);
    const parsed = parseAccountSettings(JSON.parse(JSON.stringify(view)));
    assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
    assert.equal(view.education, null);
    assert.deepEqual(view.children?.linked.map((child) => child.name), ["P52 Öğrenci"]);
    assert.ok(view.sections.some((section) => section.key === "cocuklarim"));
    const staffView = await loadAccountSettings(staff);
    assert.deepEqual(staffView.sections.map((section) => section.key), ["profil", "guvenlik"]);
    assert.equal(staffView.contact, null);

    // Rol kapsamı: öğrenci-yalnız ve veli-yalnız bölümler, personelin göremediği bölüm.
    await assert.rejects(runSettingsCommand(parent, command({ type: "education", classLevel: "12", examType: "TYT" })), rejects("SECTION_FORBIDDEN"));
    await assert.rejects(runSettingsCommand(student, command({ type: "cancelChild", childId: "x" })), rejects("SECTION_FORBIDDEN"));
    await assert.rejects(runSettingsCommand(staff, command({ type: "billing", billingAddress: "Adres" })), rejects("SECTION_FORBIDDEN"));

    // Revizyonlu yazma + aynı anahtarla tekrar → ilk sonuç; farklı gövde → 409.
    const key = randomUUID();
    const profile = command({ type: "profile", fullName: "P52 Veli Yeni", phone: "0532 111 22 33", city: "İzmir", district: "Bornova", relationship: "ANNE" });
    const first = await runSettingsCommand(parent, profile, { idempotencyKey: key, expectedRevision: view.revision });
    assert.equal(first.replayed, false);
    const replay = await runSettingsCommand(parent, profile, { idempotencyKey: key, expectedRevision: view.revision });
    assert.equal(replay.replayed, true);
    await assert.rejects(runSettingsCommand(parent, command({ ...profile, city: "Ankara" }), { idempotencyKey: key, expectedRevision: view.revision }), rejects("IDEMPOTENCY_REUSE"));
    const saved = await db.user.findUniqueOrThrow({ where: { id: parentUser.id }, include: { signupProfile: true } });
    assert.equal(saved.fullName, "P52 Veli Yeni");
    assert.equal(saved.phone, "+905321112233");
    assert.equal(saved.signupProfile?.relationship, "ANNE");
    assert.equal(await db.auditLog.count({ where: { actorUserId: parentUser.id, action: "account.settings.profile" } }), 1);

    // Eski revizyon: ilk yazmadan sonra aynı revizyonla yeni anahtar reddedilir.
    await assert.rejects(runSettingsCommand(parent, command({ type: "billing", billingAddress: "Yeni adres" }), { idempotencyKey: randomUUID(), expectedRevision: view.revision }), rejects("STALE_REVISION"));
    const fresh = await loadAccountSettings(parent);
    await runSettingsCommand(parent, command({ type: "consents", kvkkConsent: true, marketingConsent: true }), { idempotencyKey: randomUUID(), expectedRevision: fresh.revision });
    const consented = await db.user.findUniqueOrThrow({ where: { id: parentUser.id } });
    assert.ok(consented.kvkkAcceptedAt && consented.marketingConsentAt);
    // KVKK onayı tek yönlü: false göndermek onayı geri çekmez.
    await runSettingsCommand(parent, command({ type: "consents", kvkkConsent: false, marketingConsent: false }));
    const withdrawn = await db.user.findUniqueOrThrow({ where: { id: parentUser.id } });
    assert.ok(withdrawn.kvkkAcceptedAt);
    assert.equal(withdrawn.marketingConsentAt, null);

    // Bekleyen çocuk: ekle (tekrar tek kayıt), başka veli iptal edemez, sahibi iptal eder.
    const childKey = randomUUID();
    const child = command({ type: "addChild", fullName: "P52 Küçük", classLevel: "8", examType: "LGS" });
    const added = await runSettingsCommand(parent, child, { idempotencyKey: childKey });
    await runSettingsCommand(parent, child, { idempotencyKey: childKey });
    assert.equal(await db.pendingChild.count({ where: { parentUserId: parentUser.id, status: "PENDING" } }), 1);
    const childId = added.result.id!;
    await assert.rejects(
      runSettingsCommand({ userId: otherParent.id, role: "PARENT", fullName: otherParent.fullName, email: otherParent.email }, command({ type: "cancelChild", childId })),
      rejects("CHILD_NOT_CANCELLABLE"),
    );
    await runSettingsCommand(parent, command({ type: "cancelChild", childId }));
    assert.equal((await db.pendingChild.findUniqueOrThrow({ where: { id: childId } })).status, "CANCELLED");

    // Öğrenci eğitim bölümü: AYT dışı sınavda alan temizlenir.
    const studentView = await loadAccountSettings(student);
    await runSettingsCommand(student, command({ type: "education", classLevel: "12", examType: "LGS", fieldTrack: "SAY", weakSubjects: [] }), { idempotencyKey: randomUUID(), expectedRevision: studentView.revision });
    assert.equal((await db.studentProfile.findUniqueOrThrow({ where: { id: studentProfile.id } })).fieldTrack, null);

    // V10: yalnız bağlı çocuk; aynı anahtar tek talep.
    await assert.rejects(requestParentPackageMeeting({ userId: otherParent.id, email: otherParent.email }, studentProfile.id, randomUUID()), rejects("NOT_FOUND"));
    const meetingKey = randomUUID();
    await requestParentPackageMeeting(parent, studentProfile.id, meetingKey);
    const meetingReplay = await requestParentPackageMeeting(parent, studentProfile.id, meetingKey);
    assert.equal(meetingReplay.replayed, true);
    assert.equal(await db.leadSubmission.count({ where: { source: "panel-veli-paket-degisikligi", targetGoal: `Paket değişikliği görüşmesi · P52 Öğrenci` } }), 1);
  } finally {
    await db.leadSubmission.deleteMany({ where: { source: "panel-veli-paket-degisikligi", targetGoal: `Paket değişikliği görüşmesi · P52 Öğrenci` } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: [parentUser.id, otherParent.id, studentUser.id, teacher.id] } } });
    await db.pendingChild.deleteMany({ where: { parentUserId: parentUser.id } });
    await db.user.deleteMany({ where: { id: { in: [parentUser.id, otherParent.id, studentUser.id, teacher.id] } } });
  }
});
