export const OD_TIME_RANGE_VALUES = ["WEEKDAY_AFTERNOON", "WEEKDAY_EVENING", "WEEKEND_MORNING", "WEEKEND_AFTERNOON"] as const;

export const OD_TIME_RANGE_OPTIONS = [
  { value: "WEEKDAY_AFTERNOON", label: "Hafta içi 13.00–17.00" },
  { value: "WEEKDAY_EVENING", label: "Hafta içi 17.00–21.00" },
  { value: "WEEKEND_MORNING", label: "Hafta sonu 09.00–13.00" },
  { value: "WEEKEND_AFTERNOON", label: "Hafta sonu 13.00–18.00" },
] as const;

export type OdTimeRange = (typeof OD_TIME_RANGE_VALUES)[number];

export const OD_NO_SLOT_VALUES = ["CONTACT", "ALTERNATE", "WAITLIST", "REFUND"] as const;

export const OD_NO_SLOT_OPTIONS = [
  { value: "CONTACT", label: "Önce benimle iletişime geçin" },
  { value: "ALTERNATE", label: "Yakın bir alternatif saat önerin" },
  { value: "WAITLIST", label: "Uygun grup için bekleme listesine alın" },
  { value: "REFUND", label: "Alternatif istemezsem iade sürecini başlatın" },
] as const;

export type OdNoSlotPreference = (typeof OD_NO_SLOT_VALUES)[number];

export type OdPlacementExpectation = {
  capacitySignal: "OPEN_SEATS" | "LIMITED" | "WAITLIST_LIKELY" | "CHECK_REQUIRED";
  capacityLabel: string;
  expectedStartLabel: string;
  observedTimeRanges: string[];
  placementSlaLabel: string;
  checkedAt: string;
};

export type OdPlacementGroupSnapshot = {
  capacity: number;
  enrollmentCount: number;
  nextLessonAt: Date | null;
};

export function buildOdPlacementExpectation(
  groups: OdPlacementGroupSnapshot[],
  checkedAt = new Date(),
): OdPlacementExpectation {
  const openSeats = groups.reduce((sum, group) => sum + Math.max(0, group.capacity - group.enrollmentCount), 0);
  const planned = groups.flatMap((group) => group.nextLessonAt ? [group.nextLessonAt] : []);
  const capacitySignal = openSeats >= 3 ? "OPEN_SEATS" : openSeats > 0 ? "LIMITED" : groups.length ? "WAITLIST_LIKELY" : "CHECK_REQUIRED";
  const capacityLabel = capacitySignal === "OPEN_SEATS"
    ? "Aktif gruplarda olası boş yer görünüyor"
    : capacitySignal === "LIMITED"
      ? "Olası boş yer sınırlı görünüyor"
      : capacitySignal === "WAITLIST_LIKELY"
        ? "Mevcut gruplar dolu; alternatif veya bekleme listesi gerekebilir"
        : "Seviye ve saat uyumu görüşmede kontrol edilecek";
  const observed = new Set<string>();
  for (const date of planned) {
    const parts = new Intl.DateTimeFormat("tr-TR", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Istanbul" }).formatToParts(date);
    const weekday = parts.find((part) => part.type === "weekday")?.value;
    const hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;
    if (weekday && hour && minute) observed.add(`${weekday} ${hour}.${minute}`);
  }
  return {
    capacitySignal,
    capacityLabel,
    expectedStartLabel: planned.length && openSeats > 0 ? "Uyum teyidinden sonra tahminen 3–7 gün" : "Uygun grup veya alternatif netleşince paylaşılır",
    observedTimeRanges: [...observed].slice(0, 4),
    placementSlaLabel: "Ödemeden sonra 24 saat içinde ilk iletişim; 48 saat içinde yerleştirme sonucu",
    checkedAt: checkedAt.toISOString(),
  };
}

export type OdPlacementMetricTransition = { onboardingId: string; toState: string; occurredAt: Date };

export function calculateOdPlacementMetrics(transitions: OdPlacementMetricTransition[]) {
  const grouped = new Map<string, OdPlacementMetricTransition[]>();
  for (const transition of transitions) grouped.set(transition.onboardingId, [...(grouped.get(transition.onboardingId) || []), transition]);
  const firstContactHours: number[] = [];
  const placementHours: number[] = [];
  let noSlotCount = 0;
  const outcomes = { assigned: 0, alternate: 0, waitlist: 0, refund: 0 };
  for (const rows of grouped.values()) {
    const sorted = [...rows].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    const paid = sorted.find((row) => row.toState === "PAID")?.occurredAt;
    const contacted = sorted.find((row) => row.toState === "CONTACTED")?.occurredAt;
    const placement = sorted.find((row) => row.toState === "PLACEMENT_PENDING")?.occurredAt;
    const assigned = sorted.find((row) => row.toState === "GROUP_ASSIGNED")?.occurredAt;
    if (paid && contacted) firstContactHours.push((contacted.getTime() - paid.getTime()) / 3_600_000);
    if (placement && assigned) placementHours.push((assigned.getTime() - placement.getTime()) / 3_600_000);
    const states = new Set(sorted.map((row) => row.toState));
    if (states.has("ALTERNATE_SLOT_OFFERED") || states.has("WAITLISTED") || states.has("NO_SLOT_REFUND_PENDING")) noSlotCount += 1;
    if (states.has("GROUP_ASSIGNED")) outcomes.assigned += 1;
    if (states.has("ALTERNATE_SLOT_ACCEPTED")) outcomes.alternate += 1;
    if (states.has("WAITLISTED")) outcomes.waitlist += 1;
    if (states.has("NO_SLOT_REFUND_PENDING")) outcomes.refund += 1;
  }
  const average = (values: number[]) => values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
  return {
    onboardingCount: grouped.size,
    firstContactHours: average(firstContactHours),
    firstContactSample: firstContactHours.length,
    placementHours: average(placementHours),
    placementSample: placementHours.length,
    noSlotRate: grouped.size ? Math.round((noSlotCount / grouped.size) * 10_000) / 100 : null,
    outcomes,
  };
}
