export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  cancelled?: boolean;
  url?: string | null;
};

export function icalEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function icalDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** RFC 5545 satırlarını UTF-8 olarak en fazla 75 octet olacak biçimde katlar. */
function foldLine(line: string): string {
  const lines: string[] = [];
  let current = "";
  for (const character of line) {
    if (Buffer.byteLength(current + character, "utf8") > 75) {
      lines.push(current);
      current = ` ${character}`;
    } else {
      current += character;
    }
  }
  lines.push(current);
  return lines.join("\r\n");
}

export function icalDocument(events: CalendarEvent[], generatedAt = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Online Dershanem//Ders Programi//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Online Dershanem Ders Programı",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${icalEscape(event.id)}@onlinedershanem.com`,
      `DTSTAMP:${icalDate(generatedAt)}`,
      `DTSTART:${icalDate(event.startsAt)}`,
      `DTEND:${icalDate(event.endsAt)}`,
      `SUMMARY:${icalEscape(event.title)}`,
      `DESCRIPTION:${icalEscape(event.description)}`,
      `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      ...(event.url ? [`URL:${icalEscape(event.url)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
