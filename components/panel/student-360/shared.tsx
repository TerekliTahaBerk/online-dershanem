/** Student 360 alt panellerinin ortak, sunuma özel yardımcıları. */
import { STUDENT_360_ATTENDANCE_LABELS } from "@/lib/panel/student-360";

export const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});
export const DAY = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Istanbul",
});
export const ATTENDANCE_LABEL = STUDENT_360_ATTENDANCE_LABELS;
export function EmptyLine({ text }: { text: string }) {
  return <p className="text-[13.5px] leading-6 text-dc-ink-muted">{text}</p>;
}
export function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-[15px] font-bold text-dc-ink">{children}</h3>;
}
