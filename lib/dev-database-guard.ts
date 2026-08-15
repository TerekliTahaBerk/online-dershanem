/**
 * `next dev` yanlışlıkla CANLI veritabanına bağlanmasın.
 *
 * `.env.local` Vercel'den çekildiğinde içinde production `DATABASE_URL`
 * (Prisma Accelerate) ve `DIRECT_URL` (canlı Postgres) bulunuyor. Next,
 * `.env.local`'ı `.env`'den ÖNCE okuduğu için düz `npm run dev` sessizce
 * canlı veriye bağlanıyordu — üstelik `lib/prisma.ts` yerelde `DIRECT_URL`'i
 * tercih ettiği için Accelerate'in okuma-yazma sınırları da devrede olmuyordu.
 *
 * Bu yüzden development'ta uzak veritabanı BİLİNÇLİ onay ister:
 * `ALLOW_REMOTE_DB_IN_DEV=true`.
 *
 * Yalnızca `NODE_ENV=development` için geçerlidir; production ve test
 * çalıştırmaları etkilenmez.
 */

const LOCAL_HOST_PATTERN = /@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)[:/]/i;

export type DevDatabaseVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/** Adres yerel bir Postgres'i mi gösteriyor? Şema/soket biçimleri dahil. */
export function isLocalDatabaseUrl(url: string): boolean {
  if (!url) return false;
  // Unix soketi (`postgresql:///db?host=/tmp`) ve host'suz adresler yereldir.
  if (/^postgres(ql)?:\/\/\//.test(url)) return true;
  if (LOCAL_HOST_PATTERN.test(url)) return true;
  // Kullanıcı adı olmadan yazılmış yerel adres: postgresql://localhost:5432/db
  return /^postgres(ql)?:\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(url);
}

export function checkDevDatabase(env: Record<string, string | undefined>): DevDatabaseVerdict {
  if (env.NODE_ENV !== "development") return { ok: true };
  if (env.ALLOW_REMOTE_DB_IN_DEV === "true") return { ok: true };

  // Prisma yerelde `DIRECT_URL`'i tercih ettiği için ikisi de denetlenir.
  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const value = env[key];
    if (!value) continue;
    if (isLocalDatabaseUrl(value)) continue;
    return {
      ok: false,
      reason:
        `${key} yerel bir veritabanını göstermiyor ("${value.slice(0, 24)}…").\n` +
        "Geliştirme sunucusu canlı veriye bağlanmasın diye durduruldu.\n" +
        "Yerel bir veritabanı kullanın:\n" +
        '  export DATABASE_URL="postgresql://$(whoami)@localhost:5432/oddev?schema=public"\n' +
        '  export DIRECT_URL="$DATABASE_URL"\n' +
        "Gerçekten uzak veritabanına bağlanmak istiyorsanız ALLOW_REMOTE_DB_IN_DEV=true verin.",
    };
  }

  return { ok: true };
}
