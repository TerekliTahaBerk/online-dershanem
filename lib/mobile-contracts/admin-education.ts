import { check, v, type Infer } from "./validate";

export const EDUCATION_TABS = ["gruplar", "dersler", "odevler", "materyaller"] as const;
export const GROUP_TABS = ["genel", "ogrenciler", "program", "gecmis", "operasyon"] as const;
const row = v.object({ id: v.nonEmpty(), title: v.string(), detail: v.string(), at: v.nullable(v.iso()), groupId: v.nullable(v.nonEmpty()), studentId: v.nullable(v.nonEmpty()) });
const section = v.object({ id: v.nonEmpty(), title: v.string(), rows: v.array(row) });
const choice = v.object({ id: v.nonEmpty(), name: v.string() });
const education = v.object({
  contractVersion: v.literal(1),
  groups: v.array(v.object({ id: v.nonEmpty(), name: v.string(), subject: v.string(), level: v.nullable(v.string()), teacherName: v.string(), active: v.boolean(), filled: v.int(0), capacity: v.int(0), nextLessonAt: v.nullable(v.iso()) })),
  sections: v.array(section),
  teachers: v.optional(v.array(choice), []),
});
const group = v.object({
  contractVersion: v.literal(1),
  id: v.nonEmpty(), name: v.string(), subject: v.string(), level: v.nullable(v.string()), active: v.boolean(),
  teacherName: v.string(), filled: v.int(0), capacity: v.int(0), weeklyLessonCount: v.int(0),
  status: v.string(), reasons: v.array(v.string()), tab: v.oneOf(GROUP_TABS), sections: v.array(section),
  revision: v.optional(v.nullable(v.nonEmpty()), null),
  teacherId: v.optional(v.nullable(v.nonEmpty()), null),
  teachers: v.optional(v.array(choice), []),
  targetGroups: v.optional(v.array(v.object({ id: v.nonEmpty(), name: v.string(), subject: v.string(), filled: v.int(0), capacity: v.int(0) })), []),
});

const mutationResult = v.object({ ok: v.literal(true), id: v.nonEmpty(), revision: v.nonEmpty(), replayed: v.boolean() });
const blocker = v.object({ code: v.nonEmpty(), message: v.string() });
const previewBase = { mode: v.literal('PREVIEW'), expectedRevision: v.nonEmpty() };
const affectedLesson = v.object({ id: v.nonEmpty(), title: v.string(), startsAt: v.iso() });
const memberPreview = v.union('action', {
  TRANSFER: v.object({ ...previewBase, action: v.literal('TRANSFER'), expectedTargetRevision: v.nonEmpty(), preview: v.object({ targetGroupName: v.string(), canExecute: v.boolean(), capacity: v.object({ active: v.int(0), capacity: v.int(0), available: v.int(0) }), items: v.array(v.object({ studentId: v.nonEmpty(), studentName: v.string(), blockers: v.array(blocker), warnings: v.array(v.string()), affectedSourceLessons: v.array(affectedLesson), affectedTargetLessons: v.array(affectedLesson) })) }) }),
  REMOVE: v.object({ ...previewBase, action: v.literal('REMOVE'), canExecute: v.boolean(), matched: v.int(0), items: v.array(v.object({ studentId: v.nonEmpty(), studentName: v.string(), blockers: v.array(blocker) })) }),
  NOTIFY: v.object({ ...previewBase, action: v.literal('NOTIFY'), canExecute: v.boolean(), recipientCount: v.int(0), matchedStudents: v.int(0), title: v.string(), body: v.string(), sample: v.array(v.object({ studentId: v.nonEmpty(), name: v.string() })) }),
});
const candidates = v.object({ seats: v.object({ capacity: v.int(0), active: v.int(0), available: v.int(0), isActive: v.boolean() }), students: v.array(v.object({ id: v.nonEmpty(), name: v.string(), email: v.string(), activeGroups: v.array(choice) })) });

export type MobileEducation = Infer<typeof education>;
export type MobileGroup360 = Infer<typeof group>;
export type EducationTab = (typeof EDUCATION_TABS)[number];
export type GroupTab = (typeof GROUP_TABS)[number];
export type EducationRow = Infer<typeof row>;
export const parseEducation = (input: unknown) => check(education, input);
export const parseGroup360 = (input: unknown) => check(group, input);
export const parseGroupMutationResult = (input: unknown) => check(mutationResult, input);
export const parseGroupMemberPreview = (input: unknown) => check(memberPreview, input);
export const parseGroupCandidates = (input: unknown) => check(candidates, input);
export type MobileGroupMemberPreview = Infer<typeof memberPreview>;
