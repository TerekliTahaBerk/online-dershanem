export function odkLateEntryBand(startsAt: Date | null, startedAt: Date) {
  const minutes = startsAt ? Math.max(0, (startedAt.getTime() - startsAt.getTime()) / 60_000) : 0;
  return minutes < 1 ? "ON_TIME" as const : minutes <= 5 ? "1-5M" as const : "6M+" as const;
}

export function odkAnsweredBand(count: number) { return count <= 0 ? "0" as const : count <= 10 ? "1-10" as const : count <= 20 ? "11-20" as const : "21-40" as const; }
export function odkAttemptBand(count: number) { return count <= 0 ? "0" as const : count <= 10 ? "1-10" as const : count <= 50 ? "11-50" as const : "51+" as const; }
export function odkDurationBand(startedAt: Date, endedAt: Date) { const minutes = Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 60_000); return minutes <= 30 ? "0-30M" as const : minutes <= 60 ? "31-60M" as const : "61M+" as const; }
