export const LESSON_REMINDER_WINDOWS = [{ category: "T24", hours: 24 }, { category: "T1", hours: 1 }] as const;
export function lessonReminderRange(now: Date, hours: number) {
  const end = new Date(now.getTime() + hours * 3_600_000);
  return { gt: new Date(end.getTime() - 15 * 60_000), lte: end };
}
