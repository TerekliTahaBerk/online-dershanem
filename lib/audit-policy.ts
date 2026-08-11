const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PARTS = [
  "password", "secret", "token", "authorization", "cookie", "hash", "email", "phone",
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

/** Audit payload'larında PII ve secret alanlarını merkezi olarak ayıklar. */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditPayload);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      isSensitiveKey(key) ? REDACTED : sanitizeAuditPayload(child),
    ]),
  );
}

export function paytrAuditIdempotencyKey(action: string, merchantOid: string): string {
  return `paytr:${action}:${merchantOid}`;
}

type RetryOptions = {
  maxAttempts: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

/** Kısa DB kesintilerini request ömrü içinde telafi eder; son hatayı çağırana bırakır. */
export async function writeWithRetry(
  write: () => Promise<void>,
  { maxAttempts, sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) }: RetryOptions,
): Promise<number> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await write();
      return attempt;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(25 * attempt);
    }
  }
  throw lastError;
}
