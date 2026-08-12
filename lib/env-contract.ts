export type DeploymentEnvironment = "development" | "preview" | "production";
export type ConfigurationStatus = "ready" | "degraded" | "blocked";

export type ConfigurationIssue = {
  code: "missing" | "invalid" | "stale" | "partial";
  key: string;
  severity: "blocker" | "warning";
};

export type ConfigurationReport = {
  status: ConfigurationStatus;
  environment: DeploymentEnvironment;
  fingerprint: string;
  blockers: ConfigurationIssue[];
  warnings: ConfigurationIssue[];
};

type Env = Record<string, string | undefined>;

const DAY_MS = 24 * 60 * 60 * 1000;
export const RESTORE_DRILL_MAX_AGE_DAYS = 90;

const ALWAYS_REQUIRED = ["DATABASE_URL"] as const;
const PRODUCTION_REQUIRED = [
  "DIRECT_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXTAUTH_SECRET",
  "PANEL_ENABLED",
  "CRON_SECRET",
  "BLOB_READ_WRITE_TOKEN",
] as const;

const OPTIONAL_KEYS = ["RESEND_API_KEY", "EMAIL_MODE"] as const;
const ODK_READINESS_KEYS = [
  "ODK_ROLLOUT_MODE",
  "ODK_PILOT_KILL_SWITCH",
  "ODK_PILOT_ACCEPTANCE_APPROVED",
  "ODK_PILOT_SECURITY_REVIEW_APPROVED",
  "ODK_PILOT_OPERATIONS_APPROVED",
] as const;

function hasValue(env: Env, key: string) {
  return Boolean(env[key]?.trim());
}

function looksLikePlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("replace-with") || normalized.includes("changeme") || normalized.includes("example");
}

function fingerprint(issues: ConfigurationIssue[]) {
  const input = issues
    .map((issue) => `${issue.severity}:${issue.code}:${issue.key}`)
    .sort()
    .join("|");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `cfg-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function restoreDrillIssue(env: Env, now: Date): ConfigurationIssue | null {
  const raw = env.ODK_LAST_RESTORE_DRILL_AT?.trim();
  if (!raw) return { key: "ODK_LAST_RESTORE_DRILL_AT", code: "missing", severity: "warning" };

  const restoredAt = new Date(raw);
  if (!Number.isFinite(restoredAt.getTime()) || restoredAt > now) {
    return { key: "ODK_LAST_RESTORE_DRILL_AT", code: "invalid", severity: "warning" };
  }
  if (now.getTime() - restoredAt.getTime() > RESTORE_DRILL_MAX_AGE_DAYS * DAY_MS) {
    return { key: "ODK_LAST_RESTORE_DRILL_AT", code: "stale", severity: "warning" };
  }
  return null;
}

export function deploymentEnvironment(env: Env = process.env): DeploymentEnvironment {
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  return env.NODE_ENV === "production" ? "production" : "development";
}

export function evaluateConfiguration(input: {
  env?: Env;
  environment?: DeploymentEnvironment;
  now?: Date;
} = {}): ConfigurationReport {
  const env = input.env ?? process.env;
  const environment = input.environment ?? deploymentEnvironment(env);
  const now = input.now ?? new Date();
  const issues: ConfigurationIssue[] = [];
  const addRequired = (key: string, severity: ConfigurationIssue["severity"]) => {
    const value = env[key]?.trim();
    if (!value) issues.push({ key, code: "missing", severity });
    else if (looksLikePlaceholder(value)) issues.push({ key, code: "invalid", severity });
  };

  for (const key of ALWAYS_REQUIRED) addRequired(key, "blocker");
  for (const key of PRODUCTION_REQUIRED) {
    addRequired(key, environment === "production" ? "blocker" : "warning");
  }
  for (const key of OPTIONAL_KEYS) addRequired(key, "warning");
  for (const key of ODK_READINESS_KEYS) addRequired(key, "warning");

  const addInvalidWhenPresent = (
    key: string,
    valid: (value: string) => boolean,
    severity: ConfigurationIssue["severity"],
  ) => {
    const value = env[key]?.trim();
    if (value && !issues.some((issue) => issue.key === key) && !valid(value)) {
      issues.push({ key, code: "invalid", severity });
    }
  };
  const productionSeverity = environment === "production" ? "blocker" : "warning";
  addInvalidWhenPresent("PANEL_ENABLED", (value) => value === "true" || value === "false", productionSeverity);
  addInvalidWhenPresent("NEXT_PUBLIC_APP_URL", (value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, productionSeverity);
  addInvalidWhenPresent("EMAIL_MODE", (value) => value === "receipts" || value === "all", "warning");
  addInvalidWhenPresent("RATE_LIMIT_PROXY_MODE", (value) => value === "vercel" || value === "cloudflare", productionSeverity);
  addInvalidWhenPresent("ODK_ROLLOUT_MODE", (value) => value === "disabled" || value === "pilot" || value === "general", "warning");
  for (const key of ODK_READINESS_KEYS.filter((key) => key !== "ODK_ROLLOUT_MODE")) {
    addInvalidWhenPresent(key, (value) => value === "true" || value === "false", "warning");
  }
  if (env.ODK_ROLLOUT_MODE?.trim() === "general") {
    const generalApproved = [
      env.ODK_PILOT_ACCEPTANCE_APPROVED,
      env.ODK_PILOT_SECURITY_REVIEW_APPROVED,
      env.ODK_PILOT_OPERATIONS_APPROVED,
    ].every((value) => value?.trim() === "true");
    if (!generalApproved) issues.push({ key: "ODK_GENERAL_APPROVALS", code: "invalid", severity: productionSeverity });
  }

  if (env.INSTAGRAM_AI_ENABLED === "true") addRequired("OPENAI_API_KEY", "blocker");
  if (env.INSTAGRAM_INTEGRATION_ENABLED === "true") {
    addRequired("META_APP_SECRET", "blocker");
    addRequired("META_VERIFY_TOKEN", "blocker");
  }
  if (env.INSTAGRAM_INTEGRATION_ENABLED === "true" || env.META_ADS_INTEGRATION_ENABLED === "true") {
    addRequired("META_GRAPH_API_VERSION", "blocker");
  }

  const redisUrl = hasValue(env, "UPSTASH_REDIS_REST_URL");
  const redisToken = hasValue(env, "UPSTASH_REDIS_REST_TOKEN");
  if (redisUrl !== redisToken) {
    issues.push({ key: "UPSTASH_REDIS", code: "partial", severity: "warning" });
  }

  const paytrKeys = ["PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"];
  const configuredPaytrKeys = paytrKeys.filter((key) => hasValue(env, key));
  if (configuredPaytrKeys.length > 0 && configuredPaytrKeys.length < paytrKeys.length) {
    issues.push({ key: "PAYTR", code: "partial", severity: "warning" });
  }

  const restoreIssue = restoreDrillIssue(env, now);
  if (restoreIssue) issues.push(restoreIssue);

  const blockers = issues.filter((issue) => issue.severity === "blocker");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const status = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "degraded" : "ready";

  return { status, environment, fingerprint: fingerprint(issues), blockers, warnings };
}
