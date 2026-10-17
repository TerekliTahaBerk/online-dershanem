import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { odkExamRevision } from "@/lib/mobile/odk-exam-views";
import type { UserRole } from "@prisma/client";
import { assignmentCreateSchema, releaseCommitSchema, rescoreSchema, updateExamScheduleSchema } from "@/lib/odk/admin-schemas";
import { assignOdkExam, commitOdkImport, lockOdkExam, updateOdkExamQuestion, previewOdkImport, scheduleOdkExam, updateOdkExamSchedule, updateOdkExamSessions } from "@/lib/odk/exam-commands-server";
import { releaseOdkExam, rescoreOdkExamCommand, scoreOdkExamCommand } from "@/lib/odk/exam-results-commands";
import { runEducationMutation } from "@/lib/panel/education-write";
import { GroupMutationError, operationDigest, readGroupReceipt } from "@/lib/panel/group-mutation-core";

/**
 * K03b · Mobil deneme hazırlık komutu — web `/api/odk/admin/exams/[id]/**`
 * uçlarıyla AYNI servisler (`exam-commands-server`) ve aynı izinler.
 * Kayıt + audit + makbuz tek Serializable transaction; çalışma alanı
 * `revision` transaction içinde yeniden hesaplanır; ürünler arası olaylar
 * commit sonrası. Kural reddi web ucuyla aynı mesaj/durumla
 * `GroupMutationError` olarak döner (makbuz yazılmaz).
 */
const sessionsInput = z.array(z.object({ key: z.string().min(1).max(40), durationMinutes: z.number().int(), breakAfterMinutes: z.number().int() })).min(2).max(6);
const questionEdit = z.object({
  id: z.string().min(1),
  correctOption: z.enum(["A", "B", "C", "D", "E"]).nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  bookletPage: z.number().int().min(1).max(1000).nullable(),
  outcomeIds: z.array(z.string().min(1)).max(3),
  primaryOutcomeId: z.string().min(1).nullable(),
}).strict().refine((value) => !value.primaryOutcomeId || value.outcomeIds.includes(value.primaryOutcomeId), { message: "Ana kazanım, bağlı kazanımlar içinde olmalıdır." });
export const odkExamCommandSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("update"), input: updateExamScheduleSchema }).strict(),
  z.object({ operation: z.literal("ready") }).strict(),
  z.object({ operation: z.literal("schedule") }).strict(),
  z.object({ operation: z.literal("sessions"), sessions: sessionsInput }).strict(),
  z.object({ operation: z.literal("assign"), input: assignmentCreateSchema }).strict(),
  z.object({ operation: z.literal("import.preview"), kind: z.enum(["answer-key", "outcomes"]), payload: z.unknown() }).strict(),
  z.object({ operation: z.literal("import.commit"), kind: z.enum(["answer-key", "outcomes"]), importId: z.string().min(1).max(64) }).strict(),
  z.object({ operation: z.literal("question.update"), question: questionEdit }).strict(),
  // K03c · puanlama ve yayın (yeniden puanlama ve yayın taze step-up ister).
  z.object({ operation: z.literal("score") }).strict(),
  z.object({ operation: z.literal("rescore"), input: rescoreSchema }).strict(),
  z.object({ operation: z.literal("release"), input: releaseCommitSchema }).strict(),
]);
export type OdkExamCommandInput = z.output<typeof odkExamCommandSchema>;
export const ODK_EXAM_COMMAND_PERMISSION = { update: "odk:exam:edit", "question.update": "odk:exam:edit", ready: "odk:exam:edit", sessions: "odk:exam:edit", "import.preview": "odk:exam:edit", "import.commit": "odk:exam:edit", schedule: "odk:exam:schedule", assign: "odk:exam:assign", score: "odk:result:score", rescore: "odk:key:revise", release: "odk:result:release" } as const;
/** Web uçlarıyla aynı: `requireApiRecentStaffStepUp`. */
export const ODK_EXAM_STEP_UP_OPERATIONS: ReadonlySet<OdkExamCommandInput["operation"]> = new Set(["rescore", "release"]);

export async function runOdkExamCommand(input: { examId: string; actorId: string; actorRole: UserRole; idempotencyKey: string; expectedRevision: string; command: OdkExamCommandInput }): Promise<{ body: unknown; replayed: boolean }> {
  const { examId, actorId, command } = input;
  const key = `odk-exam:${actorId}:${input.idempotencyKey}`;
  const digest = operationDigest({ examId, command, revision: input.expectedRevision });
  try {
    const result = await runEducationMutation({ lockName: `odk-exam:${examId}`, key, digest, actorId, kind: "odk-exam", targetKind: "odk-exam", entityId: examId, action: `odk.native.exam.${command.operation}`, execute: async (db) => {
      const current = await db.odkExam.findUnique({ where: { id: examId }, select: { id: true, status: true, updatedAt: true, currentVersion: { select: { id: true, status: true, updatedAt: true } } } });
      if (!current?.currentVersion) throw new GroupMutationError("NOT_FOUND", "Denemeyi bulamadık.", 404);
      if (odkExamRevision({ exam: current, version: current.currentVersion }) !== input.expectedRevision) throw new GroupMutationError("ODK_CONFLICT", "Deneme başka bir işlemde değişti. Güncel çalışma alanını kontrol edin.");
      const response = await (() => {
        switch (command.operation) {
          case "update": return updateOdkExamSchedule(examId, command.input, actorId, db);
          case "ready": return lockOdkExam(examId, actorId, db);
          case "schedule": return scheduleOdkExam(examId, actorId, db);
          case "sessions": return updateOdkExamSessions(examId, command.sessions, actorId, db);
          case "assign": return assignOdkExam(examId, command.input, actorId, db);
          case "import.preview": return previewOdkImport(command.kind, examId, command.payload, actorId, db);
          case "import.commit": return commitOdkImport(command.kind, examId, command.importId, actorId, db);
          case "question.update": return updateOdkExamQuestion(examId, command.question, actorId, db);
          case "score": return scoreOdkExamCommand(examId, { userId: actorId, role: input.actorRole }, db);
          case "rescore": return rescoreOdkExamCommand(examId, command.input, { userId: actorId, role: input.actorRole }, db);
          case "release": return releaseOdkExam(examId, command.input, { userId: actorId, role: input.actorRole }, db);
        }
      })();
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new GroupMutationError("ODK_EXAM_REJECTED", typeof body.error === "string" ? body.error : "İşlem reddedildi.", response.status);
      }
      return response;
    } });
    return { body: result.body, replayed: Boolean(result.replayed) };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && ["P2002", "P2034", "P2025"].includes(String(error.code))) {
      const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
      if (receipt) return { body: readGroupReceipt(receipt.payload, digest).body, replayed: true };
      throw new GroupMutationError("ODK_CONFLICT", "Deneme eşzamanlı değişti. Güncel çalışma alanını kontrol edin.");
    }
    throw error;
  }
}
