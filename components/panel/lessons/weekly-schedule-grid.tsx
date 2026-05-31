import Link from "next/link";
import type { LessonStatus } from "@prisma/client";

/**
 * WeeklyScheduleGrid — Stage 3A "Apple-light" weekly schedule view.
 *
 * Pure server component. Takes already-loaded lessons + a Monday-anchored
 * weekStart and lays them out as pastel event blocks across a Mon..Sun grid.
 * Keeps all business logic in the calling page (filters, action buttons).
 *
 * Visual classes are defined in the PANEL REDESIGN v2 block of globals.css.
 */

export type WeeklyLesson = {
  id: string;
  scheduledAt: Date;
  duration: number;
  title?: string | null;
  subject?: string | null;
  status: LessonStatus;
  course?: { title: string } | null;
  teacher?: { fullName: string } | null;
  student?: { fullName: string } | null;
  classroom?: { name: string } | null;
  location?: string | null;
};

type Tone = "lavender" | "mint" | "sky" | "yellow" | "blush";

function toneFor(status: LessonStatus): Tone {
  switch (status) {
    case "LIVE":      return "sky";
    case "ENDED":
    case "COMPLETED": return "mint";
    case "MISSED":    return "yellow";
    case "CANCELLED": return "blush";
    case "SCHEDULED":
    default:          return "lavender";
  }
}

function statusLabel(status: LessonStatus): string {
  switch (status) {
    case "SCHEDULED": return "Planlandı";
    case "LIVE":      return "Canlı";
    case "ENDED":     return "Bitti";
    case "COMPLETED": return "Bitti";
    case "MISSED":    return "Kaçırıldı";
    case "CANCELLED": return "İptal";
    default:          return String(status);
  }
}

/** Returns the Monday 00:00 of the ISO week containing `d`. */
export function startOfIsoWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = (out.getDay() + 6) % 7; // 0=Mon..6=Sun
  out.setDate(out.getDate() - dow);
  return out;
}

const TR_WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const TR_WEEKDAYS_FULL = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const fmtDayMonth = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

export function weekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  if (sameMonth && sameYear) {
    const fmtDay = new Intl.DateTimeFormat("tr-TR", { day: "numeric" });
    const fmtMonthYear = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
    return `${fmtDay.format(weekStart)}–${fmtDay.format(end)} ${fmtMonthYear.format(end)}`;
  }
  return `${fmtDayMonth.format(weekStart)} – ${fmtDayMonth.format(end)} ${end.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

type Props = {
  lessons: WeeklyLesson[];
  /** Monday 00:00 anchor of the week. */
  weekStart: Date;
  /** Optional href for the whole event block (detail page). */
  hrefForLesson?: (l: WeeklyLesson) => string | null | undefined;
  /** Extra label line above the title (e.g., child name on parent panel). */
  secondaryFor?: (l: WeeklyLesson) => string | null | undefined;
  /** Optional inline action(s) shown at the bottom of each event card. */
  actionsFor?: (l: WeeklyLesson) => React.ReactNode;
  /** If provided, replaces the default "no lessons this week" CTA. */
  emptyCta?: React.ReactNode;
};

const ROW_PX = 60; // 1 hour = 60px = 1px per minute
const MIN_GRID_HOUR = 8;
const MAX_GRID_HOUR = 21;

export function WeeklyScheduleGrid({
  lessons,
  weekStart,
  hrefForLesson,
  secondaryFor,
  actionsFor,
  emptyCta,
}: Props) {
  // Bucket lessons per weekday (0=Mon..6=Sun) within this week.
  const byDay: WeeklyLesson[][] = [[], [], [], [], [], [], []];
  let minHour = MIN_GRID_HOUR;
  let maxHour = MAX_GRID_HOUR;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  for (const l of lessons) {
    if (l.scheduledAt < weekStart || l.scheduledAt >= weekEnd) continue;
    const dow = (l.scheduledAt.getDay() + 6) % 7;
    byDay[dow].push(l);
    const h = l.scheduledAt.getHours();
    const endMin = l.scheduledAt.getHours() * 60 + l.scheduledAt.getMinutes() + l.duration;
    minHour = Math.min(minHour, h);
    maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
  }

  // Clamp & ensure at least the default visible range.
  minHour = Math.max(0, Math.min(minHour, MIN_GRID_HOUR));
  maxHour = Math.min(24, Math.max(maxHour, MAX_GRID_HOUR));
  const hourCount = Math.max(1, maxHour - minHour);
  const gridHeight = hourCount * ROW_PX;

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const totalThisWeek = byDay.reduce((acc, arr) => acc + arr.length, 0);

  if (totalThisWeek === 0) {
    return (
      <div className="od-week-empty">
        <div className="od-week-empty-ico" aria-hidden="true">📅</div>
        <div className="od-week-empty-title">Bu hafta planlanmış ders yok</div>
        <div className="od-week-empty-desc">Yeni bir ders planlamak için sağdaki butonu kullanın.</div>
        {emptyCta ? <div className="od-week-empty-cta">{emptyCta}</div> : null}
      </div>
    );
  }

  return (
    <div className="od-week" role="grid" aria-label="Haftalık ders programı">
      {/* Header row: time-col spacer + 7 day headers */}
      <div className="od-week-head">
        <div className="od-week-time-col" aria-hidden="true" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div
              key={i}
              className={`od-week-day-head${isToday ? " is-today" : ""}`}
              role="columnheader"
            >
              <span className="od-week-day-name">{TR_WEEKDAYS_FULL[i]}</span>
              <span className="od-week-day-num">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* Body: time labels column + 7 day columns */}
      <div
        className="od-week-body"
        style={{ height: `${gridHeight}px` }}
      >
        <div className="od-week-time-col">
          {Array.from({ length: hourCount }, (_, i) => {
            const h = minHour + i;
            const label = `${String(h).padStart(2, "0")}:00`;
            return (
              <div
                key={i}
                className="od-week-time-label"
                style={{ top: `${i * ROW_PX}px` }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {byDay.map((dayLessons, di) => {
          const isToday = isSameDay(days[di], today);
          // Hour grid lines as a repeating background.
          const bg = `repeating-linear-gradient(to bottom, transparent 0 ${ROW_PX - 1}px, #F1EFEA ${ROW_PX - 1}px ${ROW_PX}px)`;
          return (
            <div
              key={di}
              className={`od-week-day-col${isToday ? " is-today" : ""}`}
              style={{ backgroundImage: bg, height: `${gridHeight}px` }}
              role="gridcell"
              aria-label={TR_WEEKDAYS_FULL[di]}
            >
              {dayLessons.map((l) => {
                const startMin = l.scheduledAt.getHours() * 60 + l.scheduledAt.getMinutes() - minHour * 60;
                const top = startMin; // 1px = 1min
                const height = Math.max(36, l.duration); // ensure readable
                const tone = toneFor(l.status);
                const endTime = new Date(l.scheduledAt.getTime() + l.duration * 60000);
                const timeRange = `${fmtTime.format(l.scheduledAt)} – ${fmtTime.format(endTime)}`;
                const title = l.course?.title ?? l.title ?? l.subject ?? "Ders";
                const target =
                  l.classroom?.name ??
                  l.student?.fullName ??
                  l.location ??
                  null;
                const teacher = l.teacher?.fullName ?? null;
                const href = hrefForLesson?.(l);
                const secondary = secondaryFor?.(l);
                const actions = actionsFor?.(l);

                const card = (
                  <div className={`pastel-event-card tone-${tone} od-week-event-card`}>
                    {secondary ? <div className="od-week-event-secondary">{secondary}</div> : null}
                    <div className="ev-title" title={title}>{title}</div>
                    <div className="ev-time">{timeRange}</div>
                    {target ? <div className="od-week-event-meta">{target}</div> : null}
                    {teacher ? <div className="od-week-event-meta">{teacher}</div> : null}
                    <div className="od-week-event-foot">
                      <span className={`soft-pill is-${tone}`}>{statusLabel(l.status)}</span>
                      {actions ? <span className="od-week-event-actions">{actions}</span> : null}
                    </div>
                  </div>
                );

                return (
                  <div
                    key={l.id}
                    className="od-week-event"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    {href ? (
                      <Link href={href} className="od-week-event-link">
                        {card}
                      </Link>
                    ) : (
                      card
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
