import type { CalendarEvent } from "@/lib/ical";
import type { UnifiedCalendarEvent } from "@/lib/student-success/types";
import { calendarEventTypeLabel } from "@/lib/student-success/calendar";
import { STUDENT_SUCCESS_PRODUCT_LABELS } from "@/lib/student-success/types";

const PRODUCT_PREFIX: Record<string, string> = {
  OD: "Dershanem",
  OK: "Koçum",
  ODK: "Deneme",
};

export function unifiedEventsToIcal(events: UnifiedCalendarEvent[], includeMeetingUrl = false): CalendarEvent[] {
  return events.map((event) => {
    const prefix = event.product ? PRODUCT_PREFIX[event.product] ?? event.productLabel : event.productLabel;
    const typeLabel = calendarEventTypeLabel(event.type);
    const endsAt =
      event.endsAt ??
      new Date(event.startsAt.getTime() + (event.type === "ASSIGNMENT_DUE" ? 30 : 60) * 60000);

    return {
      id: event.id.replace(/:/g, "-"),
      title: prefix ? `[${prefix}] ${event.title}` : event.title,
      description: [typeLabel, event.description, event.productLabel].filter(Boolean).join(" · "),
      startsAt: event.startsAt,
      endsAt,
      cancelled: false,
      url: includeMeetingUrl ? event.href : null,
    };
  });
}

export function mergeIcalEvents(...groups: CalendarEvent[][]): CalendarEvent[] {
  const seen = new Set<string>();
  const merged: CalendarEvent[] = [];
  for (const group of groups) {
    for (const event of group) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      merged.push(event);
    }
  }
  return merged.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export { STUDENT_SUCCESS_PRODUCT_LABELS };
