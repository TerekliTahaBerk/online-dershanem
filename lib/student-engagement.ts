const DAY_MS = 86_400_000;

function dayKey(value: Date, timeZone = "Europe/Istanbul"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

/** Bugün ya da dünle biten, farklı takvim günlerinden oluşan gerçek çalışma serisi. */
export function completionDayStreak(completedAt: Array<Date | null>, now = new Date(), timeZone = "Europe/Istanbul"): number {
  const days = new Set(completedAt.filter((value): value is Date => Boolean(value)).map((value) => dayKey(value, timeZone)));
  if (!days.size) return 0;
  const today = dayKey(now, timeZone);
  const yesterday = dayKey(new Date(now.getTime() - DAY_MS), timeZone);
  let cursor = days.has(today) ? now : days.has(yesterday) ? new Date(now.getTime() - DAY_MS) : null;
  if (!cursor) return 0;
  let streak = 0;
  while (days.has(dayKey(cursor, timeZone))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
