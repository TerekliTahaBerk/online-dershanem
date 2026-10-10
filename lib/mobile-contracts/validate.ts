/**
 * MOBİL SÖZLEŞME — küçük, bağımlılıksız çalışma zamanı doğrulayıcıları.
 *
 * Sunucu (Next.js) ve mobil (Expo) aynı dosyayı paketler; bu yüzden zod gibi
 * bir paket KULLANILMAZ (bkz. `scripts/check-mobile-contracts.mjs`). Amaç
 * yalnız güven sınırında yapıyı doğrulamaktır: beklenmeyen alanlar atılır,
 * eksik / yanlış tipli alan yolu ile birlikte reddedilir. İş kuralı burada
 * YAZILMAZ.
 */

import type { ContractResult } from "./bootstrap";

export class ContractError extends Error {}

/** `path` hata mesajında kullanılır, ör. `$.assignments[2].dueAt`. */
export type Validator<T> = (input: unknown, path: string) => T;
export type Infer<V> = V extends Validator<infer T> ? T : never;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function fail(path: string, expected: string): never {
  throw new ContractError(`${path}: ${expected} bekleniyordu`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const v = {
  string(): Validator<string> {
    return (input, path) => (typeof input === "string" ? input : fail(path, "metin"));
  },
  nonEmpty(): Validator<string> {
    return (input, path) => (typeof input === "string" && input.length > 0 ? input : fail(path, "boş olmayan metin"));
  },
  number(): Validator<number> {
    return (input, path) => (typeof input === "number" && Number.isFinite(input) ? input : fail(path, "sayı"));
  },
  int(min = Number.MIN_SAFE_INTEGER): Validator<number> {
    return (input, path) => (typeof input === "number" && Number.isInteger(input) && input >= min ? input : fail(path, `tam sayı (≥ ${min})`));
  },
  boolean(): Validator<boolean> {
    return (input, path) => (typeof input === "boolean" ? input : fail(path, "mantıksal değer"));
  },
  /** ISO-8601 zaman damgası (sunucu `Date` → JSON). */
  iso(): Validator<string> {
    return (input, path) => (typeof input === "string" && ISO.test(input) && !Number.isNaN(Date.parse(input)) ? input : fail(path, "ISO tarih"));
  },
  literal<const T extends string | number | boolean>(value: T): Validator<T> {
    return (input, path) => (input === value ? value : fail(path, JSON.stringify(value)));
  },
  oneOf<const T extends readonly string[]>(values: T): Validator<T[number]> {
    return (input, path) => (typeof input === "string" && (values as readonly string[]).includes(input) ? (input as T[number]) : fail(path, values.join(" | ")));
  },
  nullable<T>(inner: Validator<T>): Validator<T | null> {
    return (input, path) => (input === null ? null : inner(input, path));
  },
  /** Eski sunucu sürümünde olmayabilecek (eklemeli) alan: yoksa `fallback`. */
  optional<T>(inner: Validator<T>, fallback: T): Validator<T> {
    return (input, path) => (input === undefined ? fallback : inner(input, path));
  },
  array<T>(inner: Validator<T>): Validator<T[]> {
    return (input, path) => (Array.isArray(input) ? input.map((item, index) => inner(item, `${path}[${index}]`)) : fail(path, "dizi"));
  },
  object<S extends Record<string, Validator<unknown>>>(shape: S): Validator<{ [K in keyof S]: Infer<S[K]> }> {
    return (input, path) => {
      if (!isRecord(input)) fail(path, "nesne");
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) out[key] = shape[key](input[key], `${path}.${key}`);
      return out as { [K in keyof S]: Infer<S[K]> };
    };
  },
  /** `type` alanına göre ayrışan birleşim (ör. hedef türleri). */
  union<const K extends string, const M extends Record<string, Validator<unknown>>>(key: K, members: M): Validator<Infer<M[keyof M]>> {
    return (input, path) => {
      if (!isRecord(input)) fail(path, "nesne");
      const tag = input[key];
      const member = typeof tag === "string" && Object.prototype.hasOwnProperty.call(members, tag) ? members[tag] : undefined;
      if (!member) fail(`${path}.${key}`, Object.keys(members).join(" | "));
      return member(input, path) as Infer<M[keyof M]>;
    };
  },
};

/** Doğrulayıcıyı çalıştırır; hata fırlatmak yerine `ContractResult` döner. */
export function check<T>(validator: Validator<T>, input: unknown): ContractResult<T> {
  try {
    return { ok: true, value: validator(input, "$") };
  } catch (error) {
    if (error instanceof ContractError) return { ok: false, error: error.message };
    throw error;
  }
}
