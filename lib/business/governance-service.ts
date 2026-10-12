import "server-only";
import type { Prisma } from "@prisma/client";
import { resolveMutationUnit, scopedUnitIds, type BusinessAccess } from "./access";
import { BusinessCommandError, type CommandExecution } from "./command-receipt";
import type { GovernanceCommand } from "./governance-commands";
import type { OpsResult } from "./ops-service";
import { dryRunAutomationRule } from "@/lib/automation/engine";

const fail = (status: 404 | 409 | 422, code: string) => new BusinessCommandError(status, code, status === 409 ? "Kayıt değişmiş veya işlem mevcut duruma uygun değil. Görünümü yenileyin." : status === 404 ? "Kayıt bulunamadı." : "İşlem alanlarını kontrol edin.");
function checkRevision(row: { updatedAt: Date }, expected?: string) {
  if (expected && row.updatedAt.toISOString() !== expected) throw fail(409, "REVISION_CONFLICT");
}
function unitFor(access: BusinessAccess, id?: string) {
  try { return resolveMutationUnit(access, id); } catch { throw fail(422, "BUSINESS_UNIT_REQUIRED"); }
}
const result = (entityType: string, entityId: string, action: string, section: string): CommandExecution<OpsResult> => ({ entityType, entityId, action, result: { entityId, section } });

/** Mutasyon + audit makbuzu Serializable transaction'da; rol ve oturum iptali atomiktir. */
export async function executeGovernance(tx: Prisma.TransactionClient, access: BusinessAccess, command: Exclude<GovernanceCommand, { type: "automation.dry_run" }>): Promise<CommandExecution<OpsResult>> {
  const scope = { in: scopedUnitIds(access) };
  const actor = access.session.userId;
  switch (command.type) {
    case "knowledge.create": {
      const unit = unitFor(access, command.businessUnitId);
      if (command.validFrom && command.validUntil && command.validFrom > command.validUntil) throw fail(422, "INVALID_VALIDITY_RANGE");
      const row = await tx.knowledgeBaseEntry.create({ data: { businessUnitId: unit.id, title: command.title, category: command.category, content: command.content, productInterest: command.productInterest, validFrom: command.validFrom ? new Date(command.validFrom) : null, validUntil: command.validUntil ? new Date(command.validUntil) : null, source: "Admin paneli", updatedById: actor } });
      return result("KnowledgeBaseEntry", row.id, "KNOWLEDGE_ENTRY_CREATED", "ai-bilgi-merkezi");
    }
    case "knowledge.version": {
      const row = await tx.knowledgeBaseEntry.findFirst({ where: { id: command.id, businessUnitId: scope } });
      if (!row) throw fail(404, "KNOWLEDGE_NOT_FOUND");
      checkRevision(row, command.expectedRevision);
      await tx.knowledgeBaseEntry.update({ where: { id: row.id }, data: { content: command.content, isActive: command.isActive, version: { increment: 1 }, updatedById: actor } });
      return { ...result("KnowledgeBaseEntry", row.id, "KNOWLEDGE_ENTRY_VERSIONED", "ai-bilgi-merkezi"), payload: { fromVersion: row.version, toVersion: row.version + 1 } };
    }
    case "prompt.create": {
      const unit = unitFor(access, command.businessUnitId);
      // Unique key is (name, version), globally, even when units differ.
      const latest = await tx.aIPromptVersion.findFirst({ where: { name: command.name }, orderBy: { version: "desc" } });
      await tx.aIPromptVersion.updateMany({ where: { businessUnitId: unit.id, name: command.name, isActive: true }, data: { isActive: false } });
      const row = await tx.aIPromptVersion.create({ data: { businessUnitId: unit.id, name: command.name, version: (latest?.version ?? 0) + 1, systemPrompt: command.systemPrompt, isActive: true } });
      return result("AIPromptVersion", row.id, "AI_PROMPT_VERSION_CREATED", "ai-bilgi-merkezi");
    }
    case "automation.create": {
      const unit = unitFor(access, command.businessUnitId);
      const row = await tx.automationRule.create({ data: { businessUnitId: unit.id, name: command.name, triggerType: command.triggerType, conditions: command.conditions, actions: command.actions, isActive: command.isActive, createdByUserId: actor } });
      return result("AutomationRule", row.id, "AUTOMATION_RULE_CREATED", "otomasyon-kurallari");
    }
    case "automation.toggle": {
      const row = await tx.automationRule.findFirst({ where: { id: command.id, businessUnitId: scope } });
      if (!row) throw fail(404, "RULE_NOT_FOUND");
      checkRevision(row, command.expectedRevision);
      await tx.automationRule.update({ where: { id: row.id }, data: { isActive: command.isActive } });
      return result("AutomationRule", row.id, command.isActive ? "AUTOMATION_RULE_ENABLED" : "AUTOMATION_RULE_DISABLED", "otomasyon-kurallari");
    }
    case "retention.update": {
      await tx.businessUnit.updateMany({ where: { id: scope }, data: { retentionDays: command.retentionDays } });
      return { ...result("BusinessUnit", "all", "RETENTION_SETTINGS_UPDATED", "ayarlar"), payload: { retentionDays: command.retentionDays } };
    }
    case "role.assign": {
      unitFor(access, command.businessUnitId);
      const user = await tx.user.findFirst({ where: { id: command.userId, status: "ACTIVE" }, select: { id: true } });
      if (!user) throw fail(404, "USER_NOT_FOUND");
      const assignment = { userId: command.userId, businessUnitId: command.businessUnitId, role: command.role };
      const row = await tx.businessRoleAssignment.upsert({ where: { userId_businessUnitId_role: assignment }, update: {}, create: assignment });
      await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      return { ...result("BusinessRoleAssignment", row.id, "BUSINESS_ROLE_ASSIGNED", "ayarlar"), payload: assignment };
    }
    case "role.revoke": {
      const row = await tx.businessRoleAssignment.findFirst({ where: { id: command.id, businessUnitId: scope } });
      if (!row) throw fail(404, "ROLE_ASSIGNMENT_NOT_FOUND");
      if (row.role === "SUPER_ADMIN") {
        const remaining = await tx.businessRoleAssignment.count({ where: { role: "SUPER_ADMIN", businessUnit: { isActive: true }, user: { status: "ACTIVE" }, NOT: { id: row.id } } });
        if (!remaining) throw fail(409, "LAST_SUPER_ADMIN_PROTECTED");
      }
      await tx.businessRoleAssignment.delete({ where: { id: row.id } });
      await tx.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      return { ...result("BusinessRoleAssignment", row.id, "BUSINESS_ROLE_REVOKED", "ayarlar"), payload: { userId: row.userId, businessUnitId: row.businessUnitId, role: row.role } };
    }
  }
}

export async function dryRunGovernance(access: BusinessAccess, command: Extract<GovernanceCommand, { type: "automation.dry_run" }>): Promise<CommandExecution<OpsResult>> {
  const outcome = await dryRunAutomationRule({ ruleId: command.id, businessUnitIds: scopedUnitIds(access), trigger: command.triggerType, context: { entityType: command.entityType, entityId: command.entityId, source: command.source || null, product: command.product || null, severity: command.severity || null, stage: command.stage || null, ownerId: command.ownerEmpty === false ? "sample-owner" : null } });
  if (outcome.errorCode === "RULE_NOT_FOUND") throw fail(404, "RULE_NOT_FOUND");
  return { ...result("AutomationRule", command.id, "AUTOMATION_RULE_DRY_RUN", "otomasyon-kurallari"), payload: { result: outcome.result, matched: outcome.matched, planned: outcome.planned }, result: { entityId: command.id, section: "otomasyon-kurallari", dryRunResult: outcome.result, summary: { matched: outcome.matched ? 1 : 0, planned: outcome.planned.length, failed: outcome.result === "FAILED" ? 1 : 0 } } };
}
