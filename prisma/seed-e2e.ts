import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { planningWeekStart } from "../lib/adaptive-plan";
import { digestWeekStart } from "../lib/calm-weekly-digest";
import { interventionWindowStart } from "../lib/intervention-rules";

const prisma = new PrismaClient();

const ids = {
  admin: "e2e-user-admin",
  teacher: "e2e-user-teacher",
  otherTeacher: "e2e-user-teacher-foreign",
  student: "e2e-user-student",
  foreignStudent: "e2e-user-student-foreign",
  student3: "e2e-user-student-3",
  student4: "e2e-user-student-4",
  planForeignStudent: "e2e-user-plan-foreign",
  parent: "e2e-user-parent",
  studentProfile: "e2e-student-profile",
  foreignStudentProfile: "e2e-student-profile-foreign",
  studentProfile3: "e2e-student-profile-3",
  studentProfile4: "e2e-student-profile-4",
  planForeignStudentProfile: "e2e-student-profile-plan-foreign",
  teacherProfile: "e2e-teacher-profile",
  otherTeacherProfile: "e2e-teacher-profile-foreign",
  group: "e2e-group",
  foreignGroup: "e2e-group-foreign",
  lesson: "e2e-lesson",
  previousLesson: "e2e-lesson-previous",
  foreignLesson: "e2e-lesson-foreign",
  assignment: "e2e-assignment",
  material: "e2e-material",
  foreignPrivateMaterial: "e2e-material-private-foreign",
  curriculum: "e2e-curriculum-lgs-2026",
  curriculumSubject: "e2e-curriculum-subject-math",
  curriculumUnit: "e2e-curriculum-unit-roots",
  curriculumSkill: "e2e-curriculum-skill-problem",
  outcomeRoots: "e2e-outcome-roots",
  outcomePowers: "e2e-outcome-powers",
  parentNotification: "e2e-parent-notification",
  emailOutbox: "e2e-email-outbox",
  mockExams: ["e2e-mock-exam-1", "e2e-mock-exam-2", "e2e-mock-exam-3"],
  reviewItems: ["e2e-review-item-mock", "e2e-review-item-lesson", "e2e-review-item-foreign"],
  foreignWeeklyPlan: "e2e-weekly-plan-foreign",
  foreignWeeklyDigest: "e2e-weekly-digest-foreign",
  foreignInterventionCase: "e2e-intervention-foreign",
};

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.CI !== "true") {
    throw new Error("E2E seed production ortamında çalıştırılamaz.");
  }

  const password = process.env.E2E_PASSWORD || "testpass123";
  const passwordHash = await hashPassword(password);
  const users = [
    { id: ids.admin, email: "admin.e2e@example.com", fullName: "E2E Yönetici", role: "ADMIN" as const },
    { id: ids.teacher, email: "teacher.e2e@example.com", fullName: "E2E Öğretmen", role: "TEACHER" as const },
    { id: ids.otherTeacher, email: "other.teacher.e2e@example.com", fullName: "Başka Öğretmen", role: "TEACHER" as const },
    { id: ids.student, email: "student.e2e@example.com", fullName: "Ada Öğrenci", role: "STUDENT" as const },
    { id: ids.foreignStudent, email: "foreign.student.e2e@example.com", fullName: "Bora Yabancı", role: "STUDENT" as const },
    { id: ids.student3, email: "student3.e2e@example.com", fullName: "Cem Öğrenci", role: "STUDENT" as const },
    { id: ids.student4, email: "student4.e2e@example.com", fullName: "Duru Öğrenci", role: "STUDENT" as const },
    { id: ids.planForeignStudent, email: "plan.foreign.student.e2e@example.com", fullName: "Yalnız Yabancı Öğrenci", role: "STUDENT" as const },
    { id: ids.parent, email: "parent.e2e@example.com", fullName: "E2E Veli", role: "PARENT" as const },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash, mustChangePassword: false, status: "ACTIVE" },
      update: { passwordHash, fullName: user.fullName, role: user.role, status: "ACTIVE", mustChangePassword: false, failedAttempts: 0, lockedUntil: null },
    });
  }

  await prisma.teacherProfile.upsert({ where: { userId: ids.teacher }, create: { id: ids.teacherProfile, userId: ids.teacher, subjects: ["Matematik"] }, update: { subjects: ["Matematik"] } });
  await prisma.teacherProfile.upsert({ where: { userId: ids.otherTeacher }, create: { id: ids.otherTeacherProfile, userId: ids.otherTeacher, subjects: ["Fen"] }, update: { subjects: ["Fen"] } });

  const profiles = [
    { id: ids.studentProfile, userId: ids.student },
    { id: ids.foreignStudentProfile, userId: ids.foreignStudent },
    { id: ids.studentProfile3, userId: ids.student3 },
    { id: ids.studentProfile4, userId: ids.student4 },
    { id: ids.planForeignStudentProfile, userId: ids.planForeignStudent },
  ];
  for (const profile of profiles) {
    await prisma.studentProfile.upsert({ where: { userId: profile.userId }, create: { ...profile, classLevel: "8. Sınıf", targetGoal: "LGS" }, update: { classLevel: "8. Sınıf", targetGoal: "LGS" } });
  }

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: ids.parent, studentId: ids.studentProfile } },
    create: { parentId: ids.parent, studentId: ids.studentProfile, relationship: "Veli" },
    update: { relationship: "Veli" },
  });
  await prisma.notificationPreference.upsert({
    where: { userId: ids.parent },
    create: { userId: ids.parent, inAppEnabled: true, emailEnabled: true, lessonSummary: true, absence: true, assignment: true, payment: true },
    update: { inAppEnabled: true, emailEnabled: true, lessonSummary: true, absence: true, assignment: true, payment: true },
  });

  await prisma.group.upsert({ where: { id: ids.group }, create: { id: ids.group, name: "E2E LGS Grubu", subject: "Matematik", level: "8. Sınıf", teacherId: ids.teacher }, update: { teacherId: ids.teacher, isActive: true } });
  await prisma.group.upsert({ where: { id: ids.foreignGroup }, create: { id: ids.foreignGroup, name: "Yabancı Grup", subject: "Fen", level: "8. Sınıf", teacherId: ids.otherTeacher }, update: { teacherId: ids.otherTeacher, isActive: true } });

  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) {
    await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.group, studentId } }, create: { groupId: ids.group, studentId }, update: { endedAt: null } });
  }
  await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.foreignGroup, studentId: ids.foreignStudentProfile } }, create: { groupId: ids.foreignGroup, studentId: ids.foreignStudentProfile }, update: { endedAt: null } });
  await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.foreignGroup, studentId: ids.planForeignStudentProfile } }, create: { groupId: ids.foreignGroup, studentId: ids.planForeignStudentProfile }, update: { endedAt: null } });

  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  const previousStartsAt = new Date(Date.now() - 3 * 86400000);
  await prisma.lesson.upsert({ where: { id: ids.lesson }, create: { id: ids.lesson, groupId: ids.group, teacherId: ids.teacher, title: "E2E Hızlı Ders Özeti", startsAt, endsAt: new Date(startsAt.getTime() + 3600000), meetingUrl: "https://example.com/e2e-class" }, update: { startsAt, endsAt: new Date(startsAt.getTime() + 3600000), meetingUrl: "https://example.com/e2e-class", status: "PLANNED", closeVersion: 0, closeIdempotencyKey: null, closeRequestHash: null, completedAt: null } });
  await prisma.lesson.upsert({ where: { id: ids.previousLesson }, create: { id: ids.previousLesson, groupId: ids.group, teacherId: ids.teacher, title: "Önceki Ders", startsAt: previousStartsAt, endsAt: new Date(previousStartsAt.getTime() + 3600000), status: "COMPLETED" }, update: { startsAt: previousStartsAt, status: "COMPLETED" } });
  await prisma.lesson.upsert({ where: { id: ids.foreignLesson }, create: { id: ids.foreignLesson, groupId: ids.foreignGroup, teacherId: ids.otherTeacher, title: "Yabancı Ders", startsAt, endsAt: new Date(startsAt.getTime() + 3600000) }, update: { teacherId: ids.otherTeacher, status: "PLANNED" } });

  await prisma.attendance.deleteMany({ where: { lessonId: ids.lesson } });
  await prisma.lessonNote.deleteMany({ where: { lessonId: ids.lesson } });
  await prisma.assignment.deleteMany({ where: { lessonId: ids.lesson } });
  await prisma.lessonOutcome.deleteMany({ where: { lessonId: ids.lesson } });
  await prisma.weeklyPlan.deleteMany({ where: { studentId: ids.studentProfile } });
  await prisma.weeklyPlan.deleteMany({ where: { id: ids.foreignWeeklyPlan } });
  await prisma.studentPlanPreference.deleteMany({ where: { studentId: ids.studentProfile } });
  await prisma.weeklyDigest.deleteMany({ where: { studentId: ids.studentProfile } });
  await prisma.weeklyDigest.deleteMany({ where: { id: ids.foreignWeeklyDigest } });
  await prisma.interventionCase.deleteMany({ where: { studentId: ids.studentProfile } });
  await prisma.interventionCase.deleteMany({ where: { id: ids.foreignInterventionCase } });
  await prisma.emailOutbox.deleteMany({ where: { subject: { in: ["Ders özeti hazır – Online Dershanem", "Yeni çalışma eklendi – Online Dershanem"] } } });

  const previousNote = await prisma.lessonNote.findFirst({ where: { lessonId: ids.previousLesson, studentId: null } });
  if (previousNote) await prisma.lessonNote.update({ where: { id: previousNote.id }, data: { topic: "Üslü ifadeler", nextGoal: "Köklü ifadelerde dört işlem" } });
  else await prisma.lessonNote.create({ data: { lessonId: ids.previousLesson, topic: "Üslü ifadeler", nextGoal: "Köklü ifadelerde dört işlem" } });

  await prisma.curriculumVersion.upsert({ where: { code: "E2E-LGS-2026" }, create: { id: ids.curriculum, code: "E2E-LGS-2026", title: "E2E LGS 2026 Pilot Müfredatı", exam: "LGS", academicYear: 2026, status: "ACTIVE", createdById: ids.admin }, update: { status: "ACTIVE", title: "E2E LGS 2026 Pilot Müfredatı" } });
  await prisma.curriculumSubject.upsert({ where: { versionId_code: { versionId: ids.curriculum, code: "MAT" } }, create: { id: ids.curriculumSubject, versionId: ids.curriculum, code: "MAT", name: "Matematik" }, update: { name: "Matematik" } });
  await prisma.curriculumUnit.upsert({ where: { subjectId_code: { subjectId: ids.curriculumSubject, code: "KOK" } }, create: { id: ids.curriculumUnit, subjectId: ids.curriculumSubject, code: "KOK", name: "Köklü İfadeler" }, update: { name: "Köklü İfadeler" } });
  await prisma.curriculumSkill.upsert({ where: { versionId_code: { versionId: ids.curriculum, code: "problem-cozme" } }, create: { id: ids.curriculumSkill, versionId: ids.curriculum, code: "problem-cozme", name: "Problem çözme" }, update: { name: "Problem çözme" } });
  await prisma.learningOutcome.upsert({ where: { unitId_code: { unitId: ids.curriculumUnit, code: "MAT.8.1" } }, create: { id: ids.outcomeRoots, unitId: ids.curriculumUnit, code: "MAT.8.1", title: "Köklü ifadelerle dört işlem yapar." }, update: { title: "Köklü ifadelerle dört işlem yapar.", isActive: true } });
  await prisma.learningOutcome.upsert({ where: { unitId_code: { unitId: ids.curriculumUnit, code: "MAT.8.2" } }, create: { id: ids.outcomePowers, unitId: ids.curriculumUnit, code: "MAT.8.2", title: "Gerçek sayı problemlerinde uygun stratejiyi seçer." }, update: { title: "Gerçek sayı problemlerinde uygun stratejiyi seçer.", isActive: true } });
  await prisma.outcomeSkill.upsert({ where: { outcomeId_skillId: { outcomeId: ids.outcomeRoots, skillId: ids.curriculumSkill } }, create: { outcomeId: ids.outcomeRoots, skillId: ids.curriculumSkill }, update: {} });
  await prisma.outcomeSkill.upsert({ where: { outcomeId_skillId: { outcomeId: ids.outcomePowers, skillId: ids.curriculumSkill } }, create: { outcomeId: ids.outcomePowers, skillId: ids.curriculumSkill }, update: {} });
  await prisma.lessonOutcome.upsert({ where: { lessonId_outcomeId: { lessonId: ids.previousLesson, outcomeId: ids.outcomeRoots } }, create: { lessonId: ids.previousLesson, outcomeId: ids.outcomeRoots, evidenceType: "NEEDS_REVIEW", linkedById: ids.teacher }, update: { evidenceType: "NEEDS_REVIEW", linkedById: ids.teacher } });
  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) await prisma.attendance.upsert({ where: { lessonId_studentId: { lessonId: ids.previousLesson, studentId } }, create: { lessonId: ids.previousLesson, studentId, status: "PRESENT" }, update: { status: "PRESENT" } });

  await prisma.assignment.upsert({ where: { id: ids.assignment }, create: { id: ids.assignment, groupId: ids.group, lessonId: ids.lesson, createdById: ids.teacher, title: "E2E Yeni Nesil Sorular", description: "1–12. soruları çöz ve yanlışlarını işaretle.", dueAt: new Date(Date.now() + 2 * 86400000) }, update: { isActive: true, dueAt: new Date(Date.now() + 2 * 86400000) } });
  await prisma.assignmentOutcome.upsert({ where: { assignmentId_outcomeId: { assignmentId: ids.assignment, outcomeId: ids.outcomePowers } }, create: { assignmentId: ids.assignment, outcomeId: ids.outcomePowers, linkedById: ids.teacher }, update: { linkedById: ids.teacher } });
  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) {
    await prisma.assignmentProgress.upsert({ where: { assignmentId_studentId: { assignmentId: ids.assignment, studentId } }, create: { assignmentId: ids.assignment, studentId }, update: { status: "TODO", completedAt: null } });
  }
  await prisma.reviewItem.deleteMany({ where: { studentId: ids.studentProfile } });
  await prisma.reviewItem.deleteMany({ where: { id: ids.reviewItems[2] } });
  await prisma.mockExam.deleteMany({ where: { studentId: ids.studentProfile } });
  for (const [index, id] of ids.mockExams.entries()) {
    await prisma.mockExam.create({ data: { id, studentId: ids.studentProfile, exam: "LGS", title: `E2E LGS Denemesi ${index + 1}`, publisher: "E2E Pilot Yayını", takenAt: new Date(Date.now() - index * 7 * 86400000), durationMinutes: 150 - index * 2, createdById: ids.teacher, sections: { create: [
      { subjectCode: "TR", subjectName: "Türkçe", questionCount: 20, correctCount: 16, incorrectCount: 3, blankCount: 1, durationMinutes: 35, position: 0 },
      { subjectCode: "INK", subjectName: "T.C. İnkılap Tarihi", questionCount: 10, correctCount: 8, incorrectCount: 1, blankCount: 1, durationMinutes: 12, position: 1 },
      { subjectCode: "DIN", subjectName: "Din Kültürü", questionCount: 10, correctCount: 9, incorrectCount: 1, blankCount: 0, durationMinutes: 10, position: 2 },
      { subjectCode: "EN", subjectName: "İngilizce", questionCount: 10, correctCount: 8, incorrectCount: 1, blankCount: 1, durationMinutes: 12, position: 3 },
      { subjectCode: "MAT", subjectName: "Matematik", questionCount: 20, correctCount: 13 + index, incorrectCount: 5 - index, blankCount: 2, durationMinutes: 48, position: 4, errors: { create: [{ category: "PROCESS" }] } },
      { subjectCode: "FEN", subjectName: "Fen Bilimleri", questionCount: 20, correctCount: 16, incorrectCount: 3, blankCount: 1, durationMinutes: 30, position: 5 },
    ] } } });
  }
  const mockMathSection = await prisma.mockExamSection.findUniqueOrThrow({ where: { mockExamId_subjectCode: { mockExamId: ids.mockExams[0], subjectCode: "MAT" } } });
  await prisma.reviewItem.create({ data: { id: ids.reviewItems[0], studentId: ids.studentProfile, sourceType: "MOCK_EXAM_SECTION", mockExamSectionId: mockMathSection.id, createdById: ids.teacher, title: "Matematik deneme dönüşü", sourceReference: "E2E LGS Denemesi 1 · Matematik · 5 yanlış", dueAt: new Date(Date.now() - 86400000) } });
  await prisma.reviewItem.create({ data: { id: ids.reviewItems[1], studentId: ids.studentProfile, sourceType: "LESSON_OUTCOME", lessonId: ids.previousLesson, outcomeId: ids.outcomeRoots, createdById: ids.teacher, title: "Köklü ifadelerle dört işlem yapar.", sourceReference: "Önceki Ders · E2E kazanım dönüşü", dueAt: new Date(Date.now() - 86400000), attempts: { create: [0, 1, 2].map((index) => ({ id: `e2e-review-attempt-${index}`, response: "WRONG" as const, stageBefore: 0, stageAfter: 0, nextDueAt: new Date(Date.now() - 86400000), idempotencyKey: `e2e_attempt_${index}`, reviewedAt: new Date(Date.now() - (index + 2) * 86400000) })) } } });
  await prisma.reviewItem.create({ data: { id: ids.reviewItems[2], studentId: ids.foreignStudentProfile, sourceType: "TEACHER_REFERENCE", createdById: ids.otherTeacher, title: "Yabancı öğrenci tekrarı", sourceReference: "Yabancı öğretmen föyü", dueAt: new Date(Date.now() - 86400000) } });
  await prisma.weeklyPlan.create({ data: { id: ids.foreignWeeklyPlan, studentId: ids.planForeignStudentProfile, weekStart: planningWeekStart(), status: "DRAFT", capacityMinutes: 45, createdById: ids.otherTeacher, tasks: { create: { scheduledFor: planningWeekStart(), position: 1, title: "Yabancı öğrenci plan görevi", durationMinutes: 20, sourceType: "REVIEW", sourceReferenceId: ids.reviewItems[2], reasonCode: "REVIEW_DUE" } } } });
  await prisma.weeklyDigest.create({ data: { id: ids.foreignWeeklyDigest, studentId: ids.planForeignStudentProfile, weekStart: digestWeekStart(), status: "DRAFT", trendBand: "STEADY", goodThingOne: "Derslere katılım ritmi bu hafta korundu.", goodThingTwo: "Çalışma adımlarında düzenli bir temel oluşuyor.", supportArea: "Küçük ve sürdürülebilir tekrar adımları faydalı olabilir.", homeQuestion: "Bu hafta sana en çok hangi çalışma adımı yardımcı oldu?", dataThrough: new Date(), generatedById: ids.otherTeacher } });
  await prisma.interventionCase.create({ data: { id: ids.foreignInterventionCase, studentId: ids.planForeignStudentProfile, reasonCode: "PLAN_STALLED", fingerprint: "e2e-intervention-foreign-fingerprint", explanation: "Yabancı öğrencinin kontrollü açıklaması.", suggestedAction: "Yabancı öğrencinin küçük eylemi.", evidenceCount: 3, windowStart: interventionWindowStart(), windowEnd: new Date(), dueAt: new Date(Date.now() + 86400000), ownerId: ids.otherTeacher, activities: { create: { type: "GENERATED" } } } });
  await prisma.learningMaterial.upsert({ where: { id: ids.material }, create: { id: ids.material, groupId: ids.group, lessonId: ids.lesson, createdById: ids.teacher, title: "E2E Köklü İfadeler Föyü", description: "Ders sonrası tekrar kaynağı", url: "https://example.com/e2e-material.pdf", kind: "PDF" }, update: { isActive: true } });
  await prisma.learningMaterial.upsert({
    where: { id: ids.foreignPrivateMaterial },
    create: { id: ids.foreignPrivateMaterial, groupId: ids.foreignGroup, lessonId: ids.foreignLesson, createdById: ids.otherTeacher, title: "Yabancı Private Materyal", url: "private://e2e/foreign.pdf", blobPathname: "e2e/foreign.pdf", fileName: "foreign.pdf", mimeType: "application/pdf", kind: "PDF" },
    update: { groupId: ids.foreignGroup, isActive: true, blobPathname: "e2e/foreign.pdf" },
  });
  await prisma.notification.upsert({ where: { id: ids.parentNotification }, create: { id: ids.parentNotification, userId: ids.parent, type: "SYSTEM", title: "E2E panel hazır", body: "Bildirim merkezi kabul testi için hazır.", href: "/panel/veli" }, update: { readAt: null } });
  await prisma.emailOutbox.upsert({ where: { id: ids.emailOutbox }, create: { id: ids.emailOutbox, recipients: JSON.stringify(["receipt.e2e@example.com"]), subject: "E2E ödeme makbuzu", html: "<p>E2E makbuz</p>", status: "FAILED", attempts: 2, lastError: "E2E gönderim hatası", nextRetryAt: new Date() }, update: { status: "FAILED", attempts: 2, lastError: "E2E gönderim hatası", nextRetryAt: new Date() } });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
