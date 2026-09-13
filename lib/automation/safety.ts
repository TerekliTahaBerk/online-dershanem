import {
  AUTOMATION_MAX_ACTIONS,
  AUTOMATION_MAX_RECURSION_DEPTH,
  AUTOMATION_RATE_LIMIT_PER_HOUR,
} from "@/lib/automation/definitions";

export type SafetyDecision =
  | { ok: true }
  | { ok: false; code: "RECURSION" | "RATE_LIMIT" | "MAX_ACTIONS" | "DISABLED" | "DUPLICATE" };

export function assertActionBudget(actionCount: number): SafetyDecision {
  if (actionCount > AUTOMATION_MAX_ACTIONS) {
    return { ok: false, code: "MAX_ACTIONS" };
  }
  return { ok: true };
}

export function assertRecursionDepth(depth: number): SafetyDecision {
  if (depth > AUTOMATION_MAX_RECURSION_DEPTH) {
    return { ok: false, code: "RECURSION" };
  }
  return { ok: true };
}

export function assertRuleEnabled(isActive: boolean): SafetyDecision {
  if (!isActive) return { ok: false, code: "DISABLED" };
  return { ok: true };
}

/** Basit saatlik kota kontrolü — çağıran taraf sayımı sağlar. */
export function assertHourlyRateLimit(runsInWindow: number, limit = AUTOMATION_RATE_LIMIT_PER_HOUR): SafetyDecision {
  if (runsInWindow >= limit) return { ok: false, code: "RATE_LIMIT" };
  return { ok: true };
}

export function buildEventId(input: {
  trigger: string;
  entityType: string;
  entityId: string;
  /** Aynı gün / bucket için tekrar çalışmayı engeller (scan tetikleyicileri). */
  bucket?: string;
}): string {
  const bucket = input.bucket ?? "once";
  return `${input.trigger}:${input.entityType}:${input.entityId}:${bucket}`;
}

export function buildRuleEventDedupeKey(ruleId: string, eventId: string): string {
  return `${ruleId}:${eventId}`;
}
