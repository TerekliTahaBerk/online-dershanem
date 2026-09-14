/**
 * Alan adından kişisel veri tahmini. HEURİSTİKTİR: kesin sınıflandırma değil,
 * hukuk/veri sorumlusunun gözden geçirmesi için başlangıç listesidir.
 * Hem `scripts/generate-pii-inventory.mjs` hem DSR dışa aktarımı kullanır.
 */

const normalize = (name) => name.replace(/[^a-z0-9]/gi, "").toLowerCase();

/** Sıra önemlidir: ilk eşleşen kural kazanır. */
export const PII_RULES = Object.freeze([
  { category: "kimlik doğrulama sırrı", confidence: "yüksek", parts: ["password", "tokenhash", "secret", "recoverycode", "publickey", "credential", "otp", "totp", "encrypted", "ciphertext"] },
  { category: "iletişim", confidence: "yüksek", parts: ["email", "phone", "whatsapp", "address", "adres", "telefon"] },
  { category: "kimlik", confidence: "yüksek", parts: ["fullname", "firstname", "lastname", "studentname", "parentname", "displayname", "username", "birthdate", "tcno", "tckimlik", "identitynumber", "instagramscoped", "profilepicture", "passportno"] },
  { category: "kimlik", confidence: "orta", parts: ["ip", "useragent", "city", "schoolname", "devicelabel"] },
  { category: "finansal", confidence: "orta", parts: ["amount", "price", "cents", "iban", "cardlast", "invoice", "taxnumber", "taxoffice", "billing", "refund"] },
  { category: "serbest metin", confidence: "orta", parts: ["note", "comment", "message", "body", "transcript", "feedback", "summary", "description", "reason", "explanation", "answertext", "response", "question", "content", "goal", "reflection", "concern", "text"] },
  { category: "akademik", confidence: "orta", parts: ["score", "grade", "classlevel", "examtype", "mastery", "correct", "wrong", "blank", "net", "rank", "attendance", "percentile"] },
  { category: "kimlik", confidence: "düşük", parts: ["name"] },
]);

/** Kısa parçalar ("ip", "net") alt dizede çok yanlış pozitif verir; tam/sonek eşleşmesi ister. */
const EXACT_OR_SUFFIX = new Set(["ip", "net", "otp", "name", "text", "body", "rank", "city", "goal"]);

export function classifyFieldName(fieldName) {
  const normalized = normalize(fieldName);
  for (const rule of PII_RULES) {
    for (const part of rule.parts) {
      const hit = EXACT_OR_SUFFIX.has(part)
        ? normalized === part || normalized.endsWith(part)
        : normalized.includes(part);
      if (hit) return { category: rule.category, confidence: rule.confidence, matched: part };
    }
  }
  return null;
}

const SECRET_KEYS = /(hash|secret|token|password|recoverycode|publickey|credential|encrypted|ciphertext)/i;

/** DSR dışa aktarımında veri sahibine bile verilmeyecek kimlik doğrulama sırları. */
export function isCredentialField(fieldName) {
  return SECRET_KEYS.test(normalize(fieldName));
}

/** Scalar alanın mevcut koruma durumunu adından tahmin eder. */
export function protectionStatus(fieldName, sensitiveKeyParts) {
  const normalized = normalize(fieldName);
  if (/hash$/.test(normalized)) return "tek yönlü hash";
  if (/(encrypted|ciphertext)/.test(normalized)) return "şifreli";
  if (sensitiveKeyParts.some((part) => normalized.includes(part))) return "log/audit redaction anahtarı; DB'de düz";
  return "yok (DB'de düz)";
}
