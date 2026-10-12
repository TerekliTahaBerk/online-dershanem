import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { createPilotCohortService, PilotCohortError, transitionPilotCohortService } from "@/lib/panel/pilot-cohort-service";
import { createMockExamService, MockExamError, mockExamRevision, reviseMockExamService } from "@/lib/panel/mock-exam-service";
import { loadPilotPage } from "@/lib/panel/pilot-server";
import { loadAdminMockExams } from "@/lib/panel/admin-mock-exams-server";
import { toMobileMockExams, toMobilePilot } from "@/lib/mobile/admin-rollout-views";
import { parseMockExamsAdmin, parsePilot } from "@/lib/mobile-contracts/admin-rollout";
import { integration } from "./integration-utils";

async function fixture() {
  const users: string[] = [];
  async function user(role: "ADMIN" | "STUDENT" | "TEACHER" | "PARENT") {
    const row = await db.user.create({ data: { email: `p28r-${randomUUID()}@example.com`, role, status: "ACTIVE", passwordHash: "unused", fullName: `P28 ${role}` } });
    users.push(row.id);
    return row;
  }
  const admin = await user("ADMIN"), other = await user("ADMIN"), teacher = await user("TEACHER"), studentUser = await user("STUDENT"), parent = await user("PARENT");
  const student = await db.studentProfile.create({ data: { userId: studentUser.id } });
  const group = await db.group.create({ data: { name: `P28 Grup ${randomUUID().slice(0, 6)}`, subject: "Matematik", teacherId: teacher.id, isActive: true } });
  await db.enrollment.create({ data: { groupId: group.id, studentId: student.id } });
  await db.parentStudent.create({ data: { parentId: parent.id, studentId: student.id } });
  async function clean() {
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await db.pilotCohort.deleteMany({ where: { createdById: { in: users } } });
    await db.reviewItem.deleteMany({ where: { studentId: student.id } });
    await db.mockExam.deleteMany({ where: { studentId: student.id } });
    await db.parentStudent.deleteMany({ where: { studentId: student.id } });
    await db.enrollment.deleteMany({ where: { groupId: group.id } });
    await db.group.delete({ where: { id: group.id } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
  return { admin, other, teacher, student, group, clean };
}

integration("P2.8 pilot: aynı anahtar eşzamanlı tek kohort + tek audit; başka gövde / başka yönetici 409; eski sürüm 409", async () => {
  const f = await fixture();
  try {
    const input = { actorUserId: f.admin.id, actorRole: "ADMIN" as const, groupId: f.group.id, requestKey: randomUUID() };
    const results = await Promise.all([createPilotCohortService(input), createPilotCohortService(input)]);
    assert.equal(results.filter((item) => item.replayed).length, 1);
    assert.equal(await db.pilotCohort.count({ where: { groupId: f.group.id } }), 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.admin.id, action: "pilot.cohort_created" } }), 1);
    const cohort = results[0].cohort;
    assert.equal(cohort.members.length, 4, "admin + öğretmen + öğrenci + veli");
    await assert.rejects(createPilotCohortService({ ...input, actorUserId: f.other.id }), (error) => error instanceof PilotCohortError && error.code === "IDEMPOTENCY_REUSE");
    await assert.rejects(createPilotCohortService({ ...input, requestKey: randomUUID() }), (error) => error instanceof PilotCohortError && error.code === "OPEN_COHORT_EXISTS");

    // Aktivasyon kapıları ortama bağlıdır; duraklatma kapı istemez.
    await db.pilotCohort.update({ where: { id: cohort.id }, data: { status: "ACTIVE" } });
    const pause = { actorUserId: f.admin.id, actorRole: "ADMIN" as const, cohortId: cohort.id, action: "PAUSE" as const, expectedVersion: cohort.version, stopReason: "OPERATIONAL" as const, idempotencyKey: randomUUID() };
    await assert.rejects(transitionPilotCohortService({ ...pause, stopReason: undefined, idempotencyKey: randomUUID() }), (error) => error instanceof PilotCohortError && error.code === "STOP_REASON_REQUIRED");
    const paused = await Promise.all([transitionPilotCohortService(pause), transitionPilotCohortService(pause)]);
    assert.equal(paused.filter((item) => item.replayed).length, 1);
    assert.equal(paused[0].cohort.status, "PAUSED");
    assert.equal(paused[0].cohort.version, cohort.version + 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.admin.id, action: "pilot.pause" } }), 1);
    await assert.rejects(transitionPilotCohortService({ ...pause, idempotencyKey: randomUUID() }), (error) => error instanceof PilotCohortError && error.code === "VERSION_CONFLICT");
    await assert.rejects(transitionPilotCohortService({ ...pause, action: "ROLLBACK" }), (error) => error instanceof PilotCohortError && error.code === "IDEMPOTENCY_REUSE");
    await assert.rejects(transitionPilotCohortService({ ...pause, action: "COMPLETE", expectedVersion: cohort.version + 1, idempotencyKey: randomUUID() }), (error) => error instanceof PilotCohortError && error.code === "TRANSITION_NOT_ALLOWED");

    const view = toMobilePilot(await loadPilotPage());
    assert.ok(parsePilot(JSON.parse(JSON.stringify(view))).ok);
    assert.deepEqual(view.cohorts.find((item) => item.id === cohort.id)?.actions.map((item) => item.action), ["RESUME", "ROLLBACK"]);
  } finally {
    await f.clean();
  }
});

integration("P2.8 dış deneme: aynı anahtar tek kayıt; revizyon sürümü eski görünümü 409 ile reddeder; audit atomik", async () => {
  const f = await fixture();
  try {
    const actor = { userId: f.admin.id, role: "ADMIN" as const };
    const sections = [{ subjectCode: "YDT", correctCount: 50, incorrectCount: 10, blankCount: 20, durationMinutes: null, errorCategories: ["TIME" as const] }];
    const input = { studentId: f.student.id, exam: "YDT" as const, title: "P28 deneme", takenAt: new Date().toISOString(), durationMinutes: 120, source: "MANUAL" as const, sections, idempotencyKey: randomUUID() };
    const created = await Promise.all([createMockExamService(actor, input), createMockExamService(actor, input)]);
    assert.equal(created.filter((item) => item.replayed).length, 1);
    assert.equal(await db.mockExam.count({ where: { studentId: f.student.id } }), 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.admin.id, action: "mock_exam.created" } }), 1);
    await assert.rejects(createMockExamService(actor, { ...input, title: "başka" }), (error) => error instanceof MockExamError && error.code === "IDEMPOTENCY_REUSE");
    await assert.rejects(createMockExamService(actor, { ...input, idempotencyKey: randomUUID(), sections: [{ ...sections[0], blankCount: 19 }] }), (error) => error instanceof MockExamError && error.code === "INVALID_SECTIONS");

    const exam = await db.mockExam.findFirstOrThrow({ where: { studentId: f.student.id }, include: { sections: { include: { errors: true } } } });
    const revision = mockExamRevision(exam);
    const revise = { reasons: [{ sectionId: exam.sections[0].id, categories: ["PROCESS" as const] }], nextAction: "Kısa set", idempotencyKey: randomUUID(), expectedRevision: revision };
    assert.equal((await reviseMockExamService(actor, exam.id, revise)).replayed, false);
    assert.equal((await reviseMockExamService(actor, exam.id, revise)).replayed, true);
    await assert.rejects(reviseMockExamService(actor, exam.id, { ...revise, idempotencyKey: randomUUID() }), (error) => error instanceof MockExamError && error.code === "MOCK_EXAM_CONFLICT");
    const after = await db.mockExam.findUniqueOrThrow({ where: { id: exam.id }, include: { sections: { include: { errors: true } } } });
    assert.equal(after.nextAction, "Kısa set");
    assert.deepEqual(after.sections[0].errors.map((error) => error.category), ["PROCESS"]);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.admin.id, action: "mock_exam.reasons_revised" } }), 1);

    const view = toMobileMockExams(await loadAdminMockExams(), f.student.id);
    const parsed = parseMockExamsAdmin(JSON.parse(JSON.stringify(view)));
    assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
    assert.equal(view.exams[0].revision, mockExamRevision(after));
  } finally {
    await f.clean();
  }
});
