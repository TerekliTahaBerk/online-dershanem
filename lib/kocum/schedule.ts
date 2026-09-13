/**
 * Online Koçum — plan haftası / zamanlama yardımcıları.
 * Timezone: Europe/Istanbul.
 */

import {
  addIstanbulCalendarDays,
  formatIstanbulDateInput,
  istanbulWeekStart,
} from "@/lib/istanbul-time";

/** Plan haftası [weekStart, weekStart+6] içinde mi (İstanbul günü). */
export function isDateWithinPlanWeek(scheduledFor: Date, weekStart: Date): boolean {
  const start = istanbulWeekStart(weekStart);
  const end = addIstanbulCalendarDays(start, 6);
  const key = formatIstanbulDateInput(scheduledFor);
  return key >= formatIstanbulDateInput(start) && key <= formatIstanbulDateInput(end);
}

export function planWeekDateBounds(weekStart: Date): { min: string; max: string } {
  const start = istanbulWeekStart(weekStart);
  const end = addIstanbulCalendarDays(start, 6);
  return {
    min: formatIstanbulDateInput(start),
    max: formatIstanbulDateInput(end),
  };
}
