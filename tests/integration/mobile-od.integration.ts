import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before } from "node:test";

import { prisma as db } from "@/lib/prisma";
import { loadOdHome } from "@/lib/mobile/od-home-server";
import { parseInsights, parseOdHome, parseRecovery, parseReviewQueue, parseWeeklyDigest } from "@/lib/mobile-contracts/student";
import { loadStudentRecoveryPackages, loadStudentReviewQueue, loadStudentWeeklyDigest } from "@/lib/panel/student-review-recovery-server";
import { loadMobileInsights } from "@/lib/mobile/student-read-server";
import { loadStudentProgressInsight } from "@/lib/progress-insights/server";
import { toMobileLessonDetail, toMobileRecovery, toMobileReviewQueue, toMobileWeeklyDigest } from "@/lib/mobile/student-views";
import { loadStudentLessonDetail } from "@/lib/panel/student-lesson-detail-server";
import { integration } from "./integration-utils";

/**
 * M2 — mobil OD öğrenci okuma modelleri. Gerçek Postgres; sahte DB yok.
 * Rota katmanı (Bearer, ürün kapısı, HTTP kodları) ayrıca
 * `tests/e2e/mobile-api.spec.ts` ile gerçek sunucuya karşı doğrulanır.
 */

const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";
const createdUserIds: string[] = [];
const ENV_KEYS = ["PANEL_ROLLOUT_MODE", "PANEL_PILOT_KILL_SWITCH", "PANEL_FEATURE_REVIEW_QUEUE", "PANEL_FEATURE_RECOVERY_PACKAGE", "PANEL_FEATURE_PROGRESS_INSIGHTS", "PANEL_FEATURE_PARENT_WEEKLY_DIGEST"] as const;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

before(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

after(async () => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  const ids = createdUserIds;
  const profiles = await db.studentProfile.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  const profileIds = profiles.map((row) => row.id);
  await db.recoveryPackage.deleteMany({ where: { studentId: { in: profileIds } } });
  await db.reviewItem.deleteMany({ where: { studentId: { in: profileIds } } });
  await db.weeklyDigest.deleteMany({ where: { studentId: { in: profileIds } } });
  await db.weeklyPlan.deleteMany({ where: { studentId: { in: profileIds } } });
  await db.mockExam.deleteMany({ where: { studentId: { in: profileIds } } });
  await db.group.deleteMany({ where: { teacherId: { in: ids } } });
  await db.productMembership.deleteMany({ where: { userId: { in: ids } } });
  await db.studentProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.session.deleteMany({ where: { userId: { in: ids } } });
  await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: ids } }, { entityId: { in: ids } }] } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

async function user(role: "TEACHER" | "STUDENT", label: string) {
  const row = await db.user.create({
    data: {
      email: `m2-${label}-${randomUUID().slice(0, 8)}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: new Date(),
      role,
      status: "ACTIVE",
      fullName: `M2 ${label}`,
    },
  });
  createdUserIds.push(row.id);
  return row;
}

async function student(products: Array<"OD" | "OK" | "ODK">, label: string) {
  const row = await user("STUDENT", label);
  const profile = await db.studentProfile.create({ data: { userId: row.id } });
  for (const product of products) await db.productMembership.create({ data: { userId: row.id, product, startsAt: new Date(0) } });
  return { user: row, profile };
}

async function classroom(label: string) {
  const teacher = await user("TEACHER", `${label}-teacher`);
  const group = await db.group.create({ data: { name: `M2 ${label} grubu`, subject: "Matematik", teacherId: teacher.id } });
  return { teacher, group };
}

async function enroll(groupId: string, studentId: string, endedAt: Date | null = null) {
  return db.enrollment.create({ data: { groupId, studentId, endedAt } });
}

async function lesson(groupId: string, teacherId: string, startsAt: Date, extra: { status?: "PLANNED" | "COMPLETED" | "CANCELLED"; meetingUrl?: string | null; title?: string } = {}) {
  return db.lesson.create({
    data: {
      groupId,
      teacherId,
      title: extra.title ?? "Kesirler",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60000),
      status: extra.status ?? "PLANNED",
      meetingUrl: extra.meetingUrl === undefined ? "https://meet.example.com/m2" : extra.meetingUrl,
    },
  });
}

async function assignment(groupId: string, createdById: string, dueAt: Date, extra: { evidenceRequired?: boolean; title?: string } = {}) {
  return db.assignment.create({ data: { groupId, createdById, title: extra.title ?? "Kesirler çalışma kâğıdı", dueAt, evidenceRequired: extra.evidenceRequired ?? false } });
}

const minutesFromNow = (now: Date, minutes: number) => new Date(now.getTime() + minutes * 60000);

/* ------------------------------------------------------------------ *
 * M2.1 — OD Bugün
 * ------------------------------------------------------------------ */

integration("M2 OD Bugün: OD-only öğrenci — yaklaşan ders 'Şimdi' (katılım penceresi), ödev Bugün listesinde, hafta gerçek sayılar", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("home-od");
  const s = await student(["OD"], "home-od");
  await enroll(group.id, s.profile.id);
  const soon = await lesson(group.id, teacher.id, minutesFromNow(now, 10));
  const due = await assignment(group.id, teacher.id, minutesFromNow(now, 5));
  await db.assignmentProgress.create({ data: { assignmentId: due.id, studentId: s.profile.id } });

  const home = await loadOdHome({ userId: s.user.id, role: "STUDENT", fullName: "Ada Yılmaz", now });
  const parsed = parseOdHome(JSON.parse(JSON.stringify(home)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  assert.equal(home.state, "READY");
  assert.equal(home.firstName, "Ada");
  assert.deepEqual(home.now?.target, { type: "lesson", lessonId: soon.id });
  assert.equal(home.now?.joinable, true);
  assert.ok(!home.today.some((item) => item.id === `lesson:${soon.id}`), "Şimdi dersi Bugün listesinde tekrar edilmez");
  // Ödev bugün içinde teslim ediliyorsa listede; İstanbul günü dönümüne denk gelirse olmayabilir.
  const dueItem = home.today.find((item) => item.id === `assignment:${due.id}`);
  if (dueItem) assert.deepEqual(dueItem.target, { type: "assignment", assignmentId: due.id });
  assert.ok(home.week);
  assert.ok(home.week.lessonsPlanned >= 1);
  assert.equal(home.week.pendingAssignments, 1);
  assert.equal(home.week.dueReviews, null, "tekrar kuyruğu kapalıyken sayı uydurulmaz");
});

integration("M2 OD Bugün: üç ürünlü öğrencide Yön planı ve Deneme Ligi verisi OD Bugün'e girmez", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("home-all");
  const s = await student(["OD", "OK", "ODK"], "home-all");
  await enroll(group.id, s.profile.id);
  await lesson(group.id, teacher.id, minutesFromNow(now, 120));
  const ok = await db.product.findUniqueOrThrow({ where: { code: "OK" }, select: { id: true } });
  await db.weeklyPlan.create({
    data: {
      studentId: s.profile.id,
      productRefId: ok.id,
      weekStart: now,
      capacityMinutes: 300,
      createdById: teacher.id,
      status: "APPROVED",
      tasks: {
        create: [{ scheduledFor: minutesFromNow(now, 30), position: 0, title: "Yön görevi — paragraf", durationMinutes: 30, sourceType: "MANUAL_COACH", reasonCode: "CAPACITY_BALANCE", scheduleMode: "SCHEDULED" }],
      },
    },
  });

  const home = await loadOdHome({ userId: s.user.id, role: "STUDENT", fullName: null, now });
  const text = JSON.stringify(home);
  assert.ok(!text.includes("Yön görevi"), "Yön plan görevi OD yanıtında yok");
  assert.ok(!text.includes("/panel/ogrenci/plan"), "Yön plan bağlantısı OD yanıtında yok");
  assert.ok(!text.includes("/panel/odk/"), "Deneme Ligi bağlantısı OD yanıtında yok");
  assert.ok(home.now === null || home.now.kind === "OPEN_LESSON");
});

integration("M2 OD Bugün: Yön-only öğrenci için OD verisi üretilmez (rota ayrıca 404 PRODUCT_ACCESS_REQUIRED döner)", async () => {
  const s = await student(["OK"], "home-yon");
  const home = await loadOdHome({ userId: s.user.id, role: "STUDENT", fullName: null });
  assert.equal(home.state, "NO_PROFILE");
  assert.equal(home.now, null);
  assert.deepEqual(home.today, []);
  assert.equal(home.week, null);
});

integration("M2 OD Bugün: profili olmayan öğrenci", async () => {
  const row = await user("STUDENT", "home-noprofile");
  await db.productMembership.create({ data: { userId: row.id, product: "OD", startsAt: new Date(0) } });
  const home = await loadOdHome({ userId: row.id, role: "STUDENT", fullName: null });
  assert.equal(home.state, "NO_PROFILE");
});

integration("M2 OD Bugün: tekrar kuyruğu açıkken günü gelmiş tekrar 'Bu hafta' ve Bugün'de; kapalıyken yok", async () => {
  const now = new Date();
  const s = await student(["OD"], "home-review");
  await db.reviewItem.create({ data: { studentId: s.profile.id, sourceType: "TEACHER_REFERENCE", title: "Kesir tekrarı", sourceReference: "Ders", dueAt: minutesFromNow(now, -60) } });
  process.env.PANEL_FEATURE_REVIEW_QUEUE = "true";
  try {
    const home = await loadOdHome({ userId: s.user.id, role: "STUDENT", fullName: null, now });
    assert.equal(home.week?.dueReviews, 1);
    const reviewRow = home.now?.kind === "OPEN_REVIEW" ? home.now : home.today.find((item) => item.kind === "REVIEW");
    assert.ok(reviewRow, "tekrar eylemi ya Şimdi ya Bugün'de");
    assert.deepEqual(reviewRow.target, { type: "review" });
  } finally {
    delete process.env.PANEL_FEATURE_REVIEW_QUEUE;
  }
  const off = await loadOdHome({ userId: s.user.id, role: "STUDENT", fullName: null, now });
  assert.equal(off.week?.dueReviews, null);
  assert.ok(!JSON.stringify(off).includes("Kesir tekrarı"));
});

/* ------------------------------------------------------------------ *
 * M2.3 — Ders detayı (web sayfası ile ortak okuma modeli)
 * ------------------------------------------------------------------ */

integration("M2 ders detayı: aktif kayıt — grup notu + YALNIZ kendi özel notu; başka öğrencinin notu asla", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("detail-notes");
  const me = await student(["OD"], "detail-me");
  const other = await student(["OD"], "detail-other");
  await enroll(group.id, me.profile.id);
  await enroll(group.id, other.profile.id);
  const row = await lesson(group.id, teacher.id, minutesFromNow(now, 10));
  await db.lessonNote.create({ data: { lessonId: row.id, topic: "Kesirlerde toplama", homework: "Sayfa 12", nextGoal: "Çıkarma" } });
  await db.lessonNote.create({ data: { lessonId: row.id, studentId: me.profile.id, note: "Ada'ya özel not" } });
  await db.lessonNote.create({ data: { lessonId: row.id, studentId: other.profile.id, note: "Başkasına özel GİZLİ not" } });

  const detail = await loadStudentLessonDetail({ studentUserId: me.user.id, lessonId: row.id, now });
  assert.ok(detail);
  const mobile = toMobileLessonDetail(detail);
  assert.equal(mobile.topic, "Kesirlerde toplama");
  assert.equal(mobile.homework, "Sayfa 12");
  assert.equal(mobile.personalNote, "Ada'ya özel not");
  assert.ok(!JSON.stringify(mobile).includes("GİZLİ"), "başka öğrencinin özel notu yanıtta yok");
  assert.equal(mobile.join.state, "OPEN");
  assert.equal(mobile.join.url, "https://meet.example.com/m2");
  assert.equal(mobile.enrollmentActive, true);

  const otherView = toMobileLessonDetail((await loadStudentLessonDetail({ studentUserId: other.user.id, lessonId: row.id, now }))!);
  assert.ok(!JSON.stringify(otherView).includes("Ada'ya özel"), "simetrik: diğer öğrenci benim notumu görmez");
});

integration("M2 ders detayı: grup dışı öğrenci ve olmayan ders → null (rota 404); profil yok → null", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("detail-outside");
  const row = await lesson(group.id, teacher.id, minutesFromNow(now, 60));
  const outsider = await student(["OD"], "detail-outsider");
  const other = await classroom("detail-outsider-own");
  await enroll(other.group.id, outsider.profile.id);
  assert.equal(await loadStudentLessonDetail({ studentUserId: outsider.user.id, lessonId: row.id, now }), null);
  assert.equal(await loadStudentLessonDetail({ studentUserId: outsider.user.id, lessonId: "olmayan-ders", now }), null);
  const noProfile = await user("STUDENT", "detail-noprofile");
  assert.equal(await loadStudentLessonDetail({ studentUserId: noProfile.id, lessonId: row.id, now }), null);
});

integration("M2 ders detayı: sonlanmış kayıt — geçmiş ders özeti görünür (web politikası) ama katılım bağlantısı verilmez", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("detail-ended");
  const s = await student(["OD"], "detail-ended");
  await enroll(group.id, s.profile.id, minutesFromNow(now, -60 * 24));
  const past = await lesson(group.id, teacher.id, minutesFromNow(now, -60 * 24 * 7), { status: "COMPLETED" });
  const upcoming = await lesson(group.id, teacher.id, minutesFromNow(now, 5));
  await db.attendance.create({ data: { lessonId: past.id, studentId: s.profile.id, status: "PRESENT" } });

  const pastView = toMobileLessonDetail((await loadStudentLessonDetail({ studentUserId: s.user.id, lessonId: past.id, now }))!);
  assert.equal(pastView.attendance.label, "Katıldın");
  assert.equal(pastView.enrollmentActive, false);
  assert.equal(pastView.join.url, null);
  const upcomingView = toMobileLessonDetail((await loadStudentLessonDetail({ studentUserId: s.user.id, lessonId: upcoming.id, now }))!);
  assert.equal(upcomingView.join.state, "UNAVAILABLE", "kaydı sonlanan öğrenciye canlı ders bağlantısı yok");
  assert.equal(upcomingView.join.url, null);
});

integration("M2 ders detayı: iptal / tamamlanmış / pencere dışı ders bağlantı vermez; telafi paketi bayrakla görünür", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("detail-states");
  const s = await student(["OD"], "detail-states");
  await enroll(group.id, s.profile.id);
  const cancelled = await lesson(group.id, teacher.id, minutesFromNow(now, 5), { status: "CANCELLED" });
  const completed = await lesson(group.id, teacher.id, minutesFromNow(now, -30), { status: "COMPLETED" });
  const later = await lesson(group.id, teacher.id, minutesFromNow(now, 240));
  const missed = await lesson(group.id, teacher.id, minutesFromNow(now, -60 * 26), { status: "COMPLETED" });
  await db.attendance.create({ data: { lessonId: missed.id, studentId: s.profile.id, status: "ABSENT" } });
  await db.recoveryPackage.create({
    data: { lessonId: missed.id, studentId: s.profile.id, status: "PUBLISHED", summaryTopic: "Konu", summaryNextStep: "Adım", checkpointPrompt: "Soru", dueAt: minutesFromNow(now, 60 * 48), generatedById: teacher.id },
  });

  const view = async (id: string) => toMobileLessonDetail((await loadStudentLessonDetail({ studentUserId: s.user.id, lessonId: id, now }))!);
  assert.equal((await view(cancelled.id)).join.state, "UNAVAILABLE");
  assert.equal((await view(completed.id)).join.state, "ENDED");
  const laterView = await view(later.id);
  assert.equal(laterView.join.state, "NOT_YET");
  assert.equal(laterView.join.url, null);
  assert.ok(laterView.join.opensAt);
  const missedOff = await view(missed.id);
  assert.equal(missedOff.attendance.status, "ABSENT");
  assert.equal(missedOff.recovery, null, "recoveryPackage bayrağı kapalıyken telafi bilgisi yok");
  process.env.PANEL_FEATURE_RECOVERY_PACKAGE = "true";
  try {
    assert.deepEqual((await view(missed.id)).recovery, { status: "PUBLISHED" });
  } finally {
    delete process.env.PANEL_FEATURE_RECOVERY_PACKAGE;
  }
});

/* ------------------------------------------------------------------ *
 * M2.5 — Gidişat (web Analiz ile aynı servis)
 * ------------------------------------------------------------------ */

async function mockExam(studentId: string, createdById: string, takenAt: Date, correct: number) {
  return db.mockExam.create({
    data: {
      studentId,
      createdById,
      exam: "LGS",
      title: `Deneme ${correct}`,
      takenAt,
      sections: { create: [{ subjectCode: "MAT", subjectName: "Matematik", questionCount: 20, correctCount: correct, incorrectCount: 2, blankCount: 20 - correct - 2, position: 0 }] },
    },
  });
}

integration("M2 gidişat: mobil model web Analiz bundle'ıyla birebir (anlatı, akademik, katılım/çalışma); Yön plan oranı yok", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("insights");
  const s = await student(["OD"], "insights");
  await enroll(group.id, s.profile.id);
  const done = await lesson(group.id, teacher.id, minutesFromNow(now, -60 * 24 * 3), { status: "COMPLETED" });
  await db.attendance.create({ data: { lessonId: done.id, studentId: s.profile.id, status: "PRESENT" } });
  await mockExam(s.profile.id, teacher.id, minutesFromNow(now, -60 * 24 * 20), 10);
  await mockExam(s.profile.id, teacher.id, minutesFromNow(now, -60 * 24 * 5), 14);
  await db.studentProfile.update({ where: { id: s.profile.id }, data: { weeklyGoal: "Üç deneme çözeceğim.", weeklyGoalUpdatedAt: now } });

  const mobile = await loadMobileInsights({ studentUserId: s.user.id, now });
  assert.ok(mobile && mobile.state === "READY");
  const parsed = parseInsights(JSON.parse(JSON.stringify(mobile)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  const web = await loadStudentProgressInsight({ studentProfileId: s.profile.id, audience: "student", includeExams: true, now });
  assert.ok(web);
  assert.deepEqual(mobile.narrative, web.narrative);
  assert.equal(mobile.academic.examCount, web.academic.examCount);
  assert.equal(mobile.academic.netDelta, web.academic.netDelta);
  assert.deepEqual(mobile.academic.netTrend.map((point) => point.net), web.academic.netTrend.map((point) => point.net));
  assert.deepEqual(mobile.behavioral.attendance, web.behavioral.attendance);
  assert.deepEqual(mobile.behavioral.assignments, web.behavioral.assignments);
  assert.ok(!("plan" in mobile.behavioral), "Yön plan oranı OD gidişatına girmez");
  assert.equal(mobile.weeklyGoal, "Üç deneme çözeceğim.");
});

integration("M2 gidişat: boş geçmiş, tek deneme, bayrak kapalı, profil yok", async () => {
  const empty = await student(["OD"], "insights-empty");
  const emptyView = await loadMobileInsights({ studentUserId: empty.user.id });
  assert.ok(emptyView && emptyView.state === "READY");
  assert.equal(emptyView.isEmpty, true);
  assert.equal(emptyView.weeklyGoal, null);

  const { teacher } = await classroom("insights-single");
  const single = await student(["OD"], "insights-single");
  await mockExam(single.profile.id, teacher.id, new Date(Date.now() - 86400000), 12);
  const singleView = await loadMobileInsights({ studentUserId: single.user.id });
  assert.ok(singleView && singleView.state === "READY");
  assert.equal(singleView.academic.examCount, 1);
  assert.equal(singleView.academic.netDelta, null, "tek denemede değişim uydurulmaz");

  process.env.PANEL_FEATURE_PROGRESS_INSIGHTS = "false";
  try {
    assert.equal(await loadMobileInsights({ studentUserId: single.user.id }), null);
  } finally {
    delete process.env.PANEL_FEATURE_PROGRESS_INSIGHTS;
  }

  const noProfile = await user("STUDENT", "insights-noprofile");
  assert.deepEqual(await loadMobileInsights({ studentUserId: noProfile.id }), { contractVersion: 1, state: "NO_PROFILE" });
});

/* ------------------------------------------------------------------ *
 * M2.6 — Tekrar, telafi, haftalık özet (web sayfalarıyla ortak yükleyici)
 * ------------------------------------------------------------------ */

integration("M2 tekrar: yalnız günü gelmiş ACTIVE öğeler, yalnız kendi öğrencisi; sayılar sunucudan", async () => {
  const now = new Date();
  const me = await student(["OD"], "review-me");
  const other = await student(["OD"], "review-other");
  await db.reviewItem.create({ data: { studentId: me.profile.id, sourceType: "TEACHER_REFERENCE", title: "Bugünkü tekrar", sourceReference: "Ders", dueAt: minutesFromNow(now, -10) } });
  await db.reviewItem.create({ data: { studentId: me.profile.id, sourceType: "TEACHER_REFERENCE", title: "Gelecek tekrar", sourceReference: "Ders", dueAt: minutesFromNow(now, 60 * 24) } });
  await db.reviewItem.create({ data: { studentId: me.profile.id, sourceType: "TEACHER_REFERENCE", title: "Öğrenilmiş", sourceReference: "Ders", dueAt: minutesFromNow(now, -10), status: "MASTERED" } });
  await db.reviewItem.create({ data: { studentId: other.profile.id, sourceType: "TEACHER_REFERENCE", title: "Başkasının tekrarı", sourceReference: "Ders", dueAt: minutesFromNow(now, -10) } });

  const view = toMobileReviewQueue(await loadStudentReviewQueue({ studentUserId: me.user.id, now }));
  assert.ok(parseReviewQueue(JSON.parse(JSON.stringify(view))).ok);
  assert.ok(view.state === "READY");
  assert.deepEqual(view.items.map((item) => item.title), ["Bugünkü tekrar"]);
  assert.equal(view.activeCount, 2);
  assert.equal(view.masteredCount, 1);
  const noProfile = await user("STUDENT", "review-noprofile");
  assert.deepEqual(toMobileReviewQueue(await loadStudentReviewQueue({ studentUserId: noProfile.id })), { contractVersion: 1, state: "NO_PROFILE" });
});

integration("M2 telafi: yalnız yayınlanmış/tamamlanmış kendi paketleri; ilk görüntüleme kaydı; kimlikli dosya yolu mobile verilmez", async () => {
  const now = new Date();
  const { teacher, group } = await classroom("recovery");
  const me = await student(["OD"], "recovery-me");
  await enroll(group.id, me.profile.id);
  const missed = await lesson(group.id, teacher.id, minutesFromNow(now, -60 * 26), { status: "COMPLETED", title: "Paragraf" });
  const draftLesson = await lesson(group.id, teacher.id, minutesFromNow(now, -60 * 50), { status: "COMPLETED", title: "Taslak ders" });
  const fileMaterial = await db.learningMaterial.create({ data: { groupId: group.id, createdById: teacher.id, title: "Özet PDF", url: "https://blob.example/x.pdf", blobPathname: "private/x.pdf", kind: "PDF" } });
  const published = await db.recoveryPackage.create({
    data: {
      lessonId: missed.id,
      studentId: me.profile.id,
      status: "PUBLISHED",
      summaryTopic: "Ana fikir",
      summaryNextStep: "Kısa çalışma",
      checkpointPrompt: "Hazır mısın?",
      dueAt: minutesFromNow(now, 60 * 48),
      generatedById: teacher.id,
      items: { create: [{ kind: "MATERIAL", position: 0, title: "Özeti oku", materialId: fileMaterial.id }] },
    },
  });
  await db.recoveryPackage.create({ data: { lessonId: draftLesson.id, studentId: me.profile.id, status: "DRAFT", summaryTopic: "T", summaryNextStep: "S", checkpointPrompt: "C", dueAt: now, generatedById: teacher.id } });

  const view = toMobileRecovery(await loadStudentRecoveryPackages({ studentUserId: me.user.id, role: "STUDENT" }));
  assert.ok(parseRecovery(JSON.parse(JSON.stringify(view))).ok);
  assert.ok(view.state === "READY");
  assert.deepEqual(view.packages.map((item) => item.id), [published.id], "taslak paket görünmez");
  assert.deepEqual(view.packages[0].items[0].target, { type: "material", materialId: fileMaterial.id, hasFile: true, url: null });
  assert.ok(!JSON.stringify(view).includes("blob.example"), "kimlikli dosyanın depo adresi mobile çıkmaz");
  const after = await db.recoveryPackage.findUniqueOrThrow({ where: { id: published.id }, select: { firstViewedAt: true } });
  assert.ok(after.firstViewedAt, "ilk görüntüleme web sayfasıyla aynı şekilde kaydedilir");
});

integration("M2 haftalık özet: yalnız YAYINLANMIŞ son özet; yoksa NONE", async () => {
  const { teacher } = await classroom("digest");
  const me = await student(["OD"], "digest");
  assert.deepEqual(toMobileWeeklyDigest(await loadStudentWeeklyDigest({ studentUserId: me.user.id })), { contractVersion: 1, state: "NONE" });
  const base = { studentId: me.profile.id, trendBand: "STEADY", goodThingOne: "İyi 1", goodThingTwo: "İyi 2", supportArea: "Destek", homeQuestion: "Soru", dataThrough: new Date(), generatedById: teacher.id };
  await db.weeklyDigest.create({ data: { ...base, weekStart: new Date("2026-09-28T00:00:00Z"), status: "PUBLISHED", publishedAt: new Date() } });
  await db.weeklyDigest.create({ data: { ...base, goodThingOne: "Taslak", weekStart: new Date("2026-10-05T00:00:00Z"), status: "DRAFT" } });
  const view = toMobileWeeklyDigest(await loadStudentWeeklyDigest({ studentUserId: me.user.id }));
  assert.ok(parseWeeklyDigest(JSON.parse(JSON.stringify(view))).ok);
  assert.ok(view.state === "READY");
  assert.equal(view.digest.goodThingOne, "İyi 1");
});
