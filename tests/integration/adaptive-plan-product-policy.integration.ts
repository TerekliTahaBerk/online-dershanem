import assert from "node:assert/strict";

import { collectKpssPlanCandidates } from "../../lib/kpss/adaptive-plan-server";
import { collectPlanCandidates } from "../../lib/adaptive-plan-server";
import {
  buildAdaptiveWeek,
  examCountdownCapacity,
  planningWeekStart,
} from "../../lib/adaptive-plan";
import {
  canRegeneratePlan,
  initialPlanApprovalState,
  planAcceptsManualApproval,
} from "../../lib/kocum/plan-approval";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

/**
 * KPSS GÖREV 6 — ürün-bazlı plan motoru.
 *
 * Route handler'lar Node altında doğrudan çağrılamadığı için (bkz.
 * `kpss-rbac.integration.ts` başlığı) sözleşme, route'ların çağırdığı sunucu
 * modülleri ve gerçek Postgres verisi üzerinden doğrulanır:
 *   generate route → `collectPlanCandidates` / `collectKpssPlanCandidates`,
 *                    `examCountdownCapacity`, `initialPlanApprovalState`
 *   approve route  → `planAcceptsManualApproval` + planın ürün satırı
 *
 * Testlerin ASIL yükü: Online Koçum akışının bu değişiklikten ETKİLENMEDİĞİNİ
 * kanıtlamak (§OK regresyonu).
 */

const db = createIntegrationPrismaClient();
const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";

async function okProduct() {
  return db.product.findUniqueOrThrow({
    where: { code: "OK" },
    select: { id: true, code: true, requiresPlanApproval: true },
  });
}

/**
 * KPSS ürün satırı. Yalnız AKTİF yazar, asla pasife çekmez — diğer KPSS
 * entegrasyon dosyaları paralel koşuyor (bkz. `kpss-commerce.integration.ts`).
 */
async function kpssProduct() {
  return db.product.upsert({
    where: { code: "KPSS" },
    update: { isActive: true, requiresPlanApproval: false },
    create: {
      code: "KPSS",
      name: "KPSS",
      targetAudience: "adult",
      requiresPlanApproval: false,
    },
    select: { id: true, code: true, requiresPlanApproval: true },
  });
}

async function createStudent(prefix: string, runId: string) {
  const user = await db.user.create({
    data: {
      email: `${prefix}-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: new Date(),
      role: "STUDENT",
      status: "ACTIVE",
      fullName: `${prefix} Öğrenci`,
    },
  });
  const profile = await db.studentProfile.create({ data: { userId: user.id } });
  return { user, profile };
}

async function createPreference(studentId: string, nextExamAt: Date | null) {
  return db.studentPlanPreference.create({
    data: {
      studentId,
      availableDays: [1, 2, 3, 4, 5],
      minutesPerDay: 60,
      maxTasksPerDay: 3,
      nextExamAt,
      examLabel: nextExamAt ? "KPSS 2026" : null,
    },
  });
}

/* ------------------------------------------------------------------ */
/* §1 — Migration + backfill                                           */
/* ------------------------------------------------------------------ */

integration("mevcut TÜM haftalık planlar bir ürüne bağlıdır ve backfill OK'ya işaret eder", async () => {
  const ok = await okProduct();

  // Backfill sonrası ürünsüz plan KALMAMALI. Kolon NOT NULL olduğu için bu
  // sorgunun boş dönmesi şemayla birlikte garanti; yine de açıkça doğrulanır.
  const [{ count: orphanCount }] = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) FROM "weekly_plans" WHERE "product_ref_id" IS NULL
  `;
  assert.equal(Number(orphanCount), 0);

  // Migration 0109 öncesinde yazılmış planların tamamı OK planıdır.
  const [{ count: nonOkCount }] = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) FROM "weekly_plans" p
    JOIN "products" r ON r."id" = p."product_ref_id"
    WHERE r."code" <> 'OK' AND p."created_at" < (
      SELECT COALESCE(min("finished_at"), now())
      FROM "_prisma_migrations" WHERE "migration_name" = '0109_weekly_plan_product_identity'
    )
  `;
  assert.equal(Number(nonOkCount), 0);

  assert.equal(ok.requiresPlanApproval, true, "OK onay zorunluluğunu korumalı");
});

/* ------------------------------------------------------------------ */
/* §2 — Product.requiresPlanApproval OK/KPSS için farklı davranır      */
/* ------------------------------------------------------------------ */

integration("OK planı TASLAK doğar; KPSS planı otomatik onaylı doğar", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const [ok, kpss] = await Promise.all([okProduct(), kpssProduct()]);
  const now = new Date();
  const weekStart = planningWeekStart(now);

  const okStudent = await createStudent("plan-policy-ok", runId);
  const kpssStudent = await createStudent("plan-policy-kpss", runId);

  // Ürün politikası → yeni planın doğuş durumu.
  const okState = initialPlanApprovalState(ok, now);
  const kpssState = initialPlanApprovalState(kpss, now);

  const okPlan = await db.weeklyPlan.create({
    data: {
      studentId: okStudent.profile.id,
      productRefId: ok.id,
      weekStart,
      capacityMinutes: 300,
      createdById: okStudent.user.id,
      status: okState.status,
      approvedById: okState.approvedById,
      approvedAt: okState.approvedAt,
      autoApproved: okState.autoApproved,
    },
  });
  const kpssPlan = await db.weeklyPlan.create({
    data: {
      studentId: kpssStudent.profile.id,
      productRefId: kpss.id,
      weekStart,
      capacityMinutes: 300,
      createdById: kpssStudent.user.id,
      status: kpssState.status,
      approvedById: kpssState.approvedById,
      approvedAt: kpssState.approvedAt,
      autoApproved: kpssState.autoApproved,
    },
  });

  // OK: koç onayı bekliyor — mevcut davranış birebir.
  assert.equal(okPlan.status, "DRAFT");
  assert.equal(okPlan.autoApproved, false);
  assert.equal(okPlan.approvedById, null);
  assert.equal(okPlan.approvedAt, null);

  // KPSS: üretildiği anda aktif.
  assert.equal(kpssPlan.status, "APPROVED");
  assert.equal(kpssPlan.autoApproved, true);
  assert.ok(kpssPlan.approvedAt);
  // Otomatik onay sahte bir "onaylayan" yaratmaz.
  assert.equal(kpssPlan.approvedById, null);

  // Onay ucu: OK planı kabul eder, KPSS planı reddeder.
  assert.equal(planAcceptsManualApproval(ok), true);
  assert.equal(planAcceptsManualApproval(kpss), false);

  // Koç onaylı OK planı kilitlenir; otomatik onaylı plan yeniden üretilebilir.
  const approvedOk = await db.weeklyPlan.update({
    where: { id: okPlan.id },
    data: { status: "APPROVED", approvedById: okStudent.user.id, approvedAt: new Date() },
  });
  assert.equal(canRegeneratePlan(approvedOk), false);
  assert.equal(canRegeneratePlan(kpssPlan), true);

  await db.weeklyPlan.deleteMany({ where: { id: { in: [okPlan.id, kpssPlan.id] } } });
  await db.studentProfile.deleteMany({
    where: { id: { in: [okStudent.profile.id, kpssStudent.profile.id] } },
  });
  await db.user.deleteMany({ where: { id: { in: [okStudent.user.id, kpssStudent.user.id] } } });
});

/* ------------------------------------------------------------------ */
/* §3 — KPSS plan girdisi: deneme sonucu kazanım skorları              */
/* ------------------------------------------------------------------ */

integration("KPSS plan adayları deneme sonucundaki EN ZAYIF kazanımlardan üretilir", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const kpss = await kpssProduct();
  const student = await createStudent("plan-kpss-signal", runId);
  const preference = await createPreference(student.profile.id, null);

  const admin = await db.user.create({
    data: {
      email: `plan-kpss-admin-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: new Date(),
      role: "ADMIN",
      status: "ACTIVE",
      fullName: "KPSS Admin",
    },
  });

  const family = await db.examFamily.upsert({
    where: { code: "KPSS_EGITIM_BILIMLERI" },
    update: { productId: kpss.id, isActive: true },
    create: { code: "KPSS_EGITIM_BILIMLERI", name: "KPSS Eğitim Bilimleri", productId: kpss.id },
  });

  const curriculum = await db.curriculumVersion.create({
    data: {
      code: `kpss-plan-${runId}`,
      title: "KPSS Plan Testi",
      academicYear: 2026,
      createdById: admin.id,
      examFamilyRefId: family.id,
    },
  });
  const subject = await db.curriculumSubject.create({
    data: { versionId: curriculum.id, code: "EGB", name: "Eğitim Bilimleri" },
  });
  const unit = await db.curriculumUnit.create({
    data: { subjectId: subject.id, code: "OGR", name: "Öğrenme Psikolojisi" },
  });

  // Üç kazanım: biri çok zayıf, biri zayıf, biri güçlü.
  const outcomes = await Promise.all(
    [
      { code: "OGR.1", title: "Klasik koşullanma", accuracy: 20 },
      { code: "OGR.2", title: "Edimsel koşullanma", accuracy: 35 },
      { code: "OGR.3", title: "Bilişsel öğrenme", accuracy: 95 },
    ].map(async (row) => ({
      ...row,
      record: await db.learningOutcome.create({
        data: { unitId: unit.id, code: row.code, title: row.title },
      }),
    })),
  );

  const policy = await db.odkScoringPolicy.create({
    data: { code: `kpss-plan-${runId}`, title: "KPSS Plan", wrongPenalty: 0.25 },
  });
  const exam = await db.odkExam.create({
    data: {
      title: "KPSS Deneme 1",
      slug: `kpss-plan-${runId}`,
      examFamilyRefId: family.id,
      status: "RELEASED",
      startsAt: new Date(Date.now() - 3 * 86_400_000),
      createdById: admin.id,
    },
  });
  const version = await db.odkExamVersion.create({
    data: {
      examId: exam.id,
      versionNumber: 1,
      durationMinutes: 120,
      scoringPolicyId: policy.id,
      createdById: admin.id,
    },
  });
  const attempt = await db.odkExamAttempt.create({
    data: {
      attemptNumber: 1,
      examId: exam.id,
      versionId: version.id,
      studentUserId: student.user.id,
      status: "SUBMITTED",
      // `odk_exam_attempts_deadline_check`: deadline >= started.
      startedAt: new Date(Date.now() - 3 * 86_400_000),
      submittedAt: new Date(Date.now() - 3 * 86_400_000 + 3_600_000),
      deadlineAt: new Date(Date.now() - 3 * 86_400_000 + 7_200_000),
    },
  });
  await db.odkAttemptScore.create({
    data: {
      attemptId: attempt.id,
      correctCount: 15,
      wrongCount: 10,
      blankCount: 5,
      totalNet: 12.5,
      scoringVersion: "v1",
      answerKeyHash: "test-hash",
      scoredById: admin.id,
      outcomeScores: {
        create: outcomes.map((row) => ({
          outcomeId: row.record.id,
          questionCount: 10,
          correctCount: Math.round(row.accuracy / 10),
          wrongCount: 10 - Math.round(row.accuracy / 10),
          blankCount: 0,
          accuracyRate: row.accuracy,
        })),
      },
    },
  });

  const candidates = await collectKpssPlanCandidates(student.profile.id, preference);

  // GERÇEK veri yolu: `OdkAttemptOutcomeScore` satırlarından aday üretildi.
  assert.ok(candidates.length > 0, "deneme sonucundan aday üretilmeli");
  assert.ok(
    candidates.every((candidate) => candidate.sourceType === "WEAK_OUTCOME"),
    "sınav tarihi yokken yalnız zayıf kazanım adayı beklenir",
  );

  const referenced = candidates.map((candidate) => candidate.sourceReferenceId);
  const weakest = outcomes.find((row) => row.code === "OGR.1")!.record.id;
  const strongest = outcomes.find((row) => row.code === "OGR.3")!.record.id;
  assert.ok(referenced.includes(weakest), "en zayıf kazanım plana girmeli");
  assert.ok(!referenced.includes(strongest), "güçlü kazanım tekrar görevine dönüşmemeli");
  // En düşük doğruluk ilk sırada: haftanın ilk görevi en zayıf kazanımdır.
  assert.equal(referenced[0], weakest);

  // Sinyal kanıta bağlı: ODK sonucundan geldiği görevde işaretli.
  assert.equal(candidates[0].signalMeta?.source, "ODK_RESULT");

  await db.odkExamAttempt.deleteMany({ where: { examId: exam.id } });
  await db.odkExamVersion.deleteMany({ where: { id: version.id } });
  await db.odkExam.deleteMany({ where: { id: exam.id } });
  await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
  await db.curriculumVersion.deleteMany({ where: { id: curriculum.id } });
  await db.studentProfile.deleteMany({ where: { id: student.profile.id } });
  await db.user.deleteMany({ where: { id: { in: [student.user.id, admin.id] } } });
});

integration("KPSS aday toplayıcısı BAŞKA ürünlerin denemelerini plana taşımaz", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  await kpssProduct();
  const student = await createStudent("plan-kpss-scope", runId);
  const preference = await createPreference(student.profile.id, null);

  const admin = await db.user.create({
    data: {
      email: `plan-scope-admin-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: new Date(),
      role: "ADMIN",
      status: "ACTIVE",
      fullName: "Scope Admin",
    },
  });

  // ODK (KPSS DEĞİL) ailesinde bir deneme: KPSS planına girmemeli.
  const odkFamily = await db.examFamily.findUniqueOrThrow({ where: { code: "TYT" } });
  const policy = await db.odkScoringPolicy.create({
    data: { code: `plan-scope-${runId}`, title: "Scope", wrongPenalty: 0.25 },
  });
  const exam = await db.odkExam.create({
    data: {
      title: "TYT Deneme",
      slug: `plan-scope-${runId}`,
      examFamilyRefId: odkFamily.id,
      status: "RELEASED",
      startsAt: new Date(Date.now() - 86_400_000),
      createdById: admin.id,
    },
  });
  const version = await db.odkExamVersion.create({
    data: {
      examId: exam.id,
      versionNumber: 1,
      durationMinutes: 120,
      scoringPolicyId: policy.id,
      createdById: admin.id,
    },
  });
  await db.odkExamAttempt.create({
    data: {
      attemptNumber: 1,
      examId: exam.id,
      versionId: version.id,
      studentUserId: student.user.id,
      status: "SUBMITTED",
      startedAt: new Date(Date.now() - 86_400_000),
      submittedAt: new Date(Date.now() - 86_400_000 + 3_600_000),
      deadlineAt: new Date(Date.now() - 86_400_000 + 7_200_000),
    },
  });

  const candidates = await collectKpssPlanCandidates(student.profile.id, preference);
  assert.deepEqual(candidates, [], "KPSS dışı deneme KPSS planını beslememeli");

  await db.odkExamAttempt.deleteMany({ where: { examId: exam.id } });
  await db.odkExamVersion.deleteMany({ where: { id: version.id } });
  await db.odkExam.deleteMany({ where: { id: exam.id } });
  await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
  await db.studentProfile.deleteMany({ where: { id: student.profile.id } });
  await db.user.deleteMany({ where: { id: { in: [student.user.id, admin.id] } } });
});

/* ------------------------------------------------------------------ */
/* §4 — Sınav tarihine göre kapasite                                   */
/* ------------------------------------------------------------------ */

integration("hedef sınav tarihi yaklaştıkça KPSS planının kapasitesi artar, OK planı etkilenmez", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const now = new Date();
  const student = await createStudent("plan-countdown", runId);
  const farExam = new Date(now.getTime() + 120 * 86_400_000);
  const nearExam = new Date(now.getTime() + 18 * 86_400_000);
  const preference = await createPreference(student.profile.id, farExam);

  const base = { minutesPerDay: preference.minutesPerDay, maxTasksPerDay: 3 };
  const far = examCountdownCapacity({ now, examAt: farExam, ...base });
  const near = examCountdownCapacity({ now, examAt: nearExam, ...base });

  assert.equal(far.tier, "FAR");
  assert.equal(far.minutesPerDay, base.minutesPerDay);
  assert.equal(far.maxTasksPerDay, base.maxTasksPerDay);

  // Sınava 4 haftadan az: günlük görev sayısı ve süre artar.
  assert.equal(near.tier, "NEAR");
  assert.ok(near.minutesPerDay > far.minutesPerDay);
  assert.equal(near.maxTasksPerDay, base.maxTasksPerDay + 1);

  // Artan kapasite ÜRETİLEN PLANDA daha fazla göreve dönüşür.
  const candidates = Array.from({ length: 30 }, (_, index) => ({
    sourceType: "WEAK_OUTCOME" as const,
    sourceReferenceId: `outcome-${index}`,
    title: `Kazanım ${index}`,
    durationMinutes: 25,
    reasonCode: "NEEDS_REVIEW" as const,
    priority: 80,
  }));
  const availableDays = [1, 2, 3, 4, 5];
  const farTasks = buildAdaptiveWeek({ now, availableDays, ...far, candidates });
  const nearTasks = buildAdaptiveWeek({ now, availableDays, ...near, candidates });
  assert.ok(
    nearTasks.length > farTasks.length,
    `geri sayım daha yoğun plan üretmeli (uzak: ${farTasks.length}, yakın: ${nearTasks.length})`,
  );

  // OK planı geri sayıma HİÇ uğramaz: kapasite tercih değerlerinin aynısıdır.
  const okCapacityMinutes = availableDays.length * preference.minutesPerDay;
  assert.equal(okCapacityMinutes, 5 * 60);

  await db.studentProfile.deleteMany({ where: { id: student.profile.id } });
  await db.user.deleteMany({ where: { id: student.user.id } });
});

/* ------------------------------------------------------------------ */
/* §6 — ONLINE KOÇUM UÇTAN UCA REGRESYONU                              */
/* ------------------------------------------------------------------ */

integration("OK akışı uçtan uca değişmeden çalışır: üret → onay bekle → onayla → görev tamamla", async () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const ok = await okProduct();
  const now = new Date();
  const weekStart = planningWeekStart(now);

  const teacher = await db.user.create({
    data: {
      email: `plan-ok-teacher-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Koç",
    },
  });
  const student = await createStudent("plan-ok-e2e", runId);
  const preference = await createPreference(student.profile.id, null);

  // 1) ÜRETİM — OK girdi kaynağı (Assignment tabanlı) hiç değişmedi.
  const group = await db.group.create({
    data: { name: `OK Grup ${runId}`, subject: "Matematik", teacherId: teacher.id, isActive: true },
  });
  await db.enrollment.create({ data: { groupId: group.id, studentId: student.profile.id } });
  const assignment = await db.assignment.create({
    data: {
      groupId: group.id,
      createdById: teacher.id,
      title: "Köklü ifadeler ödevi",
      dueAt: new Date(now.getTime() + 3 * 86_400_000),
      isActive: true,
    },
  });
  await db.assignmentProgress.create({
    data: { assignmentId: assignment.id, studentId: student.profile.id, status: "TODO" },
  });

  const candidates = await collectPlanCandidates(student.profile.id, preference);
  const assignmentCandidate = candidates.find(
    (candidate) => candidate.sourceReferenceId === assignment.id,
  );
  assert.ok(assignmentCandidate, "OK planı hâlâ Assignment eksiklerinden beslenmeli");
  assert.equal(assignmentCandidate.sourceType, "ASSIGNMENT");
  assert.equal(assignmentCandidate.reasonCode, "DUE_SOON");

  const approval = initialPlanApprovalState(ok, now);
  const tasks = buildAdaptiveWeek({
    now,
    availableDays: [1, 2, 3, 4, 5],
    minutesPerDay: preference.minutesPerDay,
    maxTasksPerDay: Math.min(3, preference.maxTasksPerDay),
    candidates,
  });

  const plan = await db.weeklyPlan.create({
    data: {
      studentId: student.profile.id,
      productRefId: ok.id,
      weekStart,
      capacityMinutes: 5 * preference.minutesPerDay,
      createdById: student.user.id,
      status: approval.status,
      approvedById: approval.approvedById,
      approvedAt: approval.approvedAt,
      autoApproved: approval.autoApproved,
      tasks: {
        create: {
          scheduledFor: weekStart,
          position: 1,
          title: assignmentCandidate.title,
          durationMinutes: assignmentCandidate.durationMinutes,
          sourceType: "ASSIGNMENT",
          sourceReferenceId: assignment.id,
          reasonCode: "DUE_SOON",
        },
      },
    },
    include: { tasks: true },
  });
  assert.ok(tasks.length > 0);

  // 2) ONAY BEKLER — plan taslak, görev tamamlanamaz durumda.
  assert.equal(plan.status, "DRAFT");
  assert.equal(plan.autoApproved, false);
  assert.equal(planAcceptsManualApproval(ok), true);
  assert.equal(plan.tasks[0].status, "PLANNED");

  // 3) KOÇ ONAYLAR — onay ucunun yaptığı iyimser-kilitli güncellemenin aynısı.
  const approved = await db.weeklyPlan.updateMany({
    where: { id: plan.id, version: plan.version, status: "DRAFT" },
    data: {
      status: "APPROVED",
      approvedById: teacher.id,
      approvedAt: new Date(),
      version: { increment: 1 },
    },
  });
  assert.equal(approved.count, 1);

  const afterApproval = await db.weeklyPlan.findUniqueOrThrow({ where: { id: plan.id } });
  assert.equal(afterApproval.status, "APPROVED");
  assert.equal(afterApproval.approvedById, teacher.id, "OK planını GERÇEK bir koç onaylar");
  // Otomatik onay işareti OK planında ASLA yanmaz.
  assert.equal(afterApproval.autoApproved, false);
  assert.equal(afterApproval.version, plan.version + 1);
  // Onaylı OK planı kilitlidir: öğrenci yeniden üretemez, önce değişiklik ister.
  assert.equal(canRegeneratePlan(afterApproval), false);

  // 4) GÖREV TAMAMLAMA.
  const done = await db.weeklyPlanTask.update({
    where: { id: plan.tasks[0].id },
    data: { status: "DONE", completedAt: new Date(), actualMinutes: 30 },
  });
  assert.equal(done.status, "DONE");

  // 5) Plan hâlâ OK ürününe bağlı — akış boyunca ürün değişmedi.
  const withProduct = await db.weeklyPlan.findUniqueOrThrow({
    where: { id: plan.id },
    select: { productRef: { select: { code: true, requiresPlanApproval: true } } },
  });
  assert.equal(withProduct.productRef.code, "OK");
  assert.equal(withProduct.productRef.requiresPlanApproval, true);

  await db.weeklyPlan.deleteMany({ where: { id: plan.id } });
  await db.assignmentProgress.deleteMany({ where: { assignmentId: assignment.id } });
  await db.assignment.deleteMany({ where: { id: assignment.id } });
  await db.enrollment.deleteMany({ where: { groupId: group.id } });
  await db.group.deleteMany({ where: { id: group.id } });
  await db.studentProfile.deleteMany({ where: { id: student.profile.id } });
  await db.user.deleteMany({ where: { id: { in: [student.user.id, teacher.id] } } });
});
