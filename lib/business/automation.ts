/**
 * Geriye dönük uyumluluk: Instagram CRM çağrıları `@/lib/business/automation`
 * yolunu kullanmaya devam eder. Yeni kod `@/lib/automation` tercih etmeli.
 */
import "server-only";

export {
  automationTriggerSchema,
  automationConditionSchema,
  automationActionSchema,
  automationActionsSchema,
} from "@/lib/automation/schemas";

export {
  executeAutomations,
  emitAutomationEvent,
  dryRunAutomationRule,
  runUnansweredHotLeadAutomations,
  type AutomationEventContext,
  type EmitSummary,
  type RuleRunOutcome,
} from "@/lib/automation/engine";

export { conditionsMatch } from "@/lib/automation/conditions";
