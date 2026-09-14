import { redactSensitiveValue } from "@/lib/security/redaction.mjs";

/** Audit payload'larında PII ve secret alanlarını merkezi olarak ayıklar. */
export function sanitizeAuditPayload(value: unknown): unknown {
  return redactSensitiveValue(value);
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
