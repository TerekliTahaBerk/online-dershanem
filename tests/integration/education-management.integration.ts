import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { afterEducationCommit, educationRevision, educationSnapshot, onEducationRollback, runEducationMutation, transactionalAudit } from "@/lib/panel/education-write";
import { GroupMutationError, operationDigest } from "@/lib/panel/group-mutation-core";
import { loadEducationEditor } from "@/lib/panel/education-editor-server";
import { parseEducationEditor } from "@/lib/mobile-contracts/admin-education-editor";
import { integration } from "./integration-utils";

async function fixture() {
  const user = await db.user.create({ data: { email: `education-${randomUUID()}@example.com`, passwordHash: "unused-test-password", role: "ADMIN", status: "ACTIVE" } });
  const teacher = await db.user.create({ data: { email: `teacher-${randomUUID()}@example.com`, passwordHash: "unused-test-password", role: "TEACHER", status: "ACTIVE" } });
  const group = await db.group.create({ data: { name: "Education test", subject: "Matematik", teacherId: teacher.id } });
  const revision = educationRevision(await educationSnapshot(db, "group", group.id));
  const envelope = { db, key: `education:${user.id}:${randomUUID()}`, digest: operationDigest({ fixture: group.id }), actorId: user.id, action: "education.assignment.post", kind: "assignment" as const, targetKind: "group" as const, targetId: group.id, expectedRevision: revision };
  const clean = async () => {
    await db.notification.deleteMany({ where: { userId: user.id } });
    await db.auditLog.deleteMany({ where: { actorUserId: user.id } });
    await db.learningMaterial.deleteMany({ where: { groupId: group.id } });
    await db.assignment.deleteMany({ where: { groupId: group.id } });
    await db.group.delete({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [user.id, teacher.id] } } });
  };
  return { user, teacher, group, envelope, clean };
}

integration("P2.3 nested writes, audit, notification and receipt commit once; changed key content is rejected", async () => {
  const f = await fixture(); let commits = 0;
  const execute: Parameters<typeof runEducationMutation>[0]["execute"] = async (client) => {
    const assignment = await client.$transaction(async (tx) => {
      const row = await tx.assignment.create({ data: { groupId: f.group.id, createdById: f.user.id, title: "Atomic assignment", dueAt: new Date() } });
      await tx.notification.create({ data: { userId: f.user.id, type: "SYSTEM", title: "Created", body: "Assignment" } });
      return row;
    });
    await transactionalAudit(client)({ actorUserId: f.user.id, entityType: "Assignment", entityId: assignment.id, action: "assignment.created", summary: "Created" });
    await afterEducationCommit(client, () => { commits++; });
    return Response.json({ id: assignment.id }, { status: 201 });
  };
  try {
    const first = await runEducationMutation({ ...f.envelope, execute });
    const second = await runEducationMutation({ ...f.envelope, execute });
    assert.deepEqual(second.body, first.body); assert.equal(second.replayed, true); assert.equal(commits, 1);
    assert.equal(await db.assignment.count({ where: { groupId: f.group.id } }), 1);
    assert.equal(await db.notification.count({ where: { userId: f.user.id } }), 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.user.id } }), 2);
    await assert.rejects(runEducationMutation({ ...f.envelope, digest: operationDigest("changed"), execute }), (error) => error instanceof GroupMutationError && error.code === "IDEMPOTENCY_REUSE");
  } finally { await f.clean(); }
});

integration("P2.3 rejected response rolls back array transactions and runs cleanup without commit effects", async () => {
  const f = await fixture(); let commits = 0, cleanups = 0;
  try {
    await assert.rejects(runEducationMutation({ ...f.envelope, execute: async (client) => {
      await client.$transaction([client.assignment.create({ data: { groupId: f.group.id, createdById: f.user.id, title: "Rollback assignment", dueAt: new Date() } }), client.notification.create({ data: { userId: f.user.id, type: "SYSTEM", title: "Rollback", body: "Rollback" } })]);
      onEducationRollback(client, () => { cleanups++; });
      await afterEducationCommit(client, () => { commits++; });
      return Response.json({ error: "Conflict" }, { status: 409 });
    } }));
    assert.equal(commits, 0); assert.equal(cleanups, 1);
    assert.equal(await db.assignment.count({ where: { groupId: f.group.id } }), 0);
    assert.equal(await db.notification.count({ where: { userId: f.user.id } }), 0);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.user.id } }), 0);
  } finally { await f.clean(); }
});

integration("P2.3 receipt audit failure rolls back business writes and external file cleanup", async () => {
  const f = await fixture(); let cleanups = 0;
  try {
    await assert.rejects(runEducationMutation({ ...f.envelope, execute: async (client) => {
      await client.assignment.create({ data: { groupId: f.group.id, createdById: f.user.id, title: "Audit failure", dueAt: new Date() } });
      await client.auditLog.create({ data: { actorUserId: f.user.id, entityType: "Test", entityId: "collision", action: "test", summary: "Force receipt collision", idempotencyKey: f.envelope.key } });
      onEducationRollback(client, () => { cleanups++; });
      return Response.json({ id: "test" });
    } }));
    assert.equal(cleanups, 1); assert.equal(await db.assignment.count({ where: { groupId: f.group.id } }), 0);
  } finally { await f.clean(); }
});

integration("P2.3 stale group revision prevents any business handler from running", async () => {
  const f = await fixture(); let called = false;
  try {
    await db.group.update({ where: { id: f.group.id }, data: { capacity: 9 } });
    await assert.rejects(runEducationMutation({ ...f.envelope, execute: async () => { called = true; return Response.json({ ok: true }); } }), (error) => error instanceof GroupMutationError && error.code === "EDUCATION_CONFLICT");
    assert.equal(called, false);
  } finally { await f.clean(); }
});

integration("P2.3 private blob address is absent from both successful response and receipt replay", async () => {
  const f = await fixture();
  try {
    const execute = async () => Response.json({ material: { id: "private-file", url: "https://private.example.test/blob" } });
    const first = await runEducationMutation({ ...f.envelope, redactFile: true, execute });
    const replay = await runEducationMutation({ ...f.envelope, redactFile: true, execute });
    assert.equal(JSON.stringify(first).includes("https://private"), false);
    assert.equal(JSON.stringify(replay).includes("https://private"), false);
    assert.equal(replay.replayed, true);
  } finally { await f.clean(); }
});

integration("P2.3 editor contract and selected group revisions match transaction snapshots", async () => {
  const f = await fixture();
  try {
    for (const kind of ["lesson", "assignment", "material", "setup", "calendar"] as const) {
      const parsed = parseEducationEditor(await loadEducationEditor({ kind, group: f.group.id }));
      if (!parsed.ok) throw new Error(parsed.error);
      const editor = parsed.value;
      const option = editor.forms.flatMap((form) => form.fields).find((field) => ["groupId", "group"].includes(field.key))?.options.find((option) => option.id === f.group.id);
      if (kind !== "setup") assert.equal(option?.revision, f.envelope.expectedRevision);
      assert.ok(editor.forms.length);
    }
  } finally { await f.clean(); }
});
