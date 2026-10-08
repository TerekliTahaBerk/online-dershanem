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

/** `Authorization` başlığı Bearer şemasını taşıyor mu (değer boş olsa bile)? */
function isBearerScheme(header: string | null | undefined): boolean {
  return Boolean(header && /^Bearer(\s|$)/i.test(header.trim()));
}

export type RequestCredential =
  | { kind: "none" }
  | { kind: "token"; token: string; source: "cookie" | "bearer" }
  /**
   * İstek iki FARKLI kimlik bilgisi taşıyor (çerez ≠ Bearer) ya da Bearer
   * şeması var ama değeri yok. Hangisinin "doğru" olduğunu tahmin etmek
   * yanlış kullanıcı olarak kimlik doğrulamak demektir — oturum açılmaz.
   */
  | { kind: "conflict"; reason: "COOKIE_BEARER_MISMATCH" | "EMPTY_BEARER" };

/**
 * İsteğin oturum kimlik bilgisini çözer. Kural deterministiktir:
 *
 * - Yalnız çerez → çerez (tarayıcı akışı; değişmedi).
 * - Yalnız Bearer → Bearer (native mobil istemci).
 * - Çerez ve Bearer AYNI token → o token.
 * - Çerez ve Bearer FARKLI → `conflict`: oturum yok (fail-closed). Bearer
 *   geçersiz olsa bile geçerli çereze geri DÜŞÜLMEZ; aksi halde bir istemci
 *   kendi gönderdiği kimlik yerine kavanozda kalmış başka bir kullanıcının
 *   kimliğiyle doğrulanabilirdi.
 * - `Authorization` Bearer DIŞI bir şema taşıyorsa (ör. staging önündeki
 *   HTTP Basic) yok sayılır; tarayıcı çerez akışı bozulmaz.
 */
export function resolveRequestCredential(input: {
  cookieToken: string | null | undefined;
  authorization: string | null | undefined;
}): RequestCredential {
  const cookieToken = input.cookieToken?.trim() || null;
  const bearerScheme = isBearerScheme(input.authorization);
  const bearer = parseBearerToken(input.authorization);

  if (bearerScheme && !bearer) return { kind: "conflict", reason: "EMPTY_BEARER" };
  if (bearer && cookieToken && bearer !== cookieToken) {
    return { kind: "conflict", reason: "COOKIE_BEARER_MISMATCH" };
  }
  if (bearer) return { kind: "token", token: bearer, source: "bearer" };
  if (cookieToken) return { kind: "token", token: cookieToken, source: "cookie" };
  return { kind: "none" };
}
