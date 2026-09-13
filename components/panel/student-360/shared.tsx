/** Student 360 alt panellerinin ortak, sunuma özel yardımcıları. */
export const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
export const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
export const ATTENDANCE_LABEL: Record<string, string> = { PRESENT: "Katıldı", ABSENT: "Katılmadı", LATE: "Geç", EXCUSED: "İzinli" };
export function EmptyLine({ text }: { text: string }) { return <p className="text-[13.5px] leading-6 text-dc-ink-muted">{text}</p>; }
export function SectionTitle({ children }: { children: string }) { return <h3 className="text-[15px] font-bold text-dc-ink">{children}</h3>; }
