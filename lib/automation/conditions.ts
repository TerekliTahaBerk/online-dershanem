import { automationConditionSchema, type AutomationConditions } from "@/lib/automation/schemas";

export type ConditionContext = {
  source?: string | null;
  product?: string | null;
  severity?: string | null;
  ownerId?: string | null;
  stage?: string | null;
  temperature?: "COLD" | "WARM" | "HOT" | null;
  intent?: string | null;
  campaignExternalId?: string | null;
};

function normalizeProduct(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().toUpperCase();
  if (raw === "OD" || raw === "ONLINE_DERSHANEM") return "OD";
  if (raw === "ODK" || raw === "ONLINE_DENEME_KULUBU") return "ODK";
  return raw;
}

function normalizeSource(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (raw.includes("instagram")) return "instagram";
  return raw;
}

/**
 * Koşul eşleşmesi — tüm tanımlı alanlar AND ile bağlanır.
 * Boş / parse edilemeyen conditions eşleşmez (fail-closed).
 */
export function conditionsMatch(conditions: unknown, context: ConditionContext): boolean {
  const parsed = automationConditionSchema.safeParse(conditions ?? {});
  if (!parsed.success) return false;
  return evaluateConditions(parsed.data, context);
}

export function evaluateConditions(conditions: AutomationConditions, context: ConditionContext): boolean {
  if (conditions.source) {
    const expected = normalizeSource(conditions.source);
    const actual = normalizeSource(context.source);
    if (!expected || !actual || expected !== actual) return false;
  }
  if (conditions.product) {
    const expected = normalizeProduct(conditions.product);
    const actual = normalizeProduct(context.product);
    if (!expected || !actual || expected !== actual) return false;
  }
  if (conditions.severity) {
    if ((context.severity ?? "").toLowerCase() !== conditions.severity) return false;
  }
  if (conditions.ownerEmpty === true) {
    if (context.ownerId) return false;
  }
  if (conditions.ownerEmpty === false) {
    if (!context.ownerId) return false;
  }
  if (conditions.stage) {
    if ((context.stage ?? "") !== conditions.stage) return false;
  }
  if (conditions.temperature) {
    if (context.temperature !== conditions.temperature) return false;
  }
  if (conditions.intent) {
    if (context.intent !== conditions.intent) return false;
  }
  if (conditions.campaignExternalId) {
    if (context.campaignExternalId !== conditions.campaignExternalId) return false;
  }
  return true;
}
