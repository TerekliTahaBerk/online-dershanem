import assert from "node:assert/strict";
import test from "node:test";
import { INTERVENTION_RULE_VERSION, interventionWindowStart } from "../../lib/intervention-rules";
import { generateInterventionCases, raiseHumanConcern } from "../../lib/intervention-server";
import { getInterventionInbox } from "../../lib/intervention-inbox-server";
import { assertUniqueViolation, integration, prisma } from "./support/harness";
import { cleanupFixtures, createGroup, createStudent, createTeacher, createUser, enroll } from "./support/fixtures";

/**
 * OD-012 · AÇIKLANABİLİR MÜDAHALE GELEN KUTUSU.
 *
 * Kural motoru unit testli. Buradaki risk TEKİLLEŞTİRME: aynı öğrenci için
 * haftada tek bir destek bölümü açılmalı, sinyaller o bölüme eklenmeli. Kural
 * `fingerprint` benzersiz indeksi + `skipDuplicates` + transaction üçlüsüne
 * dayanıyor; üçü de ancak gerçek Postgres'te ölçülebilir.
 */

const TEN_DAYS_AGO = () => new Date(Date.now() - 10 * 86_400_000);

/** İki sinyal birden üreten bir öğrenci: etkileşim boşluğu + geciken çalışma. */
async function strugglingStudent() {
  const { user: teacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const { profile: student } = await createStudent({ lastLoginAt: TEN_DAYS_AGO() });
  await enroll(group.id, student.id);

  const dueAt = new Date(Date.now() - 3 * 86_400_000);
  for (const title of ["Geciken bir", "Geciken iki"]) {
    const assignment = await prisma.assignment.create({ data: { groupId: group.id, createdById: teacher.id, title, dueAt } });
    await prisma.assignmentProgress.create({ data: { assignmentId: assignment.id, studentId: student.id, status: "TODO" } });
  }
  return { teacher, group, student };
}

integration("aynı öğrencinin iki sinyali tek destek bölümünde birleşir", async () => {
  const { teacher, student } = await strugglingStudent();

  const result = await generateInterventionCases({ teacherId: teacher.id });
  assert.equal(result.created.length, 1);
  assert.equal(result.evaluatedStudentCount, 1);

  const cases = await prisma.interventionCase.findMany({ where: { studentId: student.id }, include: { signals: true } });
  assert.equal(cases.length, 1, "her sinyal için ayrı bölüm açıldı");
  assert.deepEqual(
    cases[0].signals.map((row) => row.reasonCode).sort(),
    ["ENGAGEMENT_GAP", "OVERDUE_WORK"],
  );
  assert.equal(cases[0].ruleVersion, INTERVENTION_RULE_VERSION);
  assert.equal(cases[0].windowStart.getTime(), interventionWindowStart(new Date()).getTime());
});

integration("aynı hafta yeniden üretim ne yeni bölüm ne yeni sinyal açar", async () => {
  const { teacher, student } = await strugglingStudent();

  await generateInterventionCases({ teacherId: teacher.id });
  const second = await generateInterventionCases({ teacherId: teacher.id });
  assert.deepEqual(second.created, []);
  assert.deepEqual(second.triggered, []);

  const [caseCount, signalCount, activityCount] = await Promise.all([
    prisma.interventionCase.count({ where: { studentId: student.id } }),
    prisma.interventionCaseSignal.count({ where: { case: { studentId: student.id } } }),
    prisma.interventionCaseActivity.count({ where: { case: { studentId: student.id }, type: "GENERATED" } }),
  ]);
  assert.equal(caseCount, 1);
  assert.equal(signalCount, 2);
  assert.equal(activityCount, 1);
});

integration("eş zamanlı iki üretim yarışında da tek bölüm kalır", async () => {
  const { teacher, student } = await strugglingStudent();

  await Promise.all([
    generateInterventionCases({ teacherId: teacher.id }),
    generateInterventionCases({ teacherId: teacher.id }),
  ]);

  assert.equal(await prisma.interventionCase.count({ where: { studentId: student.id } }), 1);
  assert.equal(await prisma.interventionCaseSignal.count({ where: { case: { studentId: student.id } } }), 2);

  // Parmak izi ve sinyal benzersizliği veritabanı düzeyinde de kapalı.
  const existing = await prisma.interventionCase.findFirstOrThrow({ where: { studentId: student.id } });
  await assertUniqueViolation(() =>
    prisma.interventionCase.create({
      data: {
        studentId: student.id,
        reasonCode: "ENGAGEMENT_GAP",
        fingerprint: existing.fingerprint,
        explanation: "kopya",
        suggestedAction: "kopya",
        evidenceCount: 1,
        windowStart: existing.windowStart,
        windowEnd: existing.windowEnd,
        dueAt: existing.dueAt,
      },
    }),
  );
  await assertUniqueViolation(() =>
    prisma.interventionCaseSignal.create({
      data: { caseId: existing.id, reasonCode: "ENGAGEMENT_GAP", explanation: "kopya", suggestedAction: "kopya", evidenceCount: 1 },
    }),
  );
});

integration("üretim ve gelen kutusu öğretmenin kendi grubuyla sınırlıdır", async () => {
  const { teacher, student } = await strugglingStudent();
  const { user: outsider } = await createTeacher();

  const foreign = await generateInterventionCases({ teacherId: outsider.id });
  assert.deepEqual(foreign.created, []);
  assert.equal(foreign.evaluatedStudentCount, 0);
  assert.equal(await prisma.interventionCase.count({ where: { studentId: student.id } }), 0);

  await generateInterventionCases({ teacherId: teacher.id });
  const own = await getInterventionInbox({ role: "TEACHER", userId: teacher.id });
  const foreignInbox = await getInterventionInbox({ role: "TEACHER", userId: outsider.id });
  assert.equal(own.filter((row) => row.reasonCode === "OVERDUE_WORK" || row.reasonCode === "ENGAGEMENT_GAP").length, 1);
  assert.equal(foreignInbox.length, 0, "başka öğretmenin öğrencisi gelen kutusunda göründü");
});

integration("insan işareti kapsam dışında reddedilir, kapsam içinde tekrarlanınca çoğalmaz", async () => {
  const { teacher, student } = await strugglingStudent();
  const { user: outsider } = await createTeacher();
  const admin = await createUser("ADMIN");

  assert.deepEqual(await raiseHumanConcern({ studentId: student.id, actorId: outsider.id, teacherId: outsider.id }), { kind: "NOT_FOUND" });
  assert.equal(await prisma.interventionCase.count({ where: { studentId: student.id } }), 0);

  const created = await raiseHumanConcern({ studentId: student.id, actorId: teacher.id, teacherId: teacher.id });
  assert.equal(created.kind, "CREATED");
  // Yönetici aynı hafta tekrar işaretlerse yeni bölüm de yeni sinyal de açılmaz.
  const repeat = await raiseHumanConcern({ studentId: student.id, actorId: admin.id });
  assert.equal(repeat.kind, "EXISTS");

  assert.equal(await prisma.interventionCase.count({ where: { studentId: student.id } }), 1);
  assert.equal(
    await prisma.interventionCaseSignal.count({ where: { case: { studentId: student.id }, reasonCode: "HUMAN_CONCERN" } }),
    1,
  );
});

integration("kapatılmış bölüm insan işaretiyle yeniden açılır", async () => {
  const { teacher, student } = await strugglingStudent();
  await generateInterventionCases({ teacherId: teacher.id });
  const opened = await prisma.interventionCase.findFirstOrThrow({ where: { studentId: student.id } });
  await prisma.interventionCase.update({
    where: { id: opened.id },
    data: { status: "RESOLVED", resolvedAt: new Date(), outcomeCode: "SUPPORT_PLANNED" },
  });

  const result = await raiseHumanConcern({ studentId: student.id, actorId: teacher.id, teacherId: teacher.id });
  assert.equal(result.kind, "ADDED");

  const reopened = await prisma.interventionCase.findUniqueOrThrow({ where: { id: opened.id }, include: { activities: true } });
  assert.equal(reopened.status, "OPEN");
  assert.equal(reopened.resolvedAt, null);
  assert.equal(reopened.outcomeCode, null);
  assert.ok(reopened.activities.some((row) => row.type === "REOPENED"));
});

integration("süresi dolan erteleme yeniden üretimde açılır", async () => {
  const { teacher, student } = await strugglingStudent();
  await generateInterventionCases({ teacherId: teacher.id });
  const opened = await prisma.interventionCase.findFirstOrThrow({ where: { studentId: student.id } });
  await prisma.interventionCase.update({
    where: { id: opened.id },
    data: { status: "SNOOZED", snoozedUntil: new Date(Date.now() - 3_600_000) },
  });

  const result = await generateInterventionCases({ teacherId: teacher.id });
  assert.equal(result.reactivatedCount, 1);

  const reopened = await prisma.interventionCase.findUniqueOrThrow({ where: { id: opened.id } });
  assert.equal(reopened.status, "OPEN");
  assert.equal(reopened.snoozedUntil, null);
  assert.equal(reopened.version, opened.version + 1);
});

test.after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});
