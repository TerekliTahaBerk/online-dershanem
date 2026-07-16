import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Parola saklama ve geçici parola üretimi.
 *
 * NEDEN scrypt: Argon2id ve bcrypt yeni bir paket (çoğu zaman native derleme)
 * ister. scrypt Node çekirdeğinde, memory-hard ve OWASP'ın kabul ettiği bir
 * seçenek. Bu projede Resend dahil bağımlılıklar azaltılıyor; parola için yeni
 * paket eklemek tutarsız olurdu.
 *
 * Bu dosya YALNIZCA kriptografi bilir; kullanıcı/oturum/DB bilmez.
 *
 * DİKKAT: `node:crypto` kullandığı için bir CLIENT COMPONENT buradan hiçbir şey
 * import edemez — tek bir sabit bile webpack'te "UnhandledSchemeError" verir.
 * Client'ın ihtiyaç duyduğu kurallar `password-policy.ts` içinde.
 */

/*
 * scrypt bellek ihtiyacı = 128 * N * r bayt.
 * N=2^15, r=8  →  128 * 32768 * 8 = 32 MB
 *
 * DİKKAT: Node'un varsayılan `maxmem` sınırı 32 MB'tır ve kontrol
 * `128*N*r > maxmem` şeklindedir — yani 32 MB tam sınırda. Sınıra dayanmak
 * kırılgan olduğu için `maxmem`i açıkça iki kat veriyoruz. Bu unutulursa
 * scrypt çalışma anında exception fırlatır ve HİÇ KİMSE giriş yapamaz.
 */
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

const KEY_LEN = 64;
const SALT_LEN = 16;

/** Saklanan biçim: `scrypt$N$r$p$salt_b64$hash_b64` */
const PREFIX = "scrypt";

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, { N: n, r, p, maxmem: SCRYPT_MAXMEM }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/** Parolayı hash'ler. Dönen dize parametreleri de taşır — ileride N artırılabilsin diye. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return [PREFIX, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64"), key.toString("base64")].join("$");
}

type ParsedHash = { n: number; r: number; p: number; salt: Buffer; key: Buffer };

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return null;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  if (n <= 1 || r <= 0 || p <= 0) return null;
  // Kayıttaki parametreler saldırgan kontrolündeyse bellek patlatabilir.
  if (128 * n * r > SCRYPT_MAXMEM) return null;

  try {
    const salt = Buffer.from(parts[4], "base64");
    const key = Buffer.from(parts[5], "base64");
    if (salt.length === 0 || key.length === 0) return null;
    return { n, r, p, salt, key };
  } catch {
    return null;
  }
}

/**
 * Parolayı doğrular. Bozuk/boş kayıtta ATMAZ, `false` döner — çağıran taraf
 * "hash bozuk" ile "parola yanlış" arasında ayrım yapmamalı.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;

  try {
    const key = await derive(password, parsed.salt, parsed.n, parsed.r, parsed.p);
    if (key.length !== parsed.key.length) return false;
    return timingSafeEqual(key, parsed.key);
  } catch {
    return false;
  }
}

/** Kayıttaki parametreler güncel maliyetin altındaysa true — başarılı girişte yeniden hash'lemek için. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored);
  if (!parsed) return true;
  return parsed.n < SCRYPT_N || parsed.r < SCRYPT_R || parsed.p < SCRYPT_P;
}

/*
 * Kullanıcı bulunamadığında da gerçek bir scrypt çalıştırmak için sabit hash.
 * Aksi halde "hesap yok" yanıtı "parola yanlış"tan belirgin şekilde hızlı döner
 * ve e-posta sayımına (user enumeration) kapı açılır.
 *
 * Tembel üretilir ve bir kez hesaplanır; modül yüklenirken cold start'ı yavaşlatmaz.
 */
let dummyHashPromise: Promise<string> | null = null;
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("base64"));
  await verifyPassword(password, await dummyHashPromise);
  return false;
}

/*
 * Geçici parola alfabesi — Crockford base32.
 * I, L, O, U yok: telefonda okunurken/WhatsApp'a yazılırken 1/l/I ve 0/O
 * karışmasın. U ayrıca kazara küfür/kelime oluşmasını azaltmak için dışarıda.
 * Tam 32 karakter olduğu için `bayt % 32` modulo bias üretmez (256 = 8 × 32).
 */
const TEMP_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TEMP_GROUPS = 3;
const TEMP_GROUP_LEN = 4;

/**
 * Admin'in açtığı hesap için geçici parola: `H7KM-3PQF-9XRT`
 *
 * 12 karakter × 5 bit = 60 bit. Elle (WhatsApp/telefon) iletileceği için
 * okunabilirlik entropi kadar önemli: gruplu, karışan karakter yok.
 * Tire parolanın PARÇASIDIR — ekranda görüldüğü gibi yazılır.
 */
export function generateTemporaryPassword(): string {
  const total = TEMP_GROUPS * TEMP_GROUP_LEN;
  const bytes = randomBytes(total);
  const chars = Array.from(bytes, (b) => TEMP_ALPHABET[b % TEMP_ALPHABET.length]);
  const groups: string[] = [];
  for (let i = 0; i < TEMP_GROUPS; i++) {
    groups.push(chars.slice(i * TEMP_GROUP_LEN, (i + 1) * TEMP_GROUP_LEN).join(""));
  }
  return groups.join("-");
}
