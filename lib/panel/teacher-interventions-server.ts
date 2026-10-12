import "server-only";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getInterventionInbox, listInterventionStudentOptions } from "@/lib/intervention-inbox-server";
import { toMobileInterventionInbox } from "@/lib/mobile/admin-views";
import { operationDigest } from "./group-mutation-core";

export async function loadTeacherInterventions(teacherId: string, db: PrismaClient = prisma) {
  const [rows, students, scope] = await Promise.all([
    getInterventionInbox({ role: "TEACHER", userId: teacherId, groupByStudent: false, trackView: false }, db),
    listInterventionStudentOptions(teacherId, db),
    db.group.findMany({ where: { teacherId, isActive: true }, orderBy: { id: "asc" }, select: { id: true, updatedAt: true, enrollments: { where: { endedAt: null, student: { user: { status: "ACTIVE" } } }, orderBy: { id: "asc" }, select: { id: true, studentId: true, startedAt: true } } } }),
  ]);
  // Independent case rows retain their own owner, version and history. A pupil may have several episodes.
  return { ...toMobileInterventionInbox(rows, students), revision: operationDigest({ scope, rows: [...rows].sort((a, b) => a.id.localeCompare(b.id)), students }) };
}

export async function canWriteTeacherIntervention(teacherId: string, command: { operation: "create"; input: { studentId: string } } | { operation: "update"; id: string } | { operation: "generate" }, db: PrismaClient = prisma) {
  const student = { user: { status: "ACTIVE" as const }, enrollments: { some: { endedAt: null, group: { teacherId, isActive: true } } } };
  if (command.operation === "create") return Boolean(await db.studentProfile.findFirst({ where: { id: command.input.studentId, ...student }, select: { id: true } }));
  if (command.operation === "update") return Boolean(await db.interventionCase.findFirst({ where: { id: command.id, student, OR: [{ ownerId: null }, { ownerId: teacherId }] }, select: { id: true } }));
  return true;
}
