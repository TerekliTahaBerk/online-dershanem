import assert from "node:assert/strict";
import test from "node:test";
import { parseStudent360 } from "@/lib/mobile-contracts/admin";
import type { Student360Bundle } from "@/lib/panel/student-360/dto";
import { toMobileStudent360 } from "./student-360-views";

const now = new Date("2026-10-11T08:00:00.000Z");
const at = (days: number) => new Date(now.getTime() + days * 86_400_000);
const risk = { level: "medium" as const, totalPoints: 4, whyRisky: ["2 devamsızlık"], items: [{ code: "ABSENCE" as const, points: 4, severity: "medium" as const, reason: "2 devamsızlık", suggestedAction: "Veliyi ara", detectedAt: now, status: null, ownerName: null }] };

const bundle = {
  access: { role: "ADMIN", mode: "admin", studentProfileId: "sp1", studentUserId: "u1", canViewCommerce: true, hasCoachAccess: true, groupIds: [], subjects: null, viewerUserId: "a1" },
  flags: {},
  basePath: "/panel/yonetim/ogrenciler/sp1",
  tab: "genel",
  tabs: ["genel", "dersler", "odevler", "takvim", "gelisim", "kocluk", "denemeler", "risk", "paket"],
  group: "genel",
  groups: ["genel", "ogrenme", "yon", "deneme-ligi", "etkinlik", "risk", "paket"],
  view: null,
  sections: ["genel"],
  anchor: null,
  timeline: [{ id: "t1", occurredAt: now, title: "Ders tamamlandı", summary: null, product: "OD", productLabel: "onlinedershanem.", kind: "LESSON" }],
  actions: [],
  summary: { fullName: "Ece Kaya", email: "ece@example.com", classLevel: "8", targetGoal: "LGS", products: ["OD"], productLabels: ["onlinedershanem."], groups: [{ id: "g1", name: "8-A", subject: "Matematik", teacherName: "Ali" }], coachName: null, packageStatus: "provisioning_blocked", lastActivityAt: now, risk },
  overview: { weekAttendancePresent: 2, weekAttendanceTotal: 3, completedAssignments: 1, assignmentTotal: 4, planCompletionPercent: null, recentExams: [{ id: "e1", title: "LGS-1", takenAt: now, totalNet: 61.5 }], activeRiskReasons: ["2 devamsızlık"], upcomingLessons: [{ id: "l1", title: "Kesirler", startsAt: at(1) }], openInterventions: [{ id: "c1", reason: "Gecikme", status: "OPEN", dueAt: at(1) }], openHelpRequests: 1, nearestOdkExamTitle: "Deneme Ligi 3" },
  academic: { subjectPerformance: [{ subject: "Matematik", avgNet: 14, sampleSize: 3 }], outcomeHints: [{ title: "Kesir", subject: "Matematik", type: "Tekrar" }], assignmentHistory: [], reviewDueCount: 2, evidenceCount: 5, unifiedOutcomes: [{ outcomeId: "o1", code: "M.8.1", title: "Üslü ifadeler", subjectName: "Matematik", unitName: "Sayılar", status: "PRACTICING", statusLabel: "Çalışılıyor", evidence: { lesson: null, assignment: null, mockExam: null, coaching: null }, explanation: [{ source: "lesson", detail: "Derste işlendi" }] }] },
  lessons: { past: [{ id: "l0", title: "Oranlar", startsAt: at(-2), attendance: "LATE", note: "Geç katıldı" }], upcoming: [{ id: "l1", title: "Kesirler", startsAt: at(1), groupName: "8-A" }], recoveryOpenCount: 1 },
  assignmentsTab: { items: [{ id: "a1", title: "Çalışma 1", status: "NOT_STARTED", dueAt: at(-1), groupName: "8-A" }, { id: "a2", title: "Çalışma 2", status: "DONE", dueAt: null, groupName: "8-A" }] },
  teachersTab: { links: [{ id: "tl1", subject: "Fen", teacherId: "t2", teacherName: "Ayşe", startedAt: at(-30) }] },
  coaching: { coachName: "Mert", cadenceDays: 7, overdue: true, sharedNote: "Odak: düzen", focus: "Matematik", goals: [{ id: "g1", label: "Net", target: 70, current: 61 }], checkIns: [{ id: "ci1", createdAt: now, energy: "MEDIUM", barrier: "TIME", shared: true }], plan: { weekStart: at(-3), status: "APPROVED", completionPercent: 40, tasks: [{ id: "pt1", title: "Deneme çöz", status: "DONE", scheduledFor: at(-1) }] }, feedbackCategory: null, timeline: [] },
  exams: { recent: [{ id: "e1", exam: "LGS", takenAt: now, totalNet: 61.5, sections: [{ subject: "Matematik", net: 14 }] }], netDelta: -2.5, subjectDeltas: [{ subject: "Matematik", delta: null }], recurringGaps: ["Geometri"] },
  riskTab: { summary: risk, cases: [{ id: "c1", reasonCode: "OVERDUE_WORK", explanation: "Gecikme", suggestedAction: "Görüş", status: "OPEN", dueAt: at(1), ownerName: null, createdAt: now }] },
  parent: { parents: [{ linkId: "ps1", id: "p1", fullName: "Ayşe Kaya", email: "a@example.com", relationship: null }], digests: [{ id: "d1", weekStart: at(-7), status: "PUBLISHED", publishedAt: now, trendBand: "STABLE", supportArea: "Matematik" }] },
  commerce: { memberships: [{ product: "OD", label: "onlinedershanem.", expiresAt: null }], orders: [{ id: "o1", packageName: "LGS Paketi", status: "PAID", provisioningStatus: "MANUAL_REVIEW", provisioningError: "Veli eksik", createdAt: now, totalCents: 150000 }], packageStatus: "provisioning_blocked" },
  coachOptions: [{ id: "cp1", label: "Mert (2/10)" }],
  parentOptions: [],
  teacherOptions: [],
  currentCoachId: null,
  currentCadenceDays: null,
} as unknown as Student360Bundle;

test("öğrenci 360: tüm bölümler kart olarak sözleşmeye uyar; etiketler web sözlüklerinden", () => {
  const view = toMobileStudent360(bundle, now);
  const parsed = parseStudent360(JSON.parse(JSON.stringify(view)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  assert.deepEqual(view.cards.map((item) => item.id), ["overview", "academic", "lessons", "assignments", "teachers", "coaching", "exams", "risk", "parent", "commerce", "timeline"]);
  assert.equal(view.summary.packageStatus.label, "Erişim açılışı bekliyor");
  assert.equal(view.summary.risk.tone, "warning");
  assert.deepEqual(view.blockedOrders, [{ id: "o1", packageName: "LGS Paketi" }]);
  const lessons = view.cards.find((item) => item.id === "lessons")!;
  assert.match(lessons.rows.find((item) => item.title === "Oranlar")!.subtitle ?? "", /Geç$/);
  const assignments = view.cards.find((item) => item.id === "assignments")!;
  assert.equal(assignments.rows[0].badge?.tone, "critical", "süresi geçmiş ödev web'deki gibi kritik");
  assert.equal(view.views.length, 0, "alt görünümler yalnız Öğrenme sekmesinde");
  assert.deepEqual(view.manage?.parents, [{ id: "ps1", name: "Ayşe Kaya", detail: "a@example.com" }], "kaldırma veli bağlantı kimliğiyle");
  assert.deepEqual(view.manage?.teachers, [{ id: "tl1", name: "Ayşe", subject: "Fen" }]);
  const teacherView = toMobileStudent360({ ...bundle, access: { ...bundle.access, role: "TEACHER" } } as unknown as Student360Bundle, now);
  assert.equal(teacherView.manage, null, "bağlantı yönetimi yalnız yöneticide (web canManage)");
});

test("öğrenci 360: Öğrenme sekmesinde alt görünümler; boş bölüm açık boş metni", () => {
  const view = toMobileStudent360({ ...bundle, group: "ogrenme", view: "odevler", assignmentsTab: { items: [] } } as unknown as Student360Bundle, now);
  assert.deepEqual(view.views.map((item) => item.id), ["dersler", "odevler", "takvim", "gelisim"]);
  assert.equal(view.cards.find((item) => item.id === "assignments")?.empty, "Ödev yok.");
});
