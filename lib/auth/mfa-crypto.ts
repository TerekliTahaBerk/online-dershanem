import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) throw new Error("MFA_ENCRYPTION_KEY_MISSING");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("MFA_ENCRYPTION_KEY_INVALID");
  return key;
}

export function encryptMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptMfaSecret(envelope: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = envelope.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("MFA_SECRET_ENVELOPE_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

export function randomBase32(bytes = 20): string {
  const input = randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.toUpperCase().replace(/=+$/g, "")) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("INVALID_BASE32");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, counter: bigint, digits = 6): string {
  const moving = Buffer.alloc(8);
  moving.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", decodeBase32(secret)).update(moving).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return binary.toString().padStart(digits, "0");
}

export function matchTotpCounter(secret: string, code: string, now = Date.now(), window = 1): bigint | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = BigInt(Math.floor(now / 30_000));
  const candidate = Buffer.from(code);
  for (let drift = -window; drift <= window; drift += 1) {
    const counter = current + BigInt(drift);
    if (counter < 0n) continue;
    const expected = Buffer.from(totpCode(secret, counter));
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) return counter;
  }
  return null;
}

export function hashMfaValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const compact = randomBytes(8).toString("hex").toUpperCase();
    return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12)}`;
  });
}
