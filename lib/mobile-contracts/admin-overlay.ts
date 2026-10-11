import { check, v } from "./validate";

export const PREVIEW_ROLES = ["STUDENT", "PARENT", "TEACHER"] as const;
export type MobilePreviewRole = (typeof PREVIEW_ROLES)[number];

const candidate = v.object({
  userId: v.nonEmpty(), fullName: v.nullable(v.string()), email: v.string(),
  status: v.oneOf(["ACTIVE", "SUSPENDED", "ARCHIVED"] as const),
  detail: v.nullable(v.string()), invitePending: v.boolean(),
});
const candidates = v.object({ candidates: v.array(candidate) });
const preview = v.object({ token: v.nonEmpty(), context: v.object({ expiresAt: v.iso() }) });
const teacher = v.object({ token: v.nonEmpty(), expiresAt: v.iso() });

export const parsePreviewCandidates = (input: unknown) => check(candidates, input);
export const parsePreviewStart = (input: unknown) => check(preview, input);
export const parseTeacherModeStart = (input: unknown) => check(teacher, input);
