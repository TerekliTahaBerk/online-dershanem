/**
 * Europe/Istanbul tarih yardımcıları.
 *
 * Türkiye 2016'dan beri kalıcı UTC+3'tedir (DST yok), bu yüzden sabit ofset
 * doğrudur ve `lib/student-check-in.ts` ile aynı yaklaşımı sürdürür.
 *
 * Buradaki asıl amaç şu hatayı ortadan kaldırmak:
 *
 *     new Date().toISOString().slice(0, 10)
 *
 * Bu ifade UTC gününü verir. İstanbul'da 00:00–03:00 arası UTC hâlâ bir
 * ÖNCEKİ gündedir; tarih filtresi kullanıcıya yanlış günü gösterir. Tarih
 * input'ları her zaman `formatIstanbulDateInput` ile üretilmelidir.
 */

export const ISTANBUL_TIME_ZONE = "Europe/Istanbul";
export const ISTANBUL_UTC_OFFSET_MINUTES = 180;
const OFFSET_MS = ISTANBUL_UTC_OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Verilen anın İstanbul takvim gününü `YYYY-MM-DD` olarak döndürür. */
export function formatIstanbulDateInput(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * `YYYY-MM-DD` metnini İstanbul yerel gün başlangıcına (00:00:00.000) çevirir.
 * Biçimsel olarak geçersiz veya takvimde var olmayan tarihlerde `null` döner.
 */
export function parseIstanbulDateInput(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = DATE_INPUT_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const utcMidnight = Date.UTC(Number(year), Number(month) - 1, Number(day));
  // Date.UTC taşmayı sessizce kaydırır (2025-02-29 → 2025-03-01). Geri
  // biçimlendirip karşılaştırarak var olmayan tarihleri reddediyoruz.
  if (new Date(utcMidnight).toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return null;
  return new Date(utcMidnight - OFFSET_MS);
}

/** Verilen anın İstanbul gününün başlangıcı (00:00:00.000 +03:00). */
export function istanbulDayStart(instant: Date): Date {
  const shifted = instant.getTime() + OFFSET_MS;
  return new Date(shifted - (shifted % DAY_MS) - OFFSET_MS);
}

/** Verilen anın İstanbul gününün sonu (23:59:59.999 +03:00), dahil. */
export function istanbulDayEnd(instant: Date): Date {
  return new Date(istanbulDayStart(instant).getTime() + DAY_MS - 1);
}

/** Verilen İstanbul gününden `days` takvim günü ilerideki gün başlangıcı. */
export function addIstanbulCalendarDays(instant: Date, days: number): Date {
  return new Date(istanbulDayStart(instant).getTime() + days * DAY_MS);
}

/** Verilen anı içeren İstanbul gününün bitiş sınırı; sorgularda hariç tutulur. */
export function istanbulNextDayStart(instant: Date): Date {
  return addIstanbulCalendarDays(instant, 1);
}

/** İstanbul takvimindeki ISO hafta günü: pazartesi 1, pazar 7. */
export function istanbulIsoWeekday(instant: Date): number {
  const shifted = new Date(instant.getTime() + OFFSET_MS);
  return shifted.getUTCDay() || 7;
}

/** Verilen anın İstanbul takvim haftasının pazartesi 00:00 başlangıcı. */
export function istanbulWeekStart(instant: Date, offsetWeeks = 0): Date {
  const dayStart = istanbulDayStart(instant);
  return addIstanbulCalendarDays(dayStart, 1 - istanbulIsoWeekday(instant) + offsetWeeks * 7);
}

/** Verilen anın İstanbul takvim ayının ilk günü 00:00 başlangıcı. */
export function istanbulMonthStart(instant: Date): Date {
  const date = formatIstanbulDateInput(instant);
  return parseIstanbulDateInput(`${date.slice(0, 7)}-01`)!;
}

export type IstanbulDateRange = {
  /** Dahil — İstanbul gün başlangıcı. */
  from: Date;
  /** Dahil — İstanbul gün sonu (23:59:59.999). */
  to: Date;
  /** Kullanıcıya gösterilecek doğrulama uyarısı; sorun yoksa `null`. */
  notice: string | null;
};

export type ResolveRangeOptions = {
  from?: unknown;
  to?: unknown;
  /** Varsayılan aralık uzunluğu (gün). */
  defaultDays?: number;
  /** İzin verilen en uzun aralık (gün). */
  maxDays?: number;
  now?: Date;
};

/**
 * Rapor tarih aralığını güvenli biçimde çözümler.
 *
 * Kurallar: geçersiz girdi varsayılana düşer, `from > to` ise değerler
 * yer değiştirir, aralık `maxDays`i aşarsa bitişten geriye kırpılır.
 * Her sapma `notice` ile açıkça bildirilir — sessizce farklı bir aralık
 * raporlamak yasak.
 */
export function resolveIstanbulDateRange(options: ResolveRangeOptions = {}): IstanbulDateRange {
  const { defaultDays = 30, maxDays = 366, now = new Date() } = options;

  const parsedFrom = parseIstanbulDateInput(options.from);
  const parsedTo = parseIstanbulDateInput(options.to);
  const notices: string[] = [];

  if (options.from !== undefined && options.from !== "" && !parsedFrom) {
    notices.push("Başlangıç tarihi geçersiz; varsayılan aralık kullanıldı.");
  }
  if (options.to !== undefined && options.to !== "" && !parsedTo) {
    notices.push("Bitiş tarihi geçersiz; varsayılan aralık kullanıldı.");
  }

  let to = parsedTo ? istanbulDayEnd(parsedTo) : istanbulDayEnd(now);
  let from = parsedFrom
    ? istanbulDayStart(parsedFrom)
    : istanbulDayStart(new Date(to.getTime() - (defaultDays - 1) * DAY_MS));

  if (from > to) {
    [from, to] = [istanbulDayStart(to), istanbulDayEnd(from)];
    notices.push("Başlangıç bitişten sonraydı; tarihler yer değiştirdi.");
  }

  const spanDays = Math.round((istanbulDayStart(to).getTime() - from.getTime()) / DAY_MS) + 1;
  if (spanDays > maxDays) {
    from = istanbulDayStart(new Date(istanbulDayStart(to).getTime() - (maxDays - 1) * DAY_MS));
    notices.push(`Aralık en fazla ${maxDays} gün olabilir; başlangıç kırpıldı.`);
  }

  return { from, to, notice: notices.length ? notices.join(" ") : null };
}
