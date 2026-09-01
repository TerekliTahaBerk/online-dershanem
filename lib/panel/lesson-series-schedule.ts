/**
 * Tekrarlayan ders serisi — tarih üretimi ve önizleme (timezone: Europe/Istanbul).
 *
 * Saf fonksiyonlar; Prisma'ya dokunmaz.
 */

import { ISTANBUL_TIME_ZONE, ISTANBUL_UTC_OFFSET_MINUTES } from "@/lib/istanbul-time";

export const LESSON_SERIES_TIMEZONE = ISTANBUL_TIME_ZONE;

/** ISO: 1=Pazartesi … 7=Pazar */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type LessonSeriesOccurrence = {
  startsAt: Date;
  endsAt: Date;
};

export type LessonSeriesPreviewInput = {
  /** Seri başlangıç günü (Istanbul takvim günü). */
  seriesStartsOn: Date;
  /** Yerel saat "HH:mm". */
  startsAtTime: string;
  durationMinutes: number;
  /** Boşsa yalnızca seriesStartsOn'un haftanın günü tekrarlanır. */
  weekdays: IsoWeekday[];
  /** Toplam oluşum üst sınırı (1–48). */
  totalOccurrences: number;
  /** Opsiyonel bitiş tarihi (dahil). */
  seriesEndsOn?: Date | null;
};

export type LessonSeriesPreview = {
  occurrences: LessonSeriesOccurrence[];
  count: number;
  weekdays: IsoWeekday[];
  timezone: string;
};

export class LessonSeriesScheduleError extends Error {
  code: "INVALID_TIME" | "INVALID_WEEKDAY" | "INVALID_DURATION" | "INVALID_COUNT";

  constructor(code: LessonSeriesScheduleError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

const istanbulDateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: LESSON_SERIES_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const istanbulWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: LESSON_SERIES_TIMEZONE,
  weekday: "short",
});

const WEEKDAY_MAP: Record<string, IsoWeekday> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function parseStartsAtTime(raw: string): { hour: number; minute: number } {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw.trim());
  if (!match) {
    throw new LessonSeriesScheduleError("INVALID_TIME", "Saat HH:mm formatında olmalı.");
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function istanbulIsoWeekday(date: Date): IsoWeekday {
  const key = istanbulWeekday.format(date);
  const day = WEEKDAY_MAP[key];
  if (!day) throw new LessonSeriesScheduleError("INVALID_WEEKDAY", "Haftanın günü çözülemedi.");
  return day;
}

/** Europe/Istanbul yerel takvim + saat → UTC Date (TR sabit UTC+3). */
export function istanbulLocalToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): Date {
  return new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0) -
      ISTANBUL_UTC_OFFSET_MINUTES * 60_000,
  );
}

function addCalendarDays(year: number, month: number, day: number, delta: number) {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function dateKeyParts(date: Date): { year: number; month: number; day: number } {
  const parts = istanbulDateParts.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Seri oluşumlarını üretir (çakışma kontrolü çağıran tarafta).
 */
export function previewLessonSeries(input: LessonSeriesPreviewInput): LessonSeriesPreview {
  if (input.durationMinutes < 15 || input.durationMinutes > 240) {
    throw new LessonSeriesScheduleError(
      "INVALID_DURATION",
      "Ders süresi 15–240 dakika arasında olmalı.",
    );
  }
  if (input.totalOccurrences < 1 || input.totalOccurrences > 48) {
    throw new LessonSeriesScheduleError(
      "INVALID_COUNT",
      "Toplam tekrar 1–48 arasında olmalı.",
    );
  }

  const { hour, minute } = parseStartsAtTime(input.startsAtTime);
  const startParts = dateKeyParts(input.seriesStartsOn);
  const endParts = input.seriesEndsOn ? dateKeyParts(input.seriesEndsOn) : null;

  let weekdays = [...new Set(input.weekdays)].filter((d) => d >= 1 && d <= 7).sort() as IsoWeekday[];
  if (weekdays.length === 0) {
    const anchor = istanbulLocalToUtc({ ...startParts, hour: 12, minute: 0 });
    weekdays = [istanbulIsoWeekday(anchor)];
  }

  const occurrences: LessonSeriesOccurrence[] = [];
  let cursor = { ...startParts };
  let guard = 0;

  while (occurrences.length < input.totalOccurrences && guard < 400) {
    guard += 1;
    const noon = istanbulLocalToUtc({ ...cursor, hour: 12, minute: 0 });
    const weekday = istanbulIsoWeekday(noon);
    const endExceeded =
      endParts &&
      (cursor.year > endParts.year ||
        (cursor.year === endParts.year && cursor.month > endParts.month) ||
        (cursor.year === endParts.year &&
          cursor.month === endParts.month &&
          cursor.day > endParts.day));

    if (endExceeded) break;

    const onOrAfterStart =
      cursor.year > startParts.year ||
      (cursor.year === startParts.year && cursor.month > startParts.month) ||
      (cursor.year === startParts.year &&
        cursor.month === startParts.month &&
        cursor.day >= startParts.day);

    if (onOrAfterStart && weekdays.includes(weekday)) {
      const startsAt = istanbulLocalToUtc({ ...cursor, hour, minute });
      const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);
      occurrences.push({ startsAt, endsAt });
    }

    cursor = addCalendarDays(cursor.year, cursor.month, cursor.day, 1);
  }

  return {
    occurrences,
    count: occurrences.length,
    weekdays,
    timezone: LESSON_SERIES_TIMEZONE,
  };
}

export function formatOccurrenceLabel(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: LESSON_SERIES_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
