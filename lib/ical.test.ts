import assert from "node:assert/strict";
import test from "node:test";
import { icalDocument, icalEscape } from "./ical";

test("iCalendar metin alanlarını güvenli biçimde kaçırır", () => {
  assert.equal(icalEscape("Matematik; tekrar, hız\nhedef"), "Matematik\\; tekrar\\, hız\\nhedef");
});

test("iCalendar UTC tarihleri, iptal durumu ve URL üretir", () => {
  const output = icalDocument([{ id: "ders-1", title: "LGS Matematik", description: "A Grubu", startsAt: new Date("2026-07-20T10:00:00Z"), endsAt: new Date("2026-07-20T11:00:00Z"), cancelled: true, url: "https://example.com/room" }], new Date("2026-07-17T08:00:00Z"));
  assert.match(output, /DTSTART:20260720T100000Z/);
  assert.match(output, /DTEND:20260720T110000Z/);
  assert.match(output, /STATUS:CANCELLED/);
  assert.match(output, /URL:https:\/\/example.com\/room/);
  assert.equal(output.endsWith("\r\n"), true);
});

test("iCalendar uzun Türkçe satırları 75 octet sınırında katlar", () => {
  const output = icalDocument([{ id: "ders-2", title: "Ç".repeat(100), description: "Uzun açıklama", startsAt: new Date("2026-07-20T10:00:00Z"), endsAt: new Date("2026-07-20T11:00:00Z") }]);
  for (const line of output.split("\r\n").filter(Boolean)) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
});
