import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOutcomeTrends } from "@/lib/odk/reporting";
import { contractAllowsReport } from "@/lib/odk/product-contract";
import { listActiveOdkContracts } from "@/lib/odk/product-contract-server";

type ReportViewer = { userId: string; role: Extract<UserRole, "ADMIN" | "TEACHER" | "PARENT"> };

export async function listOdkReportStudents(viewer: ReportViewer) {
  if (viewer.role === "ADMIN") {
    const students = await prisma.studentProfile.findMany({
      where: { user: { status: "ACTIVE", odkExamAttempts: { some: {} } } }, orderBy: { user: { fullName: "asc" } },
      select: { user: { select: { id: true, fullName: true, email: true } }, classLevel: true },
    });
    return students.map((student) => ({ userId: student.user.id, name: student.user.fullName || student.user.email, context: student.classLevel || "ODK öğrencisi" }));
  }
  if (viewer.role === "TEACHER") {
    const students = await prisma.studentProfile.findMany({
      where: { user: { status: "ACTIVE" }, enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: viewer.userId } } } },
      orderBy: { user: { fullName: "asc" } },
      select: { user: { select: { id: true, fullName: true, email: true } }, enrollments: { where: { endedAt: null, group: { isActive: true, teacherId: viewer.userId } }, select: { group: { select: { name: true } } } } },
    });
    const visible = await Promise.all(students.map(async (student) => ({ student, contracts: await listActiveOdkContracts(student.user.id) })));
    return visible.filter(({ contracts }) => contracts.some(({ contract }) => contractAllowsReport(contract, "TEACHER"))).map(({ student }) => ({ userId: student.user.id, name: student.user.fullName || student.user.email, context: student.enrollments.map((item) => item.group.name).join(" · ") }));
  }
  const links = await prisma.parentStudent.findMany({
    where: { parentId: viewer.userId, student: { user: { status: "ACTIVE" } } }, orderBy: { student: { user: { fullName: "asc" } } },
    select: { relationship: true, student: { select: { user: { select: { id: true, fullName: true, email: true } } } } },
  });
  const visible = await Promise.all(links.map(async (link) => ({ link, contracts: await listActiveOdkContracts(link.student.user.id) })));
  return visible.filter(({ contracts }) => contracts.some(({ contract }) => contractAllowsReport(contract, "PARENT"))).map(({ link }) => ({ userId: link.student.user.id, name: link.student.user.fullName || link.student.user.email, context: link.relationship || "Bağlı öğrenci" }));
}

export async function getOdkAudienceStudentReport(viewer: ReportViewer, studentUserId: string) {
  const allowed = viewer.role === "ADMIN"
    ? await prisma.studentProfile.findFirst({ where: { userId: studentUserId, user: { status: "ACTIVE" } }, select: { user: { select: { fullName: true, email: true } } } })
    : viewer.role === "TEACHER"
    ? await prisma.studentProfile.findFirst({ where: { userId: studentUserId, enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: viewer.userId } } } }, select: { user: { select: { fullName: true, email: true } } } })
    : await prisma.parentStudent.findFirst({ where: { parentId: viewer.userId, student: { userId: studentUserId } }, select: { student: { select: { user: { select: { fullName: true, email: true } } } } } });
  if (!allowed) return null;
  const contracts = viewer.role === "ADMIN" ? [] : await listActiveOdkContracts(studentUserId);
  const reportContracts = viewer.role === "ADMIN" ? [] : contracts.filter(({ contract }) => contractAllowsReport(contract, viewer.role));
  if (viewer.role !== "ADMIN" && !reportContracts.length) return null;
  const entitledExamIds = viewer.role === "ADMIN" ? null : [...new Set(reportContracts.flatMap(({ contract }) => contract.exams.map((exam) => exam.id)))];
  const contractReleases = new Map<string, string | null>();
  for (const { contract } of reportContracts) {
    for (const exam of contract.exams) {
      const current = contractReleases.get(exam.id);
      if (!current || (exam.resultsReleasedAt && new Date(exam.resultsReleasedAt) < new Date(current))) contractReleases.set(exam.id, exam.resultsReleasedAt);
    }
  }
  const user = "user" in allowed ? allowed.user : allowed.student.user;
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { studentUserId, ...(entitledExamIds ? { examId: { in: entitledExamIds } } : {}), status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, exam: { status: "RELEASED", ...(viewer.role === "ADMIN" ? { resultsReleasedAt: { lte: new Date() } } : {}) }, score: { isNot: null } },
    orderBy: { exam: { startsAt: "asc" } },
    select: {
      id: true, submittedAt: true,
      exam: { select: { id: true, title: true, family: true, startsAt: true } },
      score: { select: { correctCount: true, wrongCount: true, blankCount: true, totalNet: true, outcomeScores: { select: { outcomeId: true, questionCount: true, accuracyRate: true, outcome: { select: { code: true, title: true, unit: { select: { name: true } } } } } } } },
    },
  });
  const exams = attempts.flatMap((attempt) => {
    const release = viewer.role === "ADMIN" ? true : (() => { const value = contractReleases.get(attempt.exam.id); return Boolean(value && new Date(value) <= new Date()); })();
    return attempt.score && release ? [{ id: attempt.exam.id, title: attempt.exam.title, family: attempt.exam.family, takenAt: attempt.exam.startsAt || attempt.submittedAt || new Date(0), correctCount: attempt.score.correctCount, wrongCount: attempt.score.wrongCount, blankCount: attempt.score.blankCount, totalNet: Number(attempt.score.totalNet), outcomes: attempt.score.outcomeScores.map((item) => ({ outcomeId: item.outcomeId, code: item.outcome.code, title: item.outcome.title, unitName: item.outcome.unit.name, questionCount: item.questionCount, accuracyRate: Number(item.accuracyRate) })) }] : [];
  });
  const trends = buildOutcomeTrends(exams.flatMap((exam) => exam.outcomes.map((outcome) => ({ examId: exam.id, takenAt: exam.takenAt, ...outcome }))));
  return { student: { userId: studentUserId, name: user.fullName || user.email }, exams, trends };
}
