import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import type { BusinessAccess } from "@/lib/business/access";
import { runOpsCommand } from "@/lib/business/ops-service";
import { BusinessCommandError } from "@/lib/business/command-receipt";
import { integration } from "./integration-utils";

integration("P2.7d: dokuz komut, tekrar/409, kapsam, prompt sürümü ve atomik rol/oturum iptali", async () => {
  const run = randomUUID();
  const actor = await db.user.create({ data: { email: `${run}@example.com`, fullName: "P27d", role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const target = await db.user.create({ data: { email: `target-${run}@example.com`, role: "TEACHER", status: "ACTIVE", passwordHash: "unused" } });
  const old = await db.businessUnit.findUnique({ where: { product: "OD" } });
  const unit = old ?? await db.businessUnit.create({ data: { code: `p27d-${run}`, name: "P27d", product: "OD" } });
  const otherOld = await db.businessUnit.findUnique({ where: { product: "OK" } });
  const other = otherOld ?? await db.businessUnit.create({ data: { code: `other-${run}`, name: "Other", product: "OK" } });
  const access: BusinessAccess = { session: { userId: actor.id } as SessionUser, units: [{ id: unit.id, code: unit.code, name: unit.name, product: "OD", role: "SUPER_ADMIN" }] };
  const conflict = (code: string) => (e: unknown) => e instanceof BusinessCommandError && e.code === code;
  const knowledgeIds: string[] = [];
  const ruleIds: string[] = [];
  try {
    const command = { type: "knowledge.create" as const, title: "Test bilgisi", category: "Test", content: "Yeterince uzun içerik", productInterest: "UNKNOWN" as const };
    const key = randomUUID();
    const first = await runOpsCommand(access, command, { idempotencyKey: key });
    knowledgeIds.push(first.result.entityId);
    assert.equal((await runOpsCommand(access, command, { idempotencyKey: key })).replayed, true);
    await assert.rejects(runOpsCommand(access, { ...command, title: "Başka başlık" }, { idempotencyKey: key }), conflict("IDEMPOTENCY_REUSE"));
    await assert.rejects(runOpsCommand(access, { ...command, validFrom: "2026-10-12", validUntil: "2026-10-01" }), conflict("INVALID_VALIDITY_RANGE"));
    await assert.rejects(runOpsCommand(access, { ...command, businessUnitId: other.id }), conflict("BUSINESS_UNIT_REQUIRED"));
    const knowledge = await db.knowledgeBaseEntry.findUniqueOrThrow({ where: { id: first.result.entityId } });
    await runOpsCommand(access, { type: "knowledge.version", id: knowledge.id, content: "Yeni sürüm içeriği uzun", isActive: false, expectedRevision: knowledge.updatedAt.toISOString() });
    assert.equal((await db.knowledgeBaseEntry.findUniqueOrThrow({ where: { id: knowledge.id } })).version, 2);
    await assert.rejects(runOpsCommand(access, { type: "knowledge.version", id: knowledge.id, content: "Eski sürüm içeriği uzun", isActive: true, expectedRevision: knowledge.updatedAt.toISOString() }), conflict("REVISION_CONFLICT"));
    const foreign = await db.knowledgeBaseEntry.create({ data: { businessUnitId: other.id, title: "Other", category: "Test", content: "Yabancı birim bilgisi" } });
    knowledgeIds.push(foreign.id);
    await assert.rejects(runOpsCommand(access, { type: "knowledge.version", id: foreign.id, content: "Erişilmeyen içerik değişimi", isActive: true }), conflict("KNOWLEDGE_NOT_FOUND"));

    const promptName = `p27d-${run}`;
    await db.aIPromptVersion.create({ data: { name: promptName, version: 1, businessUnitId: other.id, systemPrompt: "Diğer birimdeki sistem prompt'u", isActive: true } });
    await runOpsCommand(access, { type: "prompt.create", name: promptName, systemPrompt: "Yeni sürüm için uzun sistem prompt'u" });
    await runOpsCommand(access, { type: "prompt.create", name: promptName, systemPrompt: "Üçüncü sürüm için uzun sistem prompt'u" });
    const prompts = await db.aIPromptVersion.findMany({ where: { name: promptName }, orderBy: { version: "asc" } });
    assert.deepEqual(prompts.map((p) => [p.version, p.isActive]), [[1, true], [2, false], [3, true]]);

    const rule = await runOpsCommand(access, { type: "automation.create", name: "Test kuralı", triggerType: "lead_created", conditions: { source: "MANUAL" }, actions: [{ type: "create_task", title: "Adayı ara" }], isActive: false });
    ruleIds.push(rule.result.entityId);
    const current = await db.automationRule.findUniqueOrThrow({ where: { id: rule.result.entityId } });
    await runOpsCommand(access, { type: "automation.toggle", id: current.id, isActive: true, expectedRevision: current.updatedAt.toISOString() });
    await assert.rejects(runOpsCommand(access, { type: "automation.toggle", id: current.id, isActive: false, expectedRevision: "2000-01-01T00:00:00.000Z" }), conflict("REVISION_CONFLICT"));
    const dryKey = randomUUID();
    const dry = { type: "automation.dry_run" as const, id: current.id, triggerType: "lead_created" as const, entityType: "lead" as const, entityId: "dry-run-sample", source: "MANUAL" };
    const outcome = await runOpsCommand(access, dry, { idempotencyKey: dryKey });
    assert.equal(outcome.result.summary?.matched, 1);
    assert.equal(outcome.result.summary?.planned, 1);
    assert.equal((await runOpsCommand(access, dry, { idempotencyKey: dryKey })).replayed, true);
    assert.equal(await db.automationExecution.count({ where: { ruleId: current.id, dryRun: true } }), 1);
    await assert.rejects(runOpsCommand(access, { ...dry, id: foreign.id }), conflict("RULE_NOT_FOUND"));
    await runOpsCommand(access, { type: "retention.update", retentionDays: 365 });
    assert.equal((await db.businessUnit.findUniqueOrThrow({ where: { id: unit.id } })).retentionDays, 365);
    assert.equal((await db.businessUnit.findUniqueOrThrow({ where: { id: other.id } })).retentionDays, other.retentionDays);

    const targetSession = await db.session.create({ data: { userId: target.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
    const assigned = await runOpsCommand(access, { type: "role.assign", userId: target.id, businessUnitId: unit.id, role: "VIEWER" });
    assert.ok((await db.session.findUniqueOrThrow({ where: { id: targetSession.id } })).revokedAt);
    const newSession = await db.session.create({ data: { userId: target.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
    await runOpsCommand(access, { type: "role.revoke", id: assigned.result.entityId });
    assert.ok((await db.session.findUniqueOrThrow({ where: { id: newSession.id } })).revokedAt);
    const superRole = await db.businessRoleAssignment.create({ data: { userId: actor.id, businessUnitId: unit.id, role: "SUPER_ADMIN" } });
    const otherSupers = await db.businessRoleAssignment.count({ where: { role: "SUPER_ADMIN", user: { status: "ACTIVE" }, businessUnit: { isActive: true }, NOT: { id: superRole.id } } });
    if (!otherSupers) await assert.rejects(runOpsCommand(access, { type: "role.revoke", id: superRole.id }), conflict("LAST_SUPER_ADMIN_PROTECTED"));
    if (!otherSupers) {
      const second = await db.businessRoleAssignment.create({ data: { userId: target.id, businessUnitId: unit.id, role: "SUPER_ADMIN" } });
      const removals = await Promise.allSettled([runOpsCommand(access, { type: "role.revoke", id: superRole.id }), runOpsCommand(access, { type: "role.revoke", id: second.id })]);
      assert.equal(removals.filter((r) => r.status === "fulfilled").length, 1, "son iki süper yönetici eşzamanlı kaldırılamaz");
      assert.equal(await db.businessRoleAssignment.count({ where: { userId: { in: [actor.id, target.id] }, role: "SUPER_ADMIN" } }), 1);
    }
    assert.equal(await db.auditLog.count({ where: { actorUserId: actor.id, action: "KNOWLEDGE_ENTRY_CREATED" } }), 1);
  } finally {
    await db.automationExecution.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await db.automationRule.deleteMany({ where: { id: { in: ruleIds } } });
    await db.knowledgeBaseEntry.deleteMany({ where: { id: { in: knowledgeIds } } });
    await db.aIPromptVersion.deleteMany({ where: { name: `p27d-${run}` } });
    await db.auditLog.deleteMany({ where: { actorUserId: actor.id } });
    await db.businessRoleAssignment.deleteMany({ where: { userId: { in: [actor.id, target.id] } } });
    await db.session.deleteMany({ where: { userId: { in: [actor.id, target.id] } } });
    await db.user.deleteMany({ where: { id: { in: [actor.id, target.id] } } });
    if (old) await db.businessUnit.update({ where: { id: unit.id }, data: { retentionDays: old.retentionDays } });
    else await db.businessUnit.delete({ where: { id: unit.id } });
    if (!otherOld) await db.businessUnit.delete({ where: { id: other.id } });
  }
});
