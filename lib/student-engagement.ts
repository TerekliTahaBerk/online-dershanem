import { formatIstanbulDateInput } from "./istanbul-time";

const DAY_MS = 86_400_000;

/** Bugün ya da dünle biten, farklı takvim günlerinden oluşan gerçek çalışma serisi. */
export function completionDayStreak(completedAt: Array<Date | null>, now = new Date()): number {
  const days = new Set(completedAt.filter((value): value is Date => Boolean(value)).map(formatIstanbulDateInput));
  if (!days.size) return 0;
  const today = formatIstanbulDateInput(now);
  const yesterday = formatIstanbulDateInput(new Date(now.getTime() - DAY_MS));
  let cursor = days.has(today) ? now : days.has(yesterday) ? new Date(now.getTime() - DAY_MS) : null;
  if (!cursor) return 0;
  let streak = 0;
  while (days.has(formatIstanbulDateInput(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
