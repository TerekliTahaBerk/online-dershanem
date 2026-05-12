import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const opts = { locale: tr } as const;

export function fmtDay(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  if (isToday(d)) return "Bugün";
  if (isTomorrow(d)) return "Yarın";
  return format(d, "d MMM EEE", opts);
}

export function fmtTime(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "HH:mm", opts);
}

export function fmtRelative(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return formatDistanceToNowStrict(d, { addSuffix: true, ...opts });
}

export function fmtFull(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "d MMMM yyyy, HH:mm", opts);
}
