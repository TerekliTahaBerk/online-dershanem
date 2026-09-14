import { z } from "zod";
import { GroupLifecycleError } from "./group-lifecycle";
import { LessonLifecycleError } from "./lesson-lifecycle";

export const groupActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("UPDATE_META"), name: z.string().trim().min(2).max(80), subject: z.string().trim().min(2).max(80), level: z.string().trim().max(40).optional() }),
  z.object({ action: z.literal("CHANGE_TEACHER"), teacherId: z.string().min(1) }),
  z.object({ action: z.literal("SET_ACTIVE"), isActive: z.boolean() }),
  z.object({ action: z.literal("ADD_STUDENT"), studentId: z.string().min(1) }),
  z.object({ action: z.literal("REMOVE_STUDENT"), studentId: z.string().min(1) }),
  z.object({ action: z.literal("PREVIEW_TRANSFER"), studentId: z.string().min(1), targetGroupId: z.string().min(1) }),
  z.object({ action: z.literal("TRANSFER_STUDENT"), studentId: z.string().min(1), targetGroupId: z.string().min(1), confirmed: z.literal(true) }),
]);

export const legacyGroupSchema = z.object({
  name: z.string().trim().min(2).max(80), subject: z.string().trim().min(2).max(80),
  level: z.string().trim().max(40).optional(), teacherId: z.string().min(1), isActive: z.boolean(),
});

export const groupMembersActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("TRANSFER"), mode: z.enum(["PREVIEW", "EXECUTE"]), studentIds: z.array(z.string().min(1)).min(1).max(20), targetGroupId: z.string().min(1) }),
  z.object({ action: z.literal("REMOVE"), mode: z.enum(["PREVIEW", "EXECUTE"]), studentIds: z.array(z.string().min(1)).min(1).max(20) }),
  z.object({ action: z.literal("NOTIFY"), mode: z.enum(["PREVIEW", "EXECUTE"]), studentIds: z.array(z.string().min(1)).min(1).max(20), title: z.string().trim().min(2).max(120).optional(), body: z.string().trim().min(2).max(500).optional() }),
]);

export function groupLifecycleHttpError(error: unknown): { status: number; message: string; code: string } | null {
  if (error instanceof LessonLifecycleError) {
    return { status: error.code === "SCHEDULE_CONFLICT" ? 409 : 400, message: error.message, code: error.code };
  }
  if (!(error instanceof GroupLifecycleError)) return null;
  if (error.code === "GROUP_NOT_FOUND") return { status: 404, message: error.message, code: error.code };
  if (error.code === "STUDENT_NOT_FOUND") return { status: 400, message: error.message, code: error.code };
  const conflictCodes = new Set(["GROUP_INACTIVE", "GROUP_CAPACITY_FULL", "ALREADY_ENROLLED", "NOT_ENROLLED", "TRANSFER_BLOCKED", "SCHEDULE_CONFLICT"]);
  return { status: conflictCodes.has(error.code) ? 409 : 400, message: conflictCodes.has(error.code) ? error.message : "İşlem tamamlanamadı.", code: error.code };
}
