import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeOptional, normalizePhone } from "@/lib/admin";

type StudentSyncPayload = {
  fullName: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  district?: string | null;
  schoolName?: string | null;
  classLevel?: string | null;
  department?: string | null;
  examType?: string | null;
  currentLevel?: string | null;
  currentNet?: string | null;
  targetGoal?: string | null;
  targetSchool?: string | null;
  targetRanking?: string | null;
  strongLessons?: string | null;
  weakLessons?: string | null;
  needType?: string | null;
  studyStatus?: string | null;
  weeklyStudyHours?: string | null;
  parentFullName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  source?: string | null;
  activePackage?: string | null;
  submittedAt?: Date | null;
};

function buildStudentData(payload: StudentSyncPayload): Prisma.StudentUncheckedCreateInput {
  return {
    fullName: payload.fullName,
    phone: payload.phone,
    phoneKey: normalizePhone(payload.phone),
    email: normalizeOptional(payload.email),
    city: normalizeOptional(payload.city),
    district: normalizeOptional(payload.district),
    schoolName: normalizeOptional(payload.schoolName),
    classLevel: normalizeOptional(payload.classLevel),
    department: normalizeOptional(payload.department),
    examType: normalizeOptional(payload.examType),
    currentLevel: normalizeOptional(payload.currentLevel),
    currentNet: normalizeOptional(payload.currentNet),
    targetGoal: normalizeOptional(payload.targetGoal),
    targetSchool: normalizeOptional(payload.targetSchool),
    targetRanking: normalizeOptional(payload.targetRanking),
    strongLessons: normalizeOptional(payload.strongLessons),
    weakLessons: normalizeOptional(payload.weakLessons),
    needType: normalizeOptional(payload.needType),
    studyStatus: normalizeOptional(payload.studyStatus),
    weeklyStudyHours: normalizeOptional(payload.weeklyStudyHours),
    parentFullName: normalizeOptional(payload.parentFullName),
    parentPhone: normalizeOptional(payload.parentPhone),
    parentEmail: normalizeOptional(payload.parentEmail),
    source: normalizeOptional(payload.source),
    activePackage: normalizeOptional(payload.activePackage),
    submittedAt: payload.submittedAt ?? undefined
  };
}

async function upsertStudent(payload: StudentSyncPayload) {
  const phoneKey = normalizePhone(payload.phone);

  if (!phoneKey) {
    return null;
  }

  const data = buildStudentData(payload);

  return prisma.student.upsert({
    where: { phoneKey },
    update: {
      ...data,
      phoneKey: undefined
    },
    create: data
  });
}

export async function syncStudentFromLeadSubmission(leadId: string) {
  const submission = await prisma.leadSubmission.findUnique({
    where: { id: leadId }
  });

  if (!submission) {
    return null;
  }

  const student = await upsertStudent({
    fullName: submission.fullName,
    phone: submission.phone,
    classLevel: submission.classLevel,
    examType: submission.examType,
    targetGoal: submission.targetGoal,
    currentNet: submission.currentNet,
    parentPhone: submission.parentPhone,
    source: submission.source,
    submittedAt: submission.submittedAt
  });

  if (student && submission.studentId !== student.id) {
    await prisma.leadSubmission.update({
      where: { id: submission.id },
      data: {
        studentId: student.id
      }
    });
  }

  return student;
}

export async function syncStudentFromPurchaseIntent(purchaseId: string) {
  const submission = await prisma.purchaseIntent.findUnique({
    where: { id: purchaseId }
  });

  if (!submission) {
    return null;
  }

  const student = await upsertStudent({
    fullName: submission.studentFullName,
    phone: submission.studentPhone,
    email: submission.studentEmail,
    city: submission.city,
    district: submission.district,
    schoolName: submission.schoolName,
    classLevel: submission.classLevel,
    department: submission.department,
    examType: submission.examType,
    currentLevel: submission.currentLevel,
    currentNet: submission.currentNet,
    targetSchool: submission.targetSchool,
    targetRanking: submission.targetRanking,
    strongLessons: submission.strongLessons,
    weakLessons: submission.weakLessons,
    needType: submission.needType,
    studyStatus: submission.studyStatus,
    weeklyStudyHours: submission.weeklyStudyHours,
    parentFullName: submission.parentFullName,
    parentPhone: submission.parentPhone,
    parentEmail: submission.parentEmail,
    source: submission.source,
    activePackage: submission.packageName,
    submittedAt: submission.submittedAt
  });

  if (student && submission.studentId !== student.id) {
    await prisma.purchaseIntent.update({
      where: { id: submission.id },
      data: {
        studentId: student.id
      }
    });
  }

  return student;
}
