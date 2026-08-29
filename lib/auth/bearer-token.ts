/**
 * `Authorization: Bearer <token>` ayrıştırma — saf mantık, `server-only`
 * DEĞİL. `session.ts` (server-only: `next/headers` + Prisma kullanır) bunu
 * kullanır; ama kendisi burada ayrı durur ki `node --test` altında
 * doğrudan test edilebilsin. Aynı ayrım `password.ts`/`password-policy.ts`
 * arasında da var: server-only bir dosyadan tek sabit import etmek bile
 * testi patlatır.
 */
export function parseBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}
