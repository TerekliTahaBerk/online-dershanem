import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) throw new Error("INTEGRATION_ENCRYPTION_KEY_MISSING");
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32) throw new Error("INTEGRATION_ENCRYPTION_KEY_INVALID");
  return value;
}
export function encryptIntegrationCredentials(value: unknown) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decryptIntegrationCredentials<T>(value: string): T {
  const [version, iv, tag, data] = value.split("."); if (version !== "v1" || !iv || !tag || !data) throw new Error("CREDENTIAL_FORMAT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8")) as T;
}

