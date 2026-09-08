/**
 * Unified calendar — saf sıralama ve birleştirme kuralları.
 */

import type { UnifiedCalendarEvent, UnifiedCalendarEventType, UnifiedTodayItem } from "./types";
import { STUDENT_SUCCESS_PRODUCT_LABELS } from "./types";

export function sortCalendarEvents(events: UnifiedCalendarEvent[]): UnifiedCalendarEvent[] {
  // Aynı dakikaya düşen iki olay (ör. aynı saatte başlayan ders ve koçluk
  // görevi) sorgu dönüş sırasına bırakılmamalı; takvim her yüklemede aynı
  // sırada çizilmeli.
  return [...events].sort((a, b) => {
    const delta = a.startsAt.getTime() - b.startsAt.getTime();
    if (delta !== 0) return delta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Aynı işi iki kez göstermeyi engeller (§21).
 *
 * Bir Dershanem ödevi OK sahibi öğrencide İKİ olay üretiyordu: ödevin kendi
 * son tarihi (`ASSIGNMENT_DUE`) ve `assignment-projection` tüketicisinin
 * haftalık plana yazdığı `COACHING_TASK`. Öğrenci "Bugün" ekranında tek bir
 * ödevi iki satır olarak görüyor, tamamlanma sayısı da iki iş gibi
 * okunuyordu.
 *
 * Ödev kaydı KORUNUR: son tarih Dershanem tarafında tek gerçek kaynaktır
 * (bkz. `WeeklyPlanTask` şema notu). Ona bağlı plan görevi düşürülür ve
 * hayatta kalan kayıt planın parçası olduğunu söyler.
 */
export function dedupeLinkedWorkItems(events: UnifiedCalendarEvent[]): UnifiedCalendarEvent[] {
  const assignmentIds = new Set(
    events.filter((e) => e.type === "ASSIGNMENT_DUE").map((e) => e.sourceId),
  );
  if (!assignmentIds.size) return events;

  const plannedAssignmentIds = new Set<string>();
  for (const event of events) {
    if (event.type !== "COACHING_TASK") continue;
    const linked = event.linkedAssignmentId;
    if (linked && assignmentIds.has(linked)) plannedAssignmentIds.add(linked);
  }
  if (!plannedAssignmentIds.size) return events;

  return events
    .filter(
      (event) =>
        !(
          event.type === "COACHING_TASK" &&
          event.linkedAssignmentId &&
          plannedAssignmentIds.has(event.linkedAssignmentId)
        ),
    )
    .map((event) =>
      event.type === "ASSIGNMENT_DUE" && plannedAssignmentIds.has(event.sourceId)
        ? { ...event, description: "Son tarih · haftalık planında" }
        : event,
    );
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
      isFlexible: event.isFlexible === true,
    });
  }

  // TAM SIRALAMA: öncelik → zaman → kimlik.
  //
  // Kimlik kırıcısı olmadan eşit öncelik ve eşit zamandaki iki öğe, kendilerini
  // üreten sorguların dönüş sırasına kalıyordu. O sıra Postgres'in planına bağlı
  // ve GARANTİ DEĞİL: aynı öğrenci sayfayı iki kez açtığında "sıradaki iş"
  // değişebiliyordu. `id` benzersiz olduğu için sıralama artık deterministik.
  return items.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const aTime = (a.startsAt ?? a.dueAt)?.getTime() ?? 0;
    const bTime = (b.startsAt ?? b.dueAt)?.getTime() ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
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
