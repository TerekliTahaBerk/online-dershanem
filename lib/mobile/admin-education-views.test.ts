import assert from "node:assert/strict";
import test from "node:test";
import { parseEducation, parseGroup360 } from "@/lib/mobile-contracts/admin-education";
import type { loadEducationManagement } from "@/lib/panel/education-management-server";
import type { Group360Bundle } from "@/lib/panel/group-360-server";
import { toMobileEducation, toMobileGroup360 } from "./admin-education-views";

const at = new Date("2026-10-11T09:00:00.000Z");
const bundle = {
  revision: 'a'.repeat(64), targetGroups: [],
  tab: "ogrenciler", summary: { id: "g1", name: "8-A", subject: "Matematik", level: "8", isActive: true, capacity: 10, activeStudentCount: 1, weeklyLessonCount: 2, teacher: { name: "Ada" }, ops: { label: "İzle", whyAttention: ["Program çakışması"] } },
  overview: null, program: null, history: null, opsTab: null,
  students: { members: [{ studentId: "s1", userId: "u1", name: "Ece", email: "ece@example.com", packages: ["OD"], attendanceRate: 75, riskLabel: "Orta", enrolledAt: at, lastActivityAt: null }] },
} as unknown as Group360Bundle;

test("Grup 360: üye öğrenci profili kimliğiyle açılır; sunucunun risk ve katılım değerleri korunur", () => {
  const result = toMobileGroup360(bundle);
  assert.ok(parseGroup360(result).ok);
  assert.equal(result.sections[0].rows[0].studentId, "s1");
  assert.match(result.sections[0].rows[0].detail, /Orta · Katılım %75/);
  assert.deepEqual(result.reasons, ["Program çakışması"]);
  assert.equal(parseGroup360({ ...result, tab: "bilinmeyen" }).ok, false);
  assert.equal(parseGroup360({ ...result, filled: -1 }).ok, false);
});

test("Grup programı: seri, süre ve iki çakışan dersin zamanı kaybolmaz", () => {
  const result = toMobileGroup360({ ...bundle, tab: "program", students: null, program: { weekly: [{ id: "l1", title: "Oran", startsAt: at, endsAt: at, teacherName: "Ada", durationMinutes: 40, seriesId: "series1" }], series: [{ id: "series1", title: "Pazar", teacherName: "Ada", isActive: true, upcomingCount: 4 }], conflicts: [{ kind: "STUDENT", lessonId: "l1", lessonTitle: "Oran", startsAt: at, otherLessonId: "l2", otherLessonTitle: "Fen", otherStartsAt: at, studentName: "Ece" }] } });
  assert.ok(parseGroup360(result).ok);
  assert.equal(result.sections[0].rows[0].at, at.toISOString());
  assert.match(result.sections[0].rows[0].detail, /40 dk · Seri ders/);
  assert.match(result.sections[2].rows[0].detail, /Öğrenci çakışması · Ece · Diğer ders:/);
});

test("Eğitim: arşiv gruplar korunur; ödev özeti web ile aynı durum hesabını kullanır", () => {
  const data = { teachersRaw: [], groupsRaw: [{ id: "g1", name: "8-A", subject: "Matematik", level: null, isActive: false, teacher: { fullName: null, email: "ada@example.com" }, capacity: 10, enrollments: [] }], lessons: [], assignments: [{ id: "a1", groupId: "g1", group: { name: "8-A" }, title: "Oran", isActive: true, dueAt: at, progress: [{ status: "DONE" }, { status: "TODO" }] }], materials: [] } as unknown as Awaited<ReturnType<typeof loadEducationManagement>>;
  const result = toMobileEducation(data);
  assert.ok(parseEducation(result).ok);
  assert.equal(result.groups[0].active, false);
  assert.equal(result.groups[0].teacherName, "ada@example.com");
  assert.match(result.sections[1].rows[0].detail, /1\/2 tamamlandı/);
  assert.equal(parseEducation({ ...result, contractVersion: 99 }).ok, false);
});

test("Grup 360: genel, geçmiş ve operasyon bölümleri sözleşmeye uyar", () => {
  const result = toMobileGroup360({ ...bundle, tab: "operasyon", students: null,
    overview: { upcomingLessons: [{ id: "l1", title: "Oran", startsAt: at, teacherName: "Ada", status: "PLANNED" }], capacity: { active: 1, capacity: 10, available: 9 }, issues: [], seriesCount: 2, assignmentCount: 3 },
    history: { completed: [{ id: "l2", title: "Geometri", startsAt: at, attendancePresent: 1, attendanceTotal: 2 }], cancelled: [{ id: "l3", title: "Fen", startsAt: at }], rescheduledHintCount: 0, attendanceRate: null },
    opsTab: { issues: [{ code: "CAPACITY_FULL", title: "Dolu", description: "Kontenjan yok", severity: "warning" }], unresolvedConflicts: [], teachers: [], meta: { name: "8-A", subject: "Matematik", level: "8", teacherId: "t1", isActive: true } },
  });
  assert.ok(parseGroup360(result).ok);
  assert.match(result.sections.find((section) => section.id === "upcoming")!.rows[0].detail, /Planlandı/);
  assert.match(result.sections.find((section) => section.id === "completed")!.rows[0].detail, /1\/2 katılım/);
  assert.equal(result.sections.find((section) => section.id === "attendance")!.rows[0].title, "Katılım verisi yok");
  assert.equal(result.sections.find((section) => section.id === "issues")!.rows[0].detail, "Kontenjan yok");
});
