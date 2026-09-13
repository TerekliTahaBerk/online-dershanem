/**
 * Deneme ataması — grup / sınıf / cohort / paket üyelerini öğrenci ID listesine çözer.
 * Assignment snapshot sonradan grup değişse bile korunur (yazım anı).
 */

import { prisma } from "@/lib/prisma";

export type AssignmentSource = "STUDENT" | "GROUP" | "CLASS" | "COHORT" | "BULK";

export type ResolveAssignmentInput = {
  studentUserIds?: string[];
  studentEmails?: string[];
  groupId?: string;
  classId?: string;
  /** classLevel string (ör. "12") — classId yoksa kullanılır */
  classLevel?: string;
  cohortId?: string;
  /** ODK paket entitlement cohort */
  packageId?: string;
  source?: AssignmentSource;
};

export type ResolveAssignmentResult = {
  studentUserIds: string[];
  source: AssignmentSource;
  sourceRefId: string | null;
  resolvedFrom: string;
};

export async function resolveAssignmentStudents(input: ResolveAssignmentInput): Promise<ResolveAssignmentResult> {
  const explicit = [...new Set((input.studentUserIds || []).filter(Boolean))];
  const emails = [...new Set((input.studentEmails || []).map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (emails.length) {
    const byEmail = await prisma.user.findMany({
      where: { email: { in: emails }, role: "STUDENT", status: "ACTIVE" },
      select: { id: true },
    });
    const ids = [...new Set([...explicit, ...byEmail.map((row) => row.id)])];
    return {
      studentUserIds: ids,
      source: input.source || (ids.length > 1 ? "BULK" : "STUDENT"),
      sourceRefId: null,
      resolvedFrom: "studentEmails",
    };
  }
  if (explicit.length) {
    return {
      studentUserIds: explicit,
      source: input.source || (explicit.length > 1 ? "BULK" : "STUDENT"),
      sourceRefId: null,
      resolvedFrom: "studentUserIds",
    };
  }

  if (input.groupId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { groupId: input.groupId, endedAt: null, group: { isActive: true }, student: { user: { role: "STUDENT", status: "ACTIVE" } } },
      select: { student: { select: { userId: true } } },
    });
    return {
      studentUserIds: [...new Set(enrollments.map((row) => row.student.userId))],
      source: "GROUP",
      sourceRefId: input.groupId,
      resolvedFrom: "group",
    };
  }

  const classLevel = input.classLevel || input.classId;
  if (classLevel) {
    const profiles = await prisma.studentProfile.findMany({
      where: { classLevel, user: { role: "STUDENT", status: "ACTIVE" } },
      select: { userId: true },
      take: 2000,
    });
    return {
      studentUserIds: profiles.map((row) => row.userId),
      source: "CLASS",
      sourceRefId: classLevel,
      resolvedFrom: "classLevel",
    };
  }

  if (input.cohortId) {
    const members = await prisma.odkPilotMember.findMany({
      where: { runId: input.cohortId, role: "STUDENT", user: { status: "ACTIVE" } },
      select: { userId: true },
    });
    if (members.length) {
      return {
        studentUserIds: members.map((row) => row.userId),
        source: "COHORT",
        sourceRefId: input.cohortId,
        resolvedFrom: "odkPilotRun",
      };
    }
    const pilotMembers = await prisma.pilotCohortMember.findMany({
      where: { cohortId: input.cohortId, role: "STUDENT", user: { status: "ACTIVE" } },
      select: { userId: true },
    });
    return {
      studentUserIds: pilotMembers.map((row) => row.userId),
      source: "COHORT",
      sourceRefId: input.cohortId,
      resolvedFrom: "pilotCohort",
    };
  }

  if (input.packageId) {
    const now = new Date();
    const entitlements = await prisma.odkEntitlement.findMany({
      where: {
        packageId: input.packageId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        user: { role: "STUDENT", status: "ACTIVE" },
      },
      select: { userId: true },
      take: 5000,
    });
    return {
      studentUserIds: [...new Set(entitlements.map((row) => row.userId))],
      source: "COHORT",
      sourceRefId: input.packageId,
      resolvedFrom: "packageEntitlement",
    };
  }

  return { studentUserIds: [], source: input.source || "STUDENT", sourceRefId: null, resolvedFrom: "none" };
}
