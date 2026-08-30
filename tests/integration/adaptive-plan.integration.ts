import assert from "node:assert/strict";
import test from "node:test";
import { ADAPTIVE_PLAN_RULE_VERSION, planningWeekStart } from "../../lib/adaptive-plan";
import { collectPlanCandidates } from "../../lib/adaptive-plan-server";
import { addIstanbulCalendarDays } from "../../lib/istanbul-time";
import { assertUniqueViolation, integration, prisma } from "./support/harness";
import {
  cleanupFixtures,
  createGroup,
  createLesson,
  createOutcome,
  createStudent,
  createTeacher,
  createUser,
  enroll,
} from "./support/fixtures";

/**
 * OD-012 · UYARLANABİLİR HAFTALIK PLAN.
 *
 * `lib/adaptive-plan.test.ts` skorlama ve kapasite çözücüsünü hazır adaylarla
 * doğruluyor. Ölçülmeyen kısım ADAYLARIN NEREDEN GELDİĞİ: `collectPlanCandidates`
 * altı ayrı tablodan okuyor ve her birinde kapsam koşulu var. Yanlış bir
 * `where`, başka bir öğrencinin ödevini plana koyar; saf testte görünmez.
 */

const preference = (studentId: string) => ({
  id: "pref",
  studentId,
  availableDays: [1, 2, 3, 4, 5],
  minutesPerDay: 45,
  maxTasksPerDay: 3,
  nextExamAt: null,
  examLabel: null,
  planningEnabled: true,
  overwhelmPulse: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

integration("aday toplama başka öğrencinin verisini asla almaz", async () => {
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const { profile: mine } = await createStudent();
  const { profile: theirs } = await createStudent();
  await Promise.all([enroll(group.id, mine.id), enroll(group.id, theirs.id)]);

  const assignment = await prisma.assignment.create({
    data: { groupId: group.id, createdById: teacher.id, title: "Ortak ödev", dueAt: new Date(Date.now() + 86_400_000) },
  });
  await prisma.assignmentProgress.createMany({
    data: [
      { assignmentId: assignment.id, studentId: mine.id, status: "TODO" },
      { assignmentId: assignment.id, studentId: theirs.id, status: "TODO" },
    ],
  });
  await prisma.reviewItem.create({
    data: { studentId: theirs.id, sourceType: "MOCK_EXAM_SECTION", title: "Başkasının tekrarı", sourceReference: "deneme", dueAt: new Date() },
  });

  const candidates = await collectPlanCandidates(mine.id, preference(mine.id) as never);
  assert.equal(candidates.length, 1, "kapsam dışı kayıt plana sızdı");
  assert.equal(candidates[0].sourceType, "ASSIGNMENT");
  assert.equal(candidates[0].sourceReferenceId, assignment.id);
});

integration("kaydı sona eren grubun ders kanıtı zayıf kazanım üretmez", async () => {
  const admin = await createUser("ADMIN");
  const { user: teacher } = await createTeacher();
  const activeGroup = await createGroup(teacher.id);
  const leftGroup = await createGroup(teacher.id);
  const { profile: student } = await createStudent();
  await Promise.all([
    enroll(activeGroup.id, student.id),
    enroll(leftGroup.id, student.id, new Date("2026-01-01T00:00:00Z")),
  ]);

  const [activeOutcome, leftOutcome] = await Promise.all([
    createOutcome(admin.id, { title: "Aktif grup kazanımı" }),
    createOutcome(admin.id, { title: "Ayrılınan grup kazanımı" }),
  ]);
  const [activeLesson, leftLesson] = await Promise.all([
    createLesson(activeGroup.id, teacher.id, { status: "COMPLETED" }),
    createLesson(leftGroup.id, teacher.id, { status: "COMPLETED" }),
  ]);
  await prisma.lessonOutcome.createMany({
    data: [
      { lessonId: activeLesson.id, outcomeId: activeOutcome.id, evidenceType: "NEEDS_REVIEW", linkedById: teacher.id },
      { lessonId: leftLesson.id, outcomeId: leftOutcome.id, evidenceType: "NEEDS_REVIEW", linkedById: teacher.id },
    ],
  });

  const candidates = await collectPlanCandidates(student.id, preference(student.id) as never);
  const weak = candidates.filter((row) => row.sourceType === "WEAK_OUTCOME").map((row) => row.sourceReferenceId);
  assert.deepEqual(weak, [activeOutcome.id], "geçmiş grup kaydı hâlâ plan üretiyor");
});

integration("planlanmamış ders durumu ve tamamlanmış ödev aday üretmez", async () => {
  const admin = await createUser("ADMIN");
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const { profile: student } = await createStudent();
  await enroll(group.id, student.id);

  const outcome = await createOutcome(admin.id);
  const plannedLesson = await createLesson(group.id, teacher.id, { status: "PLANNED" });
  await prisma.lessonOutcome.create({
    data: { lessonId: plannedLesson.id, outcomeId: outcome.id, evidenceType: "NEEDS_REVIEW", linkedById: teacher.id },
  });

  const assignment = await prisma.assignment.create({
    data: { groupId: group.id, createdById: teacher.id, title: "Bitmiş ödev", dueAt: new Date(Date.now() + 86_400_000) },
  });
  await prisma.assignmentProgress.create({ data: { assignmentId: assignment.id, studentId: student.id, status: "DONE" } });

  assert.deepEqual(await collectPlanCandidates(student.id, preference(student.id) as never), []);
});

integration("aynı hafta için ikinci plan satırı veritabanı kısıtına takılır", async () => {
  const { profile: student } = await createStudent();
  const { user: teacher } = await createTeacher();
  const weekStart = planningWeekStart();

  const create = () =>
    prisma.weeklyPlan.create({
      data: { studentId: student.id, weekStart, ruleVersion: ADAPTIVE_PLAN_RULE_VERSION, capacityMinutes: 225, createdById: teacher.id },
    });

  const plan = await create();
  await assertUniqueViolation(create, "aynı haftada ikinci plan açıldı");

  // Route yeniden üretimde bu satırı bulup GÜNCELLER; İstanbul haftası penceresi
  // eski UTC 00:00 kayıtlarını da kapsamalı.
  const found = await prisma.weeklyPlan.findFirst({
    where: { studentId: student.id, weekStart: { gte: weekStart, lt: addIstanbulCalendarDays(weekStart, 7) } },
  });
  assert.equal(found?.id, plan.id);
});

integration("onaylı plan yeniden üretimde kilitli kalır, taslak ise sürüm artırarak yenilenir", async () => {
  const { profile: student } = await createStudent();
  const { user: teacher } = await createTeacher();
  const weekStart = planningWeekStart();

  const plan = await prisma.weeklyPlan.create({
    data: {
      studentId: student.id,
      weekStart,
      status: "APPROVED",
      approvedById: teacher.id,
      approvedAt: new Date(),
      ruleVersion: ADAPTIVE_PLAN_RULE_VERSION,
      capacityMinutes: 225,
      createdById: teacher.id,
      tasks: {
        create: [
          { scheduledFor: weekStart, position: 0, title: "Biten iş", durationMinutes: 30, sourceType: "ASSIGNMENT", reasonCode: "DUE_SOON", status: "DONE" },
          { scheduledFor: weekStart, position: 1, title: "Bekleyen iş", durationMinutes: 30, sourceType: "REVIEW", reasonCode: "REVIEW_DUE", status: "PLANNED" },
        ],
      },
    },
  });
  assert.equal(plan.status, "APPROVED");

  // Route'un yenileme adımı: bekleyen görevler SKIPPED olur, tamamlananlar durur.
  await prisma.$transaction(async (tx) => {
    await tx.weeklyPlan.update({ where: { id: plan.id }, data: { status: "DRAFT", approvedById: null, approvedAt: null, version: { increment: 1 } } });
    await tx.weeklyPlanTask.updateMany({ where: { planId: plan.id, status: "PLANNED" }, data: { status: "SKIPPED" } });
  });

  const refreshed = await prisma.weeklyPlan.findUniqueOrThrow({ where: { id: plan.id }, include: { tasks: true } });
  assert.equal(refreshed.version, 2);
  assert.equal(refreshed.approvedAt, null);
  assert.deepEqual(refreshed.tasks.map((task) => task.status).sort(), ["DONE", "SKIPPED"]);
});

test.after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});
