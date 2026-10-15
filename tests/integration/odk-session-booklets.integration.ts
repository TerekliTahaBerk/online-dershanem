import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { LGS_FULL_SESSION_PLAN } from "@/lib/odk/exam-sessions";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";
import { loadStudentBookletFile } from "@/lib/odk/student-booklet-server";
import { integration } from "./integration-utils";

/**
 * Faz 5 / P1-1 — LGS oturum kitapçığı: Sözel açıkken yalnız Sözel PDF'i, arada
 * hiçbiri, Sayısal açıkken yalnız Sayısal PDF'i; başka öğrenci erişemez.
 */
integration("P1-1 LGS oturum bazlı kitapçık erişimi ve hazırlık kuralı", async () => {
  const run = randomUUID().slice(0, 8);
  const admin = await db.user.create({ data: { email: `f5-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const student = await db.user.create({ data: { email: `f5-s-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused" } });
  const other = await db.user.create({ data: { email: `f5-o-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused" } });
  const policy = await db.odkScoringPolicy.findUniqueOrThrow({ where: { code: "LGS_FULL_V1" } });
  const now = Date.now();
  const exam = await db.odkExam.create({ data: { title: `F5 LGS ${run}`, slug: `f5-lgs-${run}`, family: "LGS", structureMode: "FULL_TEMPLATE", templateCode: "LGS_FULL", status: "DRAFT", createdById: admin.id, startsAt: new Date(now - 4 * 3_600_000), endsAt: new Date(now + 4 * 3_600_000) } });
  const version = await db.odkExamVersion.create({ data: { examId: exam.id, versionNumber: 1, durationMinutes: 155, scoringPolicyId: policy.id, createdById: admin.id, settings: { sessions: LGS_FULL_SESSION_PLAN } } });
  await db.odkExam.update({ where: { id: exam.id }, data: { currentVersionId: version.id } });
  const section = await db.odkExamSection.create({ data: { versionId: version.id, code: "TURKCE", title: "Türkçe", position: 0, questionCount: 1 } });
  await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 1, position: 0, contentType: "BOOKLET_PDF" } });
  const file = (sessionKey: string) => db.odkExamFile.create({ data: { versionId: version.id, type: "BOOKLET_PDF", sessionKey, blobPathname: `test/${run}/${sessionKey || "all"}.pdf`, fileName: `${sessionKey || "tum"}.pdf`, mimeType: "application/pdf", byteSize: 10, uploadedById: admin.id } });
  const startAt = async (minutesAgo: number) => {
    await db.odkExamAttempt.deleteMany({ where: { examId: exam.id } });
    const startedAt = new Date(now - minutesAgo * 60_000);
    await db.odkExamAttempt.create({ data: { examId: exam.id, versionId: version.id, studentUserId: student.id, attemptNumber: 1, status: "IN_PROGRESS", startedAt, deadlineAt: new Date(startedAt.getTime() + 200 * 60_000) } });
  };
  try {
    const sozel = await file("SOZEL");
    // Yalnız Sözel yüklüyken hazırlık engeli: Sayısal kitapçığı eksik.
    assert.ok((await getOdkExamReadiness(exam.id)).issues.some((issue) => issue.code === "SESSION_BOOKLET_MISSING" && issue.level === "error"));
    const sayisal = await file("SAYISAL");
    assert.equal((await getOdkExamReadiness(exam.id)).issues.some((issue) => issue.code.startsWith("SESSION_BOOKLET")), false);

    await startAt(10); // Sözel açık (0–75 dk)
    assert.deepEqual(await loadStudentBookletFile(exam.id, student.id).then((r) => (r.ok ? r.file.id : r.code)), sozel.id);
    await startAt(90); // ara (75–120 dk)
    assert.deepEqual(await loadStudentBookletFile(exam.id, student.id).then((r) => (r.ok ? r.file.id : [r.code, r.status])), ["SESSION_BREAK", 403]);
    await startAt(130); // Sayısal açık (120–200 dk)
    assert.deepEqual(await loadStudentBookletFile(exam.id, student.id).then((r) => (r.ok ? r.file.id : r.code)), sayisal.id);
    // Başka öğrencinin denemesi yok: hiçbir kitapçık verilmez.
    assert.deepEqual(await loadStudentBookletFile(exam.id, other.id).then((r) => (r.ok ? r.file.id : r.code)), "NO_ACTIVE_ATTEMPT");
  } finally {
    await db.odkExamAttempt.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.updateMany({ where: { id: exam.id }, data: { currentVersionId: null } });
    await db.odkExamVersion.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.deleteMany({ where: { id: exam.id } });
    await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await db.user.deleteMany({ where: { id: { in: [admin.id, student.id, other.id] } } });
  }
});
