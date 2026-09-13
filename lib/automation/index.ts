export {
  AUTOMATION_RULE_VERSION,
  AUTOMATION_MAX_ACTIONS,
  AUTOMATION_RATE_LIMIT_PER_HOUR,
  AUTOMATION_MAX_RECURSION_DEPTH,
  PART12_TRIGGERS,
  LEGACY_TRIGGERS,
  AUTOMATION_TRIGGERS,
  AUTOMATION_TRIGGER_LABELS,
  PART12_ACTIONS,
  LEGACY_ACTIONS,
  AUTOMATION_ACTION_LABELS,
  APPROVED_EMAIL_TEMPLATES,
  APPROVED_EMAIL_TEMPLATE_LABELS,
  SEVERITY_VALUES,
  TRIGGER_ALIASES,
  type AutomationTrigger,
  type ApprovedEmailTemplate,
  type AutomationSeverity,
  type Part12ActionType,
  type LegacyActionType,
} from "@/lib/automation/definitions";

export {
  automationTriggerSchema,
  automationConditionSchema,
  automationActionSchema,
  automationActionsSchema,
  automationRuleInputSchema,
  type AutomationAction,
  type AutomationConditions,
} from "@/lib/automation/schemas";

export { conditionsMatch, evaluateConditions, type ConditionContext } from "@/lib/automation/conditions";

export {
  assertActionBudget,
  assertRecursionDepth,
  assertRuleEnabled,
  assertHourlyRateLimit,
  buildEventId,
  buildRuleEventDedupeKey,
  type SafetyDecision,
} from "@/lib/automation/safety";
