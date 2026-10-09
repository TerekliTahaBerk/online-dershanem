/**
 * Platform takvimi Europe/Istanbul'dadır (web `lib/istanbul-time.ts`). Cihaz
 * başka bir saat diliminde olsa da ders / teslim saatleri İstanbul saatiyle
 * gösterilir — web ile aynı saat, aynı gün.
 */
export const ISTANBUL_TIME_ZONE = 'Europe/Istanbul';

const formatters = {
  time: new Intl.DateTimeFormat('tr-TR', { timeZone: ISTANBUL_TIME_ZONE, hour: '2-digit', minute: '2-digit' }),
  dayMonth: new Intl.DateTimeFormat('tr-TR', { timeZone: ISTANBUL_TIME_ZONE, day: 'numeric', month: 'long' }),
  weekdayDayMonth: new Intl.DateTimeFormat('tr-TR', { timeZone: ISTANBUL_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' }),
  dateTime: new Intl.DateTimeFormat('tr-TR', { timeZone: ISTANBUL_TIME_ZONE, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
  shortWeekdayTime: new Intl.DateTimeFormat('tr-TR', { timeZone: ISTANBUL_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  dateKey: new Intl.DateTimeFormat('en-CA', { timeZone: ISTANBUL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }),
  hour: new Intl.DateTimeFormat('en-US', { timeZone: ISTANBUL_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }),
};

const asDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

export const formatTime = (value: string | Date) => formatters.time.format(asDate(value));
export const formatDayMonth = (value: string | Date) => formatters.dayMonth.format(asDate(value));
export const formatLongDate = (value: string | Date) => formatters.weekdayDayMonth.format(asDate(value));
export const formatDateTime = (value: string | Date) => formatters.dateTime.format(asDate(value));
export const formatShortDateTime = (value: string | Date) => formatters.shortWeekdayTime.format(asDate(value));

/** İstanbul takvim günü anahtarı (YYYY-MM-DD). */
export const istanbulDateKey = (value: string | Date) => formatters.dateKey.format(asDate(value));

export function isSameIstanbulDay(left: string | Date, right: string | Date): boolean {
  return istanbulDateKey(left) === istanbulDateKey(right);
}

/** Web ana sayfasıyla aynı selamlama eşikleri (`app/panel/ogrenci/page.tsx`). */
export function greetingFor(now: Date): string {
  const hour = Number(formatters.hour.format(now));
  if (hour < 11) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}
