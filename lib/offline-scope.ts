import "server-only";
import { createHmac } from "node:crypto";

export function offlineSessionScope(sessionId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "local-offline-scope-development-key";
  return createHmac("sha256", secret).update(`panel-offline:${sessionId}`).digest("base64url").slice(0, 32);
}
