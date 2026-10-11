import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { createManagedGroup, executeGroupMembers, loadGroupMutationState, previewGroupMembers, updateManagedGroup } from "@/lib/panel/group-management-service";
import { GroupMutationError, groupRevision, mutationReceiptKey } from "@/lib/panel/group-mutation-core";
import { integration } from "./integration-utils";

async function fixture() {
  const users: string[] = [];
  const groups: string[] = [];
  const emails: string[] = [];
  const makeUser = async (role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT") => {
    const email = `group-write-${randomUUID()}@example.com`;
    const user = await db.user.create({ data: { email, passwordHash: "unused-test-password", role, status: "ACTIVE", mustChangePassword: false, inviteAcceptedAt: new Date() } });
    users.push(user.id); emails.push(email); return user;
  };
  const actor = await makeUser("ADMIN");
  const teacher = await makeUser("TEACHER");
  const learner = await makeUser("STUDENT");
  const student = await db.studentProfile.create({ data: { userId: learner.id } });
  await db.notificationPreference.create({ data: { userId: learner.id, inAppEnabled: true, emailEnabled: true } });
  const group = await db.group.create({ data: { name: "Source", subject: "Matematik", teacherId: teacher.id, capacity: 2 } }); groups.push(group.id);
  const target = await db.group.create({ data: { name: "Target", subject: "Matematik", teacherId: teacher.id, capacity: 1 } }); groups.push(target.id);
  const revision = async (id = group.id) => groupRevision(await loadGroupMutationState(db, id));
  const clean = async () => {
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.emailOutbox.deleteMany({ where: { OR: emails.map((email) => ({ recipients: { contains: email } })) } });
    await db.auditLog.deleteMany({ where: { actorUserId: actor.id } });
    await db.enrollment.deleteMany({ where: { groupId: { in: groups } } });
    await db.lesson.deleteMany({ where: { groupId: { in: groups } } });
    await db.lessonSeries.deleteMany({ where: { groupId: { in: groups } } });
    await db.group.deleteMany({ where: { id: { in: groups } } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
  };
  return { actor, teacher, learner, student, group, target, groups, revision, clean, makeUser };
}

integration("P2.3 oluşturma eşzamanlı aynı anahtarda bir grup ve bir audit üretir", async () => {
  const f = await fixture();
  try {
    const input = { name: "New group", subject: "Fen", teacherId: f.teacher.id, studentIds: [] };
    const envelope = { idempotencyKey: randomUUID() };
    const [first, second] = await Promise.all([createManagedGroup(f.actor.id, input, envelope), createManagedGroup(f.actor.id, input, envelope)]);
    assert.equal(first.id, second.id); f.groups.push(first.id as string);
    assert.equal(await db.auditLog.count({ where: { idempotencyKey: mutationReceiptKey(f.actor.id, envelope.idempotencyKey) } }), 1);
    assert.equal([first, second].filter((result) => result.replayed).length, 1);
    await assert.rejects(createManagedGroup(f.actor.id, { ...input, name: "Changed" }, envelope), (error) => error instanceof GroupMutationError && error.code === "IDEMPOTENCY_REUSE");
  } finally { await f.clean(); }
});

integration("P2.3 üye ekleme tekrarında üyelik/bildirim/outbox çoğalmaz; eski sürüm reddedilir", async () => {
  const f = await fixture();
  try {
    const envelope = { idempotencyKey: randomUUID(), expectedRevision: await f.revision() };
    const action = { action: "ADD_STUDENT" as const, studentId: f.student.id };
    const first = await updateManagedGroup(f.actor.id, f.group.id, action, envelope);
    const replay = await updateManagedGroup(f.actor.id, f.group.id, action, envelope);
    assert.ok('replayed' in first && first.replayed === false); assert.ok('replayed' in replay && replay.replayed === true);
    assert.equal(await db.enrollment.count({ where: { groupId: f.group.id, endedAt: null } }), 1);
    assert.equal(await db.notification.count({ where: { userId: f.learner.id } }), 1);
    assert.equal(await db.emailOutbox.count({ where: { recipients: { contains: f.learner.email } } }), 1);
    await assert.rejects(updateManagedGroup(f.actor.id, f.group.id, { action: "UPDATE_META", name: "Old form", subject: "Fen" }, { ...envelope, idempotencyKey: randomUUID() }), (error) => error instanceof GroupMutationError && error.code === "GROUP_CONFLICT");
  } finally { await f.clean(); }
});

integration("P2.3 transfer önizlemesinden sonra hedef kapasitesi değişirse hiçbir üyelik taşınmaz", async () => {
  const f = await fixture();
  try {
    await db.enrollment.create({ data: { groupId: f.group.id, studentId: f.student.id } });
    const action = { action: "TRANSFER" as const, mode: "PREVIEW" as const, studentIds: [f.student.id], targetGroupId: f.target.id };
    const preview = await previewGroupMembers(f.group.id, action);
    await db.group.update({ where: { id: f.target.id }, data: { capacity: 0 } });
    const envelope = { idempotencyKey: randomUUID(), expectedRevision: preview.expectedRevision, expectedTargetRevision: 'expectedTargetRevision' in preview ? preview.expectedTargetRevision : undefined };
    await assert.rejects(executeGroupMembers(f.actor.id, f.group.id, { ...action, mode: "EXECUTE" }, envelope), (error) => error instanceof GroupMutationError && error.code === "GROUP_CONFLICT");
    assert.equal(await db.enrollment.count({ where: { groupId: f.group.id, studentId: f.student.id, endedAt: null } }), 1);
    assert.equal(await db.enrollment.count({ where: { groupId: f.target.id } }), 0);
    assert.equal(await db.auditLog.count({ where: { idempotencyKey: mutationReceiptKey(f.actor.id, envelope.idempotencyKey) } }), 0);
  } finally { await f.clean(); }
});

integration("P2.3 bildirim tekrarı tek makbuz/outbox üretir; eski web formları ortak servisi kullanır", async () => {
  const f = await fixture();
  try {
    await db.enrollment.create({ data: { groupId: f.group.id, studentId: f.student.id } });
    const envelope = { idempotencyKey: randomUUID(), expectedRevision: await f.revision() };
    const action = { action: "NOTIFY" as const, mode: "EXECUTE" as const, studentIds: [f.student.id], title: "Yeni duyuru", body: "Ders saati güncellendi." };
    await executeGroupMembers(f.actor.id, f.group.id, action, envelope);
    await executeGroupMembers(f.actor.id, f.group.id, action, envelope);
    assert.equal(await db.notification.count({ where: { userId: f.learner.id, title: action.title } }), 1);
    assert.equal(await db.emailOutbox.count({ where: { recipients: { contains: f.learner.email } } }), 1);
    await updateManagedGroup(f.actor.id, f.group.id, { action: "UPDATE_META", name: "Web legacy", subject: "Fen" }, {});
    assert.equal((await db.group.findUniqueOrThrow({ where: { id: f.group.id } })).name, "Web legacy");
  } finally { await f.clean(); }
});

integration("P2.3 aynı son kontenjana iki transferden yalnız biri commit olur", async () => {
  const f = await fixture();
  try {
    const secondUser = await f.makeUser("STUDENT");
    const secondStudent = await db.studentProfile.create({ data: { userId: secondUser.id } });
    const studentIds = [f.student.id, secondStudent.id];
    await db.enrollment.createMany({ data: studentIds.map((studentId) => ({ studentId, groupId: f.group.id })) });
    const expectedRevision = await f.revision();
    const expectedTargetRevision = await f.revision(f.target.id);
    const results = await Promise.allSettled(studentIds.map((studentId) => executeGroupMembers(f.actor.id, f.group.id, { action: "TRANSFER", mode: "EXECUTE", studentIds: [studentId], targetGroupId: f.target.id }, { idempotencyKey: randomUUID(), expectedRevision, expectedTargetRevision })));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await db.enrollment.count({ where: { groupId: f.target.id, endedAt: null } }), 1);
    assert.equal(await db.enrollment.count({ where: { groupId: f.group.id, endedAt: null } }), 1);
  } finally { await f.clean(); }
});

integration("P2.3 öğretmen takvim çakışması değişiklik/bildirim/audit üretmeden geri alınır", async () => {
  const f = await fixture();
  try {
    const secondTeacher = await f.makeUser("TEACHER");
    const startsAt = new Date(Date.now() + 86_400_000);
    const endsAt = new Date(startsAt.getTime() + 40 * 60_000);
    await db.lesson.createMany({ data: [{ title: "Source lesson", groupId: f.group.id, teacherId: f.teacher.id, startsAt, endsAt }, { title: "Other lesson", groupId: f.target.id, teacherId: secondTeacher.id, startsAt, endsAt }] });
    const idempotencyKey = randomUUID();
    await assert.rejects(updateManagedGroup(f.actor.id, f.group.id, { action: "CHANGE_TEACHER", teacherId: secondTeacher.id }, { idempotencyKey, expectedRevision: await f.revision() }));
    assert.equal((await db.group.findUniqueOrThrow({ where: { id: f.group.id } })).teacherId, f.teacher.id);
    assert.equal(await db.auditLog.count({ where: { idempotencyKey: mutationReceiptKey(f.actor.id, idempotencyKey) } }), 0);
    assert.equal(await db.notification.count({ where: { userId: { in: [f.teacher.id, secondTeacher.id] } } }), 0);
  } finally { await f.clean(); }
});

integration("P2.3 grup bildirimi yalnız aktif ve akademik veri izni olan veliye ulaşır", async () => {
  const f = await fixture();
  try {
    const allowed = await f.makeUser("PARENT");
    const denied = await f.makeUser("PARENT");
    await db.parentStudent.createMany({ data: [{ parentId: allowed.id, studentId: f.student.id, canViewAcademic: true }, { parentId: denied.id, studentId: f.student.id, canViewAcademic: false }] });
    await db.enrollment.create({ data: { groupId: f.group.id, studentId: f.student.id } });
    await executeGroupMembers(f.actor.id, f.group.id, { action: "NOTIFY", mode: "EXECUTE", studentIds: [f.student.id], title: "Duyuru", body: "Grup duyurusu." }, { idempotencyKey: randomUUID(), expectedRevision: await f.revision() });
    assert.equal(await db.notification.count({ where: { userId: allowed.id } }), 1);
    assert.equal(await db.notification.count({ where: { userId: denied.id } }), 0);
  } finally { await f.clean(); }
});
