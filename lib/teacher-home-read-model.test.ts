import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildTeacherHomeSnapshot } from "./panel/teacher-home-data";

test("öğretmen ana sayfası read-model'i canlı join yerine snapshot üretir", () => {
  const snapshot = buildTeacherHomeSnapshot({
    now: new Date("2026-08-30T09:00:00.000Z"),
    todayLessons: [
      {
        id: "lesson-1",
        startsAt: new Date("2026-08-30T06:00:00.000Z"),
        title: "Matematik",
        groupName: "10-A",
        studentCount: 12,
        hasPendingNote: true,
      },
    ],
    awaitingNotes: [
      {
        id: "lesson-2",
        startsAt: new Date("2026-08-29T07:00:00.000Z"),
        groupName: "10-A",
      },
    ],
    groups: [
      {
        id: "group-1",
        name: "10-A",
        students: [
          { id: "student-1", name: "Ayşe" },
          { id: "student-2", name: "Berk" },
        ],
      },
    ],
    attendance: [
      { studentId: "student-1", status: "ABSENT" },
      { studentId: "student-1", status: "ABSENT" },
      { studentId: "student-2", status: "PRESENT" },
    ],
    assignmentProgress: [
      { studentId: "student-2", status: "TODO" },
      { studentId: "student-2", status: "TODO" },
    ],
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.summary, "1 ders · 1 ders için not girişi bekliyor");
  assert.equal(snapshot.flags.length, 2);
  assert.equal(snapshot.flags[0].reason, "Son iki haftada 2 derse katılmadı.");
  assert.equal(snapshot.flags[1].reason, "Çalışma tamamlama oranı %0.");
  assert.equal(snapshot.todayLessons[0].hasPendingNote, true);
});

test("öğretmen ana sayfası dosyası snapshot read-model'ini kullanır", () => {
  const source = readFileSync("app/panel/ogretmen/page.tsx", "utf8");
  assert.match(source, /getOrRefreshTeacherHomeSnapshot/);
  assert.doesNotMatch(source, /attendance\.findMany/);
  assert.doesNotMatch(source, /assignmentProgress\.findMany/);
  assert.doesNotMatch(source, /group\.findMany/);
  assert.doesNotMatch(source, /lesson\.findMany/);
});
