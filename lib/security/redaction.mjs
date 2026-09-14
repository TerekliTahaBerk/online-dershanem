export const REDACTED_VALUE = "[REDACTED]";

/**
 * Log ve audit yüzeylerinde hassas kabul edilen alan adları. Anahtarlar
 * noktalama ve büyük/küçük harften bağımsız karşılaştırılır.
 */
export const SENSITIVE_KEY_PARTS = Object.freeze([
  "password", "parola", "secret", "token", "authorization", "cookie", "hash",
  "email", "eposta", "phone", "telefon", "tckimlik", "tcno", "identitynumber",
  "fullname", "adsoyad", "studentname", "ogrenciadi", "parentname", "veliladi",
]);

export function isSensitiveKey(key) {
  const normalized = key.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

function redactText(value) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED_VALUE)
    .replace(/(?:\+?90\s*)?(?:\(?0?5\d{2}\)?[\s.-]*)\d{3}[\s.-]*\d{2}[\s.-]*\d{2}\b/g, REDACTED_VALUE)
    .replace(/\b(?:bearer\s+)[A-Z0-9._~+/=-]{8,}\b/gi, `Bearer ${REDACTED_VALUE}`);
}

/** Döngüsel nesneleri de güvenle işleyen ortak PII/secret redaction'ı. */
export function redactSensitiveValue(value, seen = new WeakSet()) {
  if (typeof value === "string") return redactText(value);
  if (value instanceof Error) {
    return { name: value.name, message: redactText(value.message) };
  }
  if (Array.isArray(value)) return value.map((item) => redactSensitiveValue(item, seen));
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      isSensitiveKey(key) ? REDACTED_VALUE : redactSensitiveValue(child, seen),
    ]),
  );
}
