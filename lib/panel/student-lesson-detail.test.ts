import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLessonDetail } from "@/lib/mobile-contracts/student";
import { toMobileLessonDetail } from "@/lib/mobile/student-views";

import { attendancePresentation, buildStudentLessonDetailView, type StudentLessonDetailRow } from "./student-lesson-detail";

const now = new Date("2026-10-08T10:00:00.000Z");
const row = (overrides: Partial<StudentLessonDetailRow> = {}): StudentLessonDetailRow => ({
  lesson: {
    id: "l-1",
    title: "Kesirler",
    startsAt: new Date(now.getTime() + 10 * 60000),
    endsAt: new Date(now.getTime() + 70 * 60000),
    status: "PLANNED",
    meetingUrl: "https://meet.example.com/x",
    groupId: "g-1",
    group: { name: "8-A", subject: "Matematik", isActive: true },
    teacher: { fullName: "Ece Öğretmen" },
  },
  sharedNote: { topic: "Toplama", homework: null, nextGoal: "Çıkarma" },
  personalNote: "Sana özel not",
  attendance: null,
  assignments: [{ id: "a-1", title: "Çalışma", dueAt: now, done: true }],
  enrollmentActive: true,
  recoveryStatus: null,
  ...overrides,
});

test("attendancePresentation: web etiket ve tonlarıyla aynı", () => {
  assert.deepEqual(attendancePresentation("PRESENT"), { label: "Katıldın", tone: "success" });
  assert.deepEqual(attendancePresentation("LATE"), { label: "Geç katıldın", tone: "success" });
  assert.deepEqual(attendancePresentation("ABSENT"), { label: "Katılmadın", tone: "warning" });
  assert.deepEqual(attendancePresentation("EXCUSED"), { label: "Mazeretli", tone: "neutral" });
  assert.deepEqual(attendancePresentation(null), { label: "Katılım işlenmedi", tone: "neutral" });
});

test("ders detayı: katılım bağlantısı yalnız aktif kayıt + aktif grup + pencere açıkken", () => {
  assert.equal(buildStudentLessonDetailView(row(), now).join.url, "https://meet.example.com/x");
  assert.equal(buildStudentLessonDetailView(row({ enrollmentActive: false }), now).join.state, "UNAVAILABLE");
  const archived = row();
  archived.lesson.group.isActive = false;
  assert.equal(buildStudentLessonDetailView(archived, now).join.url, null);
});

test("ders detayı → mobil sözleşme: tarih ISO, ham toplantı bağlantısı pencere dışında yok", () => {
  const later = row();
  later.lesson.startsAt = new Date(now.getTime() + 5 * 3600000);
  const mobile = toMobileLessonDetail(buildStudentLessonDetailView(later, now));
  assert.equal(mobile.join.state, "NOT_YET");
  assert.equal(mobile.join.url, null);
  assert.ok(!JSON.stringify(mobile).includes("meet.example.com"), "pencere dışında bağlantı yanıtta yok");
  assert.equal(mobile.personalNote, "Sana özel not");
  const parsed = parseLessonDetail(JSON.parse(JSON.stringify(mobile)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  const open = toMobileLessonDetail(buildStudentLessonDetailView(row({ recoveryStatus: "PUBLISHED", sharedNote: null }), now));
  assert.equal(open.join.url, "https://meet.example.com/x");
  assert.deepEqual(open.recovery, { status: "PUBLISHED" });
  assert.equal(open.topic, null);
});
