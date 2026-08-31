import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { planningWeekStart } from "../lib/adaptive-plan";
import { digestWeekStart } from "../lib/calm-weekly-digest";
import { interventionWindowStart } from "../lib/intervention-rules";
import { panelE2EAccounts } from "../lib/e2e/panel-accounts";

const prisma = new PrismaClient();
const odkContractPolicy = {
  sales: { state: "AVAILABLE" as const },
  access: { starts: "PURCHASED_AT" as const, durationDays: null },
  rights: { studentReports: true, parentReports: true, teacherReports: true, liveService: true },
  exceptions: { soldOut: "BLOCK_NEW_ORDERS" as const, outage: "RESCHEDULE_OR_EXTEND_ACCESS" as const, cancellation: "RESCHEDULE_OR_REFUND" as const, refund: "BEFORE_FIRST_ATTEMPT" as const, exceptionalAccess: "ADMIN_GRANT_WITH_REASON_AND_EXPIRY" as const },
};

const ids = {
  admin: "e2e-user-admin",
  teacher: "e2e-user-teacher",
  otherTeacher: "e2e-user-teacher-foreign",
  student: "e2e-user-student",
  foreignStudent: "e2e-user-student-foreign",
  student3: "e2e-user-student-3",
  student4: "e2e-user-student-4",
  odkStudent: "e2e-user-odk-student",
  planForeignStudent: "e2e-user-plan-foreign",
  parent: "e2e-user-parent",
  businessSales: "e2e-user-business-sales",
  businessSupport: "e2e-user-business-support",
  businessAccounting: "e2e-user-business-accounting",
  businessViewer: "e2e-user-business-viewer",
  businessOdkOnly: "e2e-user-business-odk-only",
  businessNoAccess: "e2e-user-business-noaccess",
  studentProfile: "e2e-student-profile",
  foreignStudentProfile: "e2e-student-profile-foreign",
  studentProfile3: "e2e-student-profile-3",
  studentProfile4: "e2e-student-profile-4",
  odkStudentProfile: "e2e-student-profile-odk",
  planForeignStudentProfile: "e2e-student-profile-plan-foreign",
  teacherProfile: "e2e-teacher-profile",
  otherTeacherProfile: "e2e-teacher-profile-foreign",
  group: "e2e-group",
  foreignGroup: "e2e-group-foreign",
  lesson: "e2e-lesson",
  previousLesson: "e2e-lesson-previous",
  recoveryLesson: "e2e-lesson-recovery",
  foreignLesson: "e2e-lesson-foreign",
  assignment: "e2e-assignment",
  recoveryAssignment: "e2e-assignment-recovery",
  evidenceAssignment: "e2e-assignment-evidence",
  foreignEvidenceAssignment: "e2e-assignment-evidence-foreign",
  evidenceCriteria: ["e2e-rubric-method", "e2e-rubric-check"],
  foreignEvidenceCriteria: ["e2e-rubric-foreign-method", "e2e-rubric-foreign-check"],
  foreignSubmission: "e2e-assignment-submission-foreign",
  material: "e2e-material",
  recoveryMaterial: "e2e-material-recovery",
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
  foreignRecoveryPackage: "e2e-recovery-package-foreign",
  foreignRecoveryItem: "e2e-recovery-item-foreign",
  privateCheckIn: "e2e-check-in-private",
  foreignCheckIn: "e2e-check-in-foreign",
  foreignHelpRequest: "e2e-help-request-foreign",
  odkExam: "e2e-odk-exam-live",
  odkVersion: "e2e-odk-version-live",
  odkSection: "e2e-odk-section-live",
  odkQuestion: "e2e-odk-question-live-1",
  odkQuestion2: "e2e-odk-question-live-2",
  odkAttempt: "e2e-odk-attempt-live",
  odkForeignAttempt: "e2e-odk-attempt-foreign",
  odkPilotRun: "e2e-odk-pilot-run",
};

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.CI !== "true") {
    throw new Error("E2E seed production ortamında çalıştırılamaz.");
  }

  const fallbackPassword = process.env.E2E_PASSWORD ?? "testpass123";
  const hashCache = new Map<string, string>();
  const hashFor = async (password: string) => {
    const cached = hashCache.get(password);
    if (cached) return cached;
    const next = await hashPassword(password);
    hashCache.set(password, next);
    return next;
  };
  const users = [
    { id: ids.admin, email: panelE2EAccounts.admin.email, password: panelE2EAccounts.admin.password, fullName: "E2E Yönetici", role: "ADMIN" as const },
    { id: ids.teacher, email: panelE2EAccounts.teacher.email, password: panelE2EAccounts.teacher.password, fullName: "E2E Öğretmen", role: "TEACHER" as const },
    { id: ids.otherTeacher, email: "other.teacher.e2e@example.com", fullName: "Başka Öğretmen", role: "TEACHER" as const },
    { id: ids.student, email: panelE2EAccounts.student.email, password: panelE2EAccounts.student.password, fullName: "Ada Öğrenci", role: "STUDENT" as const },
    { id: ids.foreignStudent, email: "foreign.student.e2e@example.com", fullName: "Bora Yabancı", role: "STUDENT" as const },
    { id: ids.student3, email: "student3.e2e@example.com", fullName: "Cem Öğrenci", role: "STUDENT" as const },
    { id: ids.student4, email: "student4.e2e@example.com", fullName: "Duru Öğrenci", role: "STUDENT" as const },
    { id: ids.odkStudent, email: panelE2EAccounts.odkStudent.email, password: panelE2EAccounts.odkStudent.password, fullName: "Ece ODK Öğrenci", role: "STUDENT" as const },
    { id: ids.planForeignStudent, email: "plan.foreign.student.e2e@example.com", fullName: "Yalnız Yabancı Öğrenci", role: "STUDENT" as const },
    { id: ids.parent, email: panelE2EAccounts.parent.email, password: panelE2EAccounts.parent.password, fullName: "E2E Veli", role: "PARENT" as const },
    // İşletme RBAC fixture'ları. Hepsi platformda ADMIN'dir; aralarındaki tek
    // fark BusinessRoleAssignment satırlarıdır. Böylece testler gerçekten
    // işletme rolünü ölçer, platform rolünü değil.
    { id: ids.businessSales, email: "business.sales.e2e@example.com", fullName: "E2E Satış", role: "ADMIN" as const },
    { id: ids.businessSupport, email: "business.support.e2e@example.com", fullName: "E2E Destek", role: "ADMIN" as const },
    { id: ids.businessAccounting, email: "business.accounting.e2e@example.com", fullName: "E2E Muhasebe", role: "ADMIN" as const },
    { id: ids.businessViewer, email: "business.viewer.e2e@example.com", fullName: "E2E İzleyici", role: "ADMIN" as const },
    { id: ids.businessOdkOnly, email: "business.odkonly.e2e@example.com", fullName: "E2E ODK Birim", role: "ADMIN" as const },
    { id: ids.businessNoAccess, email: "business.noaccess.e2e@example.com", fullName: "E2E Atamasız", role: "ADMIN" as const },
  ];

  const requiredFixtureEmails = [
    panelE2EAccounts.admin.email,
    panelE2EAccounts.teacher.email,
    panelE2EAccounts.student.email,
    panelE2EAccounts.parent.email,
    panelE2EAccounts.odkStudent.email,
  ];
  if (new Set(requiredFixtureEmails).size !== requiredFixtureEmails.length) {
    throw new Error("PANEL_E2E fixture email values must be distinct for admin/teacher/student/parent/odkStudent.");
  }

  for (const user of users) {
    const passwordHash = await hashFor(user.password ?? fallbackPassword);
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        passwordHash,
        mustChangePassword: false,
        inviteAcceptedAt: new Date(),
        passwordChangedAt: new Date(),
        status: "ACTIVE",
      },
      update: {
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        status: "ACTIVE",
        mustChangePassword: false,
        inviteAcceptedAt: new Date(),
        passwordChangedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  for (const userId of [ids.student, ids.parent]) {
    await prisma.productMembership.upsert({
      where: { userId_product: { userId, product: "OD" } },
      create: { userId, product: "OD", source: "MANUAL", grantedById: ids.admin, startsAt: new Date(0) },
      update: { revokedAt: null, expiresAt: null, startsAt: new Date(0), grantedById: ids.admin },
    });
  }
  /*
   * Online Koçum (OK) erişimi.
   *
   * Haftalık plan (`/panel/ogrenci/plan`) ve veli koçluk ekranı
   * `requireProductRole("OK", …)` ile korunuyor; tohumda hiçbir kullanıcıya OK
   * verilmediği için bu ekranlar e2e'de her zaman 404'e düşüyor ve adaptif plan
   * akışı hiç test edilmiyordu.
   */
  for (const userId of [ids.student, ids.parent]) {
    await prisma.productMembership.upsert({
      where: { userId_product: { userId, product: "OK" } },
      create: { userId, product: "OK", source: "MANUAL", grantedById: ids.admin, startsAt: new Date(0) },
      update: { revokedAt: null, expiresAt: null, startsAt: new Date(0), grantedById: ids.admin },
    });
  }
  await prisma.productMembership.deleteMany({ where: { userId: ids.odkStudent, product: "OD" } });
  await prisma.productMembership.upsert({ where: { userId_product: { userId: ids.odkStudent, product: "ODK" } }, create: { userId: ids.odkStudent, product: "ODK", source: "MANUAL", grantedById: ids.admin }, update: { revokedAt: null, expiresAt: null, startsAt: new Date(0), grantedById: ids.admin } });
  for (const userId of [ids.parent, ids.foreignStudent]) await prisma.productMembership.upsert({ where: { userId_product: { userId, product: "ODK" } }, create: { userId, product: "ODK", source: "MANUAL", grantedById: ids.admin, startsAt: new Date(0) }, update: { revokedAt: null, expiresAt: null, startsAt: new Date(0), grantedById: ids.admin } });

  await prisma.teacherProfile.upsert({ where: { userId: ids.teacher }, create: { id: ids.teacherProfile, userId: ids.teacher, subjects: ["Matematik"] }, update: { subjects: ["Matematik"] } });
  await prisma.teacherProfile.upsert({ where: { userId: ids.otherTeacher }, create: { id: ids.otherTeacherProfile, userId: ids.otherTeacher, subjects: ["Fen"] }, update: { subjects: ["Fen"] } });

  const profiles = [
    { id: ids.studentProfile, userId: ids.student },
    { id: ids.foreignStudentProfile, userId: ids.foreignStudent },
    { id: ids.studentProfile3, userId: ids.student3 },
    { id: ids.studentProfile4, userId: ids.student4 },
    { id: ids.odkStudentProfile, userId: ids.odkStudent },
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
  await prisma.accessibilityPreference.upsert({ where: { userId: ids.student }, create: { userId: ids.student }, update: { reducedMotion: false, highContrast: false, textScale: "DEFAULT", comfortableSpacing: false, captionsPreferred: false, transcriptPreferred: false, assessmentExtraPercent: 0, breaksAllowed: false, academicUpdatedById: null, academicUpdatedAt: null, version: 1 } });
  for (const userId of [ids.admin, ids.teacher, ids.student, ids.parent]) await prisma.networkPreference.upsert({ where: { userId }, create: { userId }, update: { lowDataMode: false, offlineWritesEnabled: false, version: 1 } });

  await prisma.group.upsert({ where: { id: ids.group }, create: { id: ids.group, name: "E2E LGS Grubu", subject: "Matematik", level: "8. Sınıf", teacherId: ids.teacher }, update: { teacherId: ids.teacher, isActive: true } });
  await prisma.group.upsert({ where: { id: ids.foreignGroup }, create: { id: ids.foreignGroup, name: "Yabancı Grup", subject: "Fen", level: "8. Sınıf", teacherId: ids.otherTeacher }, update: { teacherId: ids.otherTeacher, isActive: true } });
  await prisma.pilotCohort.deleteMany();
  await prisma.productEvent.deleteMany();

  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) {
    await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.group, studentId } }, create: { groupId: ids.group, studentId }, update: { endedAt: null } });
  }
  await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.foreignGroup, studentId: ids.foreignStudentProfile } }, create: { groupId: ids.foreignGroup, studentId: ids.foreignStudentProfile }, update: { endedAt: null } });
  await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.foreignGroup, studentId: ids.planForeignStudentProfile } }, create: { groupId: ids.foreignGroup, studentId: ids.planForeignStudentProfile }, update: { endedAt: null } });

  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  const previousStartsAt = new Date(Date.now() - 3 * 86400000);
  const recoveryStartsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.lesson.upsert({ where: { id: ids.lesson }, create: { id: ids.lesson, groupId: ids.group, teacherId: ids.teacher, title: "E2E Hızlı Ders Özeti", startsAt, endsAt: new Date(startsAt.getTime() + 3600000), meetingUrl: "https://example.com/e2e-class" }, update: { startsAt, endsAt: new Date(startsAt.getTime() + 3600000), meetingUrl: "https://example.com/e2e-class", status: "PLANNED", closeVersion: 0, closeIdempotencyKey: null, closeRequestHash: null, completedAt: null } });
  await prisma.lesson.upsert({ where: { id: ids.previousLesson }, create: { id: ids.previousLesson, groupId: ids.group, teacherId: ids.teacher, title: "Önceki Ders", startsAt: previousStartsAt, endsAt: new Date(previousStartsAt.getTime() + 3600000), status: "COMPLETED" }, update: { startsAt: previousStartsAt, status: "COMPLETED" } });
  await prisma.lesson.upsert({ where: { id: ids.recoveryLesson }, create: { id: ids.recoveryLesson, groupId: ids.group, teacherId: ids.teacher, title: "E2E Kaçırılan Köklü İfadeler Dersi", startsAt: recoveryStartsAt, endsAt: new Date(recoveryStartsAt.getTime() + 3600000), status: "COMPLETED" }, update: { startsAt: recoveryStartsAt, endsAt: new Date(recoveryStartsAt.getTime() + 3600000), teacherId: ids.teacher, status: "COMPLETED" } });
  await prisma.lesson.upsert({ where: { id: ids.foreignLesson }, create: { id: ids.foreignLesson, groupId: ids.foreignGroup, teacherId: ids.otherTeacher, title: "Yabancı Ders", startsAt: recoveryStartsAt, endsAt: new Date(recoveryStartsAt.getTime() + 3600000), status: "COMPLETED" }, update: { startsAt: recoveryStartsAt, endsAt: new Date(recoveryStartsAt.getTime() + 3600000), teacherId: ids.otherTeacher, status: "COMPLETED" } });

  await prisma.recoveryPackage.deleteMany({ where: { OR: [{ lessonId: ids.recoveryLesson }, { id: ids.foreignRecoveryPackage }] } });
  await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: { in: [ids.evidenceAssignment, ids.foreignEvidenceAssignment] } } });
  await prisma.studentCheckIn.deleteMany({ where: { OR: [{ studentId: ids.studentProfile }, { id: ids.foreignCheckIn }] } });
  await prisma.teacherAiDraft.deleteMany({ where: { teacherId: { in: [ids.teacher, ids.otherTeacher] } } });
  // Sliding-window sayaçları da fixture durumudur: temizlenmezse arka arkaya
  // koşan yerel/CI tekrarları API kotalarına (ör. ai-draft 20/15dk) takılıp
  // ürün hatası gibi görünen 429'lar üretiyor.
  await prisma.rateLimitEntry.deleteMany({
    where: {
      OR: [
        { key: { contains: "e2e-" } },
        { key: { contains: ":ip:2001:db8:" } },
      ],
    },
  });
  await prisma.attendance.deleteMany({ where: { lessonId: ids.lesson } });
  await prisma.attendance.deleteMany({ where: { lessonId: { in: [ids.recoveryLesson, ids.foreignLesson] } } });
  await prisma.lessonNote.deleteMany({ where: { lessonId: ids.lesson } });
  await prisma.lessonNote.deleteMany({ where: { lessonId: ids.recoveryLesson } });
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

  await prisma.lessonNote.create({ data: { lessonId: ids.recoveryLesson, topic: "Köklü ifadelerde telafi özeti", nextGoal: "Bir örnek çözüp ana adımı açıklamak", homework: "Kısa föyü ve iki soruluk çalışmayı tamamla." } });
  await prisma.lessonNote.create({ data: { lessonId: ids.recoveryLesson, studentId: ids.studentProfile, note: "ÖZEL TELAFİYE GİRMEMELİ" } });
  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) {
    await prisma.attendance.create({ data: { lessonId: ids.recoveryLesson, studentId, status: studentId === ids.studentProfile ? "ABSENT" : "PRESENT", note: studentId === ids.studentProfile ? "YOKLAMA NOTU TELAFİYE GİRMEMELİ" : null } });
  }
  await prisma.attendance.create({ data: { lessonId: ids.foreignLesson, studentId: ids.planForeignStudentProfile, status: "ABSENT" } });

  await prisma.curriculumVersion.upsert({ where: { code: "E2E-LGS-2026" }, create: { id: ids.curriculum, code: "E2E-LGS-2026", title: "E2E LGS 2026 Pilot Müfredatı", exam: "LGS", academicYear: 2026, status: "ACTIVE", createdById: ids.admin }, update: { status: "ACTIVE", title: "E2E LGS 2026 Pilot Müfredatı" } });
  await prisma.curriculumSubject.upsert({ where: { versionId_code: { versionId: ids.curriculum, code: "MAT" } }, create: { id: ids.curriculumSubject, versionId: ids.curriculum, code: "MAT", name: "Matematik" }, update: { name: "Matematik" } });
  await prisma.curriculumUnit.upsert({ where: { subjectId_code: { subjectId: ids.curriculumSubject, code: "KOK" } }, create: { id: ids.curriculumUnit, subjectId: ids.curriculumSubject, code: "KOK", name: "Köklü İfadeler" }, update: { name: "Köklü İfadeler" } });
  await prisma.curriculumSkill.upsert({ where: { versionId_code: { versionId: ids.curriculum, code: "problem-cozme" } }, create: { id: ids.curriculumSkill, versionId: ids.curriculum, code: "problem-cozme", name: "Problem çözme" }, update: { name: "Problem çözme" } });
  await prisma.learningOutcome.upsert({ where: { unitId_code: { unitId: ids.curriculumUnit, code: "MAT.8.1" } }, create: { id: ids.outcomeRoots, unitId: ids.curriculumUnit, code: "MAT.8.1", title: "Köklü ifadelerle dört işlem yapar." }, update: { title: "Köklü ifadelerle dört işlem yapar.", isActive: true } });
  await prisma.learningOutcome.upsert({ where: { unitId_code: { unitId: ids.curriculumUnit, code: "MAT.8.2" } }, create: { id: ids.outcomePowers, unitId: ids.curriculumUnit, code: "MAT.8.2", title: "Gerçek sayı problemlerinde uygun stratejiyi seçer." }, update: { title: "Gerçek sayı problemlerinde uygun stratejiyi seçer.", isActive: true } });
  await prisma.outcomeSkill.upsert({ where: { outcomeId_skillId: { outcomeId: ids.outcomeRoots, skillId: ids.curriculumSkill } }, create: { outcomeId: ids.outcomeRoots, skillId: ids.curriculumSkill }, update: {} });
  await prisma.outcomeSkill.upsert({ where: { outcomeId_skillId: { outcomeId: ids.outcomePowers, skillId: ids.curriculumSkill } }, create: { outcomeId: ids.outcomePowers, skillId: ids.curriculumSkill }, update: {} });

  const odkStartsAt = new Date(Date.now() - 2 * 60 * 1000);
  const odkEndsAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.odkScoringPolicy.upsert({ where: { code: "LGS_MATH_V1" }, create: { id: "e2e-odk-policy-lgs", code: "LGS_MATH_V1", title: "LGS Matematik · E2E", wrongPenalty: 3 }, update: { wrongPenalty: 3 } });
  await prisma.odkExam.upsert({ where: { id: ids.odkExam }, create: { id: ids.odkExam, title: "E2E Canlı Matematik Denemesi", slug: "e2e-canli-matematik-denemesi", family: "LGS", status: "SCHEDULED", startsAt: odkStartsAt, endsAt: odkEndsAt, lateEntryMinutes: 10, meetRequired: false, publishedAt: new Date(), createdById: ids.admin }, update: { status: "SCHEDULED", startsAt: odkStartsAt, endsAt: odkEndsAt, lateEntryMinutes: 10, meetRequired: false, publishedAt: new Date(), resultsReleasedAt: null, answerKeyReleasedAt: null } });
  const policy = await prisma.odkScoringPolicy.findUniqueOrThrow({ where: { code: "LGS_MATH_V1" } });
  await prisma.odkExamVersion.upsert({ where: { id: ids.odkVersion }, create: { id: ids.odkVersion, examId: ids.odkExam, versionNumber: 1, status: "LOCKED", durationMinutes: 60, scoringPolicyId: policy.id, createdById: ids.admin, lockedAt: new Date() }, update: { status: "LOCKED", durationMinutes: 60, scoringPolicyId: policy.id, lockedAt: new Date() } });
  await prisma.odkExamSection.upsert({ where: { id: ids.odkSection }, create: { id: ids.odkSection, versionId: ids.odkVersion, code: "MAT", title: "Matematik", position: 0, questionCount: 2 }, update: { questionCount: 2 } });
  await prisma.odkExamQuestion.upsert({ where: { id: ids.odkQuestion }, create: { id: ids.odkQuestion, sectionId: ids.odkSection, questionNumber: 1, position: 0, correctOption: "A", difficulty: "MEDIUM" }, update: { correctOption: "A", isActive: true } });
  await prisma.odkExamQuestion.upsert({ where: { id: ids.odkQuestion2 }, create: { id: ids.odkQuestion2, sectionId: ids.odkSection, questionNumber: 2, position: 1, correctOption: "B", difficulty: "MEDIUM" }, update: { correctOption: "B", position: 1, isActive: true } });
  await prisma.odkQuestionOutcome.upsert({ where: { questionId_outcomeId: { questionId: ids.odkQuestion, outcomeId: ids.outcomeRoots } }, create: { questionId: ids.odkQuestion, outcomeId: ids.outcomeRoots, isPrimary: true }, update: { isPrimary: true } });
  await prisma.odkQuestionOutcome.upsert({ where: { questionId_outcomeId: { questionId: ids.odkQuestion2, outcomeId: ids.outcomePowers } }, create: { questionId: ids.odkQuestion2, outcomeId: ids.outcomePowers, isPrimary: true }, update: { isPrimary: true } });
  await prisma.odkExam.update({ where: { id: ids.odkExam }, data: { currentVersionId: ids.odkVersion } });
  const e2eOdkPackage = await prisma.odkPackage.upsert({
    where: { slug: "e2e-odk-live-access" },
    create: { id: "e2e-odk-package-live", slug: "e2e-odk-live-access", title: "E2E ODK Canlı Erişim", priceCents: 9900, contractPolicy: odkContractPolicy },
    update: { title: "E2E ODK Canlı Erişim", priceCents: 9900, isActive: true, contractPolicy: odkContractPolicy },
  });
  await prisma.odkPackageExam.upsert({
    where: { packageId_examId: { packageId: e2eOdkPackage.id, examId: ids.odkExam } },
    create: { packageId: e2eOdkPackage.id, examId: ids.odkExam },
    update: {},
  });
  const e2eCatalogVersion = (await prisma.odkPackage.findUniqueOrThrow({ where: { id: e2eOdkPackage.id }, select: { contractVersion: true } })).contractVersion;
  const e2eContractSnapshot = { schemaVersion: 1, catalogVersion: e2eCatalogVersion, capturedAt: new Date().toISOString(), package: { id: e2eOdkPackage.id, slug: e2eOdkPackage.slug, title: e2eOdkPackage.title, description: e2eOdkPackage.description, priceCents: e2eOdkPackage.priceCents, originalPriceCents: e2eOdkPackage.originalPriceCents }, policy: odkContractPolicy, exams: [{ id: ids.odkExam, seriesId: null, seriesTitle: null, title: "E2E Canlı Matematik Denemesi", slug: "e2e-canli-matematik-denemesi", family: "LGS", startsAt: odkStartsAt.toISOString(), endsAt: odkEndsAt.toISOString(), lateEntryMinutes: 10, attemptLimit: 1, resultsReleasedAt: null, answerKeyReleasedAt: null, liveServiceRequired: false }] };
  for (const userId of [ids.odkStudent, ids.foreignStudent]) {
    const orderId = `e2e-odk-access-${userId}`;
    await prisma.odkOrder.upsert({
      where: { id: orderId },
      create: { id: orderId, packageId: e2eOdkPackage.id, status: "PAID", subtotalCents: 9900, totalCents: 9900, studentUserId: userId, provisioningStatus: "SUCCEEDED", provisionedAt: new Date(), buyerInfo: { email: users.find((user) => user.id === userId)?.email }, contractSnapshot: e2eContractSnapshot },
      update: { status: "PAID", studentUserId: userId, provisioningStatus: "SUCCEEDED", provisioningError: null, provisionedAt: new Date() },
    });
    await prisma.odkEntitlement.upsert({
      where: { orderId },
      create: { orderId, userId, packageId: e2eOdkPackage.id, startsAt: new Date(0), contractSnapshot: e2eContractSnapshot },
      update: { userId, packageId: e2eOdkPackage.id, startsAt: new Date(0), expiresAt: null, revokedAt: null },
    });
  }
  await prisma.odkExamAttempt.deleteMany({ where: { examId: ids.odkExam } });
  await prisma.odkExamAttempt.create({ data: { id: ids.odkAttempt, examId: ids.odkExam, versionId: ids.odkVersion, studentUserId: ids.odkStudent, attemptNumber: 1, status: "IN_PROGRESS", startedAt: new Date(), deadlineAt: odkEndsAt, lastActivityAt: new Date() } });
  await prisma.odkExamAttempt.create({ data: { id: ids.odkForeignAttempt, examId: ids.odkExam, versionId: ids.odkVersion, studentUserId: ids.foreignStudent, attemptNumber: 1, status: "IN_PROGRESS", startedAt: new Date(), deadlineAt: odkEndsAt, lastActivityAt: new Date() } });
  await prisma.odkPilotRun.deleteMany({ where: { id: ids.odkPilotRun } });
  await prisma.odkPilotRun.create({ data: { id: ids.odkPilotRun, name: "E2E ODK kontrollü pilot", status: "ACTIVE", createdById: ids.admin, requestKey: "00000000-0000-4000-8000-000000000063", version: 2, startedAt: new Date(), members: { create: [{ userId: ids.admin, role: "ADMIN" }, { userId: ids.teacher, role: "TEACHER" }, { userId: ids.odkStudent, role: "STUDENT" }, { userId: ids.parent, role: "PARENT" }] } } });

  await prisma.lessonOutcome.upsert({ where: { lessonId_outcomeId: { lessonId: ids.previousLesson, outcomeId: ids.outcomeRoots } }, create: { lessonId: ids.previousLesson, outcomeId: ids.outcomeRoots, evidenceType: "NEEDS_REVIEW", linkedById: ids.teacher }, update: { evidenceType: "NEEDS_REVIEW", linkedById: ids.teacher } });
  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) await prisma.attendance.upsert({ where: { lessonId_studentId: { lessonId: ids.previousLesson, studentId } }, create: { lessonId: ids.previousLesson, studentId, status: "PRESENT" }, update: { status: "PRESENT" } });

  await prisma.assignment.upsert({ where: { id: ids.assignment }, create: { id: ids.assignment, groupId: ids.group, lessonId: ids.lesson, createdById: ids.teacher, title: "E2E Yeni Nesil Sorular", description: "1–12. soruları çöz ve yanlışlarını işaretle.", dueAt: new Date(Date.now() + 2 * 86400000) }, update: { isActive: true, dueAt: new Date(Date.now() + 2 * 86400000) } });
  await prisma.assignmentOutcome.upsert({ where: { assignmentId_outcomeId: { assignmentId: ids.assignment, outcomeId: ids.outcomePowers } }, create: { assignmentId: ids.assignment, outcomeId: ids.outcomePowers, linkedById: ids.teacher }, update: { linkedById: ids.teacher } });
  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) {
    await prisma.assignmentProgress.upsert({ where: { assignmentId_studentId: { assignmentId: ids.assignment, studentId } }, create: { assignmentId: ids.assignment, studentId }, update: { status: "TODO", completedAt: null, version: 1, lastMutationKey: null } });
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
  await prisma.studentCheckIn.create({ data: { id: ids.privateCheckIn, studentId: ids.studentProfile, groupId: ids.group, energy: "STEADY", confidence: "BUILDING", barrier: "NONE", shareWithTeacher: false } });
  await prisma.studentCheckIn.create({ data: { id: ids.foreignCheckIn, studentId: ids.planForeignStudentProfile, groupId: ids.foreignGroup, energy: "LOW", confidence: "NEED_GUIDANCE", barrier: "ACCESS_TECH", shareWithTeacher: true, helpRequest: { create: { id: ids.foreignHelpRequest, studentId: ids.planForeignStudentProfile, groupId: ids.foreignGroup, dueAt: new Date(Date.now() + 86400000) } } } });
  await prisma.learningMaterial.upsert({ where: { id: ids.material }, create: { id: ids.material, groupId: ids.group, lessonId: ids.lesson, createdById: ids.teacher, title: "E2E Köklü İfadeler Föyü", description: "Ders sonrası tekrar kaynağı", url: "https://example.com/e2e-material.pdf", kind: "PDF" }, update: { isActive: true } });
  await prisma.learningMaterial.upsert({ where: { id: ids.recoveryMaterial }, create: { id: ids.recoveryMaterial, groupId: ids.group, lessonId: ids.recoveryLesson, createdById: ids.teacher, title: "E2E Erişilebilir Köklü İfadeler Videosu", description: "Altyazı ve metin alternatifi olan kısa ortak kaynak", url: "https://example.com/e2e-recovery.mp4", kind: "VIDEO", captionsAvailable: true, transcript: "Köklü ifadelerde önce kök içindeki ortak çarpanı belirle. Ardından sadeleştirme adımını kontrol et." }, update: { lessonId: ids.recoveryLesson, title: "E2E Erişilebilir Köklü İfadeler Videosu", description: "Altyazı ve metin alternatifi olan kısa ortak kaynak", url: "https://example.com/e2e-recovery.mp4", kind: "VIDEO", captionsAvailable: true, transcript: "Köklü ifadelerde önce kök içindeki ortak çarpanı belirle. Ardından sadeleştirme adımını kontrol et.", isActive: true } });
  await prisma.assignment.upsert({ where: { id: ids.recoveryAssignment }, create: { id: ids.recoveryAssignment, groupId: ids.group, lessonId: ids.recoveryLesson, createdById: ids.teacher, title: "E2E Telafi İki Soru", description: "Ana adımı iki kısa soruda uygula.", dueAt: new Date(recoveryStartsAt.getTime() + 73 * 60 * 60 * 1000) }, update: { lessonId: ids.recoveryLesson, isActive: true, dueAt: new Date(recoveryStartsAt.getTime() + 73 * 60 * 60 * 1000) } });
  await prisma.assignmentProgress.upsert({ where: { assignmentId_studentId: { assignmentId: ids.recoveryAssignment, studentId: ids.studentProfile } }, create: { assignmentId: ids.recoveryAssignment, studentId: ids.studentProfile }, update: { status: "TODO", completedAt: null, version: 1, lastMutationKey: null } });
  await prisma.assignment.upsert({ where: { id: ids.evidenceAssignment }, create: { id: ids.evidenceAssignment, groupId: ids.group, lessonId: ids.previousLesson, createdById: ids.teacher, title: "E2E Kanıtlı Problem Çözümü", description: "Çözüm yolunu ve son kontrolünü kısa biçimde açıkla.", dueAt: new Date(Date.now() + 2 * 86400000), evidenceRequired: true }, update: { isActive: true, evidenceRequired: true, dueAt: new Date(Date.now() + 2 * 86400000) } });
  await prisma.assignmentRubricCriterion.upsert({ where: { assignmentId_position: { assignmentId: ids.evidenceAssignment, position: 1 } }, create: { id: ids.evidenceCriteria[0], assignmentId: ids.evidenceAssignment, position: 1, label: "Çözüm yolunu açıkça gösterir" }, update: { label: "Çözüm yolunu açıkça gösterir" } });
  await prisma.assignmentRubricCriterion.upsert({ where: { assignmentId_position: { assignmentId: ids.evidenceAssignment, position: 2 } }, create: { id: ids.evidenceCriteria[1], assignmentId: ids.evidenceAssignment, position: 2, label: "Sonucunu kontrol eder" }, update: { label: "Sonucunu kontrol eder" } });
  await prisma.assignmentProgress.upsert({ where: { assignmentId_studentId: { assignmentId: ids.evidenceAssignment, studentId: ids.studentProfile } }, create: { assignmentId: ids.evidenceAssignment, studentId: ids.studentProfile }, update: { status: "TODO", completedAt: null, version: 1, lastMutationKey: null } });
  await prisma.assignment.upsert({ where: { id: ids.foreignEvidenceAssignment }, create: { id: ids.foreignEvidenceAssignment, groupId: ids.foreignGroup, lessonId: ids.foreignLesson, createdById: ids.otherTeacher, title: "Yabancı kanıtlı çalışma", dueAt: new Date(Date.now() + 2 * 86400000), evidenceRequired: true }, update: { isActive: true, evidenceRequired: true } });
  await prisma.assignmentRubricCriterion.upsert({ where: { assignmentId_position: { assignmentId: ids.foreignEvidenceAssignment, position: 1 } }, create: { id: ids.foreignEvidenceCriteria[0], assignmentId: ids.foreignEvidenceAssignment, position: 1, label: "Yabancı ölçüt bir" }, update: { label: "Yabancı ölçüt bir" } });
  await prisma.assignmentRubricCriterion.upsert({ where: { assignmentId_position: { assignmentId: ids.foreignEvidenceAssignment, position: 2 } }, create: { id: ids.foreignEvidenceCriteria[1], assignmentId: ids.foreignEvidenceAssignment, position: 2, label: "Yabancı ölçüt iki" }, update: { label: "Yabancı ölçüt iki" } });
  await prisma.assignmentProgress.upsert({ where: { assignmentId_studentId: { assignmentId: ids.foreignEvidenceAssignment, studentId: ids.planForeignStudentProfile } }, create: { assignmentId: ids.foreignEvidenceAssignment, studentId: ids.planForeignStudentProfile, status: "IN_PROGRESS" }, update: { status: "IN_PROGRESS", completedAt: null, version: 1, lastMutationKey: null } });
  await prisma.assignmentSubmission.create({ data: { id: ids.foreignSubmission, assignmentId: ids.foreignEvidenceAssignment, studentId: ids.planForeignStudentProfile, attemptNumber: 1, textEvidence: "Yabancı öğrencinin yalnız kendi öğretmeninin görebileceği kanıt metni.", idempotencyKey: "e2e-user-plan-foreign:foreign_submission_key_001" } });
  await prisma.learningMaterial.upsert({
    where: { id: ids.foreignPrivateMaterial },
    create: { id: ids.foreignPrivateMaterial, groupId: ids.foreignGroup, lessonId: ids.foreignLesson, createdById: ids.otherTeacher, title: "Yabancı Private Materyal", url: "private://e2e/foreign.pdf", blobPathname: "e2e/foreign.pdf", fileName: "foreign.pdf", mimeType: "application/pdf", kind: "PDF" },
    update: { groupId: ids.foreignGroup, isActive: true, blobPathname: "e2e/foreign.pdf" },
  });
  await prisma.recoveryPackage.create({ data: { id: ids.foreignRecoveryPackage, lessonId: ids.foreignLesson, studentId: ids.planForeignStudentProfile, status: "PUBLISHED", summaryTopic: "Yabancı öğrencinin telafi özeti", summaryNextStep: "Yabancı küçük adım", checkpointPrompt: "Bu dersin ana adımını açıklayabilir misin?", dueAt: new Date(recoveryStartsAt.getTime() + 73 * 60 * 60 * 1000), generatedById: ids.otherTeacher, publishedById: ids.otherTeacher, publishedAt: new Date(), version: 2, items: { create: { id: ids.foreignRecoveryItem, kind: "MATERIAL", position: 1, title: "Yabancı kaynak", materialId: ids.foreignPrivateMaterial } } } });
  const businessUnit = await prisma.businessUnit.upsert({ where: { product: "OD" }, update: { isActive: true }, create: { code: "OD", name: "OnlineDershanem", product: "OD" } });
  const businessConnection = await prisma.integrationConnection.upsert({ where: { businessUnitId_provider_displayName: { businessUnitId: businessUnit.id, provider: "INSTAGRAM", displayName: "E2E Instagram" } }, update: {}, create: { businessUnitId: businessUnit.id, provider: "INSTAGRAM", displayName: "E2E Instagram", status: "CONNECTED", config: { mock: true } } });
  const businessAccount = await prisma.instagramAccount.upsert({ where: { externalId: "e2e-instagram-account" }, update: {}, create: { businessUnitId: businessUnit.id, connectionId: businessConnection.id, externalId: "e2e-instagram-account", username: "e2e_instagram", aiMode: "SUGGESTION" } });
  const businessConversation = await prisma.businessConversation.upsert({ where: { instagramAccountId_instagramScopedUserId: { instagramAccountId: businessAccount.id, instagramScopedUserId: "e2e-instagram-user" } }, update: { status: "OPEN", unreadCount: 1 }, create: { businessUnitId: businessUnit.id, instagramAccountId: businessAccount.id, instagramScopedUserId: "e2e-instagram-user", username: "e2e_aday", displayName: "E2E Instagram Adayı", status: "OPEN", temperature: "HOT", unreadCount: 1 } });
  await prisma.businessMessage.upsert({ where: { idempotencyKey: "e2e-business-message" }, update: {}, create: { conversationId: businessConversation.id, externalId: "e2e-business-mid", direction: "INBOUND", senderType: "CUSTOMER", body: "Paket fiyatını öğrenebilir miyim?", status: "RECEIVED", idempotencyKey: "e2e-business-message", occurredAt: new Date() } });
  await prisma.businessLead.upsert({ where: { conversationId: businessConversation.id }, update: { stage: "NEW" }, create: { businessUnitId: businessUnit.id, conversationId: businessConversation.id, instagramScopedId: "e2e-instagram-user", firstName: "E2E Aday", source: "INSTAGRAM_ORGANIC", temperature: "HOT", stage: "NEW", tags: [] } });
  await prisma.notification.upsert({ where: { id: ids.parentNotification }, create: { id: ids.parentNotification, userId: ids.parent, type: "SYSTEM", title: "E2E panel hazır", body: "Bildirim merkezi kabul testi için hazır.", href: "/panel/veli" }, update: { readAt: null } });
  await prisma.emailOutbox.upsert({ where: { id: ids.emailOutbox }, create: { id: ids.emailOutbox, recipients: JSON.stringify(["receipt.e2e@example.com"]), subject: "E2E ödeme makbuzu", html: "<p>E2E makbuz</p>", status: "FAILED", attempts: 2, lastError: "E2E gönderim hatası", nextRetryAt: new Date() }, update: { status: "FAILED", attempts: 2, lastError: "E2E gönderim hatası", nextRetryAt: new Date() } });

  // İkinci iş birimi — çok kiracılı izolasyon testleri için gereklidir.
  const odkUnit = await prisma.businessUnit.upsert({ where: { product: "ODK" }, update: { isActive: true }, create: { code: "ODK", name: "OnlineDenemeKulübü", product: "ODK" } });
  await prisma.businessLead.upsert({ where: { id: "e2e-lead-odk-unit" }, update: { stage: "NEW" }, create: { id: "e2e-lead-odk-unit", businessUnitId: odkUnit.id, firstName: "ODK Birimi Adayı", source: "MANUAL", temperature: "WARM", stage: "NEW", tags: [] } });

  // İşletme erişimi YALNIZ bu atamalardan gelir. Platform ADMIN rolü tek
  // başına hiçbir işletme izni vermez (bkz. lib/business/permissions.ts).
  const assignments: Array<{ userId: string; businessUnitId: string; role: "SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT" | "ACCOUNTING" | "VIEWER" }> = [
    { userId: ids.admin, businessUnitId: businessUnit.id, role: "SUPER_ADMIN" },
    { userId: ids.admin, businessUnitId: odkUnit.id, role: "SUPER_ADMIN" },
    { userId: ids.businessSales, businessUnitId: businessUnit.id, role: "SALES" },
    { userId: ids.businessSupport, businessUnitId: businessUnit.id, role: "SUPPORT" },
    { userId: ids.businessAccounting, businessUnitId: businessUnit.id, role: "ACCOUNTING" },
    { userId: ids.businessViewer, businessUnitId: businessUnit.id, role: "VIEWER" },
    // Yalnız ODK birimine erişir — OD birimini görememelidir.
    { userId: ids.businessOdkOnly, businessUnitId: odkUnit.id, role: "ADMIN" },
    // businessNoAccess bilinçli olarak atamasızdır.
  ];
  for (const assignment of assignments) {
    await prisma.businessRoleAssignment.upsert({
      where: { userId_businessUnitId_role: assignment },
      update: {},
      create: assignment,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
