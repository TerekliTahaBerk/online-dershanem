/**
 * Unified calendar — saf sıralama ve birleştirme kuralları.
 */

import type { UnifiedCalendarEvent, UnifiedCalendarEventType, UnifiedTodayItem } from "./types";
import { STUDENT_SUCCESS_PRODUCT_LABELS } from "./types";

export function sortCalendarEvents(events: UnifiedCalendarEvent[]): UnifiedCalendarEvent[] {
  return [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function calendarEventTypeLabel(type: UnifiedCalendarEventType): string {
  return {
    LESSON: "Ders",
    ASSIGNMENT_DUE: "Ödev",
    COACHING_TASK: "Plan görevi",
    MOCK_EXAM: "Deneme",
    COACHING_SESSION: "Koçluk oturumu",
    OTHER: "Diğer",
  }[type];
}

const TODAY_PRIORITY: Record<UnifiedCalendarEventType, number> = {
  MOCK_EXAM: 100,
  LESSON: 90,
  ASSIGNMENT_DUE: 80,
  COACHING_TASK: 70,
  COACHING_SESSION: 65,
  OTHER: 50,
};

export function buildTodayItems(
  events: UnifiedCalendarEvent[],
  now: Date,
  dayStart: Date,
  dayEnd: Date,
): UnifiedTodayItem[] {
  const items: UnifiedTodayItem[] = [];

  for (const event of events) {
    const inToday =
      (event.startsAt >= dayStart && event.startsAt < dayEnd) ||
      (event.type === "ASSIGNMENT_DUE" && event.startsAt <= dayEnd);
    if (!inToday) continue;

    items.push({
      id: event.id,
      kind: event.type,
      product: event.product,
      productLabel: event.product ? STUDENT_SUCCESS_PRODUCT_LABELS[event.product] : event.productLabel,
      title: event.title,
      subtitle: event.description,
      startsAt: event.type !== "ASSIGNMENT_DUE" ? event.startsAt : null,
      dueAt: event.type === "ASSIGNMENT_DUE" ? event.startsAt : event.endsAt,
      priority: TODAY_PRIORITY[event.type],
      href: event.href,
      sourceExplanation: null,
    });
  }

  return items.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const aTime = (a.startsAt ?? a.dueAt)?.getTime() ?? 0;
    const bTime = (b.startsAt ?? b.dueAt)?.getTime() ?? 0;
    return aTime - bTime;
  });
}

export function whatNextItem(items: UnifiedTodayItem[]): UnifiedTodayItem | null {
  return items[0] ?? null;
}

export function filterCalendarByInclude(
  events: UnifiedCalendarEvent[],
  include: Array<"lessons" | "assignments" | "coachingTasks" | "mockExams" | "coachingSessions">,
): UnifiedCalendarEvent[] {
  const typeMap: Record<string, UnifiedCalendarEventType> = {
    lessons: "LESSON",
    assignments: "ASSIGNMENT_DUE",
    coachingTasks: "COACHING_TASK",
    mockExams: "MOCK_EXAM",
    coachingSessions: "COACHING_SESSION",
  };
  const allowed = new Set(include.map((key) => typeMap[key]));
  return events.filter((event) => allowed.has(event.type));
}
