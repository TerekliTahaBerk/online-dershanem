export const OVERLOAD_OPTIONS = ["REDUCE_LIGHT", "REDUCE_HEAVY", "CHANGE_DAYS"] as const;

export type OverloadOption = (typeof OVERLOAD_OPTIONS)[number];
export type PlanChangeCategory = "TOO_MUCH" | "WRONG_DAYS" | "PRIORITY" | "OTHER";

const lowerSafeMinutesMap: Record<number, number | null> = {
  90: 60,
  60: 45,
  45: 30,
  30: 20,
  20: null,
};

export function getLowerSafeMinutes(minutesPerDay: number): number | null {
  return lowerSafeMinutesMap[minutesPerDay] ?? null;
}

export function getOverloadRequest(option: OverloadOption): {
  category: PlanChangeCategory;
  overwhelmPulse: 4 | 5;
} {
  if (option === "CHANGE_DAYS") return { category: "WRONG_DAYS", overwhelmPulse: 4 };
  if (option === "REDUCE_HEAVY") return { category: "TOO_MUCH", overwhelmPulse: 5 };
  return { category: "TOO_MUCH", overwhelmPulse: 4 };
}
