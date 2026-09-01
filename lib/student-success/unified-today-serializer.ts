/**
 * Unified Today — API/UI için serileştirme yardımcıları.
 */

import { buildTodayItems, whatNextItem } from "@/lib/student-success/calendar";
import type { UnifiedCalendarEvent, UnifiedTodayItem } from "@/lib/student-success/types";

export type SerializedUnifiedTodayItem = {
  id: string;
  kind: UnifiedTodayItem["kind"];
  product: UnifiedTodayItem["product"];
  productLabel: string;
  title: string;
  subtitle: string | null;
  startsAt: string | null;
  dueAt: string | null;
  priority: number;
  href: string | null;
  timeLabel: string | null;
};

export function serializeUnifiedTodayItem(item: UnifiedTodayItem): SerializedUnifiedTodayItem {
  const timeSource = item.startsAt ?? item.dueAt;
  return {
    id: item.id,
    kind: item.kind,
    product: item.product,
    productLabel: item.productLabel,
    title: item.title,
    subtitle: item.subtitle,
    startsAt: item.startsAt?.toISOString() ?? null,
    dueAt: item.dueAt?.toISOString() ?? null,
    priority: item.priority,
    href: item.href,
    timeLabel: timeSource
      ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(timeSource)
      : null,
  };
}

export function buildSerializedUnifiedToday(input: {
  events: UnifiedCalendarEvent[];
  now: Date;
  dayStart: Date;
  dayEnd: Date;
}): {
  items: SerializedUnifiedTodayItem[];
  whatNext: SerializedUnifiedTodayItem | null;
} {
  const items = buildTodayItems(input.events, input.now, input.dayStart, input.dayEnd);
  const next = whatNextItem(items);
  return {
    items: items.map(serializeUnifiedTodayItem),
    whatNext: next ? serializeUnifiedTodayItem(next) : null,
  };
}

/** Mobil uyumluluk — legacy today shape. */
export function legacyTodayFromUnified(items: SerializedUnifiedTodayItem[]): {
  lessons: Array<{ id: string; startsAt: string; title: string; teacherName: string | null; groupName: string }>;
  tasks: Array<{ id: string; title: string; durationMinutes: number; scheduledFor: string }>;
  assignments: Array<{ id: string; title: string; dueAt: string }>;
  mockExams: Array<{ id: string; title: string; startsAt: string }>;
} {
  const lessons: Array<{ id: string; startsAt: string; title: string; teacherName: string | null; groupName: string }> = [];
  const tasks: Array<{ id: string; title: string; durationMinutes: number; scheduledFor: string }> = [];
  const assignments: Array<{ id: string; title: string; dueAt: string }> = [];
  const mockExams: Array<{ id: string; title: string; startsAt: string }> = [];

  for (const item of items) {
    if (item.kind === "LESSON" && item.startsAt) {
      lessons.push({
        id: item.id,
        startsAt: item.startsAt,
        title: item.title,
        teacherName: null,
        groupName: item.productLabel,
      });
    }
    if (item.kind === "COACHING_TASK" && item.startsAt) {
      tasks.push({
        id: item.id,
        title: item.title,
        durationMinutes: 30,
        scheduledFor: item.startsAt,
      });
    }
    if (item.kind === "ASSIGNMENT_DUE" && item.dueAt) {
      assignments.push({ id: item.id, title: item.title, dueAt: item.dueAt });
    }
    if (item.kind === "MOCK_EXAM" && item.startsAt) {
      mockExams.push({ id: item.id, title: item.title, startsAt: item.startsAt });
    }
  }

  return { lessons, tasks, assignments, mockExams };
}
