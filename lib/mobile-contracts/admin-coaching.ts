import { check, v, type Infer } from "./validate";

export const COACHING_QUEUE_IDS = ["koc-bekleyen", "geciken", "plansiz", "hedefsiz", "kapasite", "sinyaller", "tum-ogrenciler"] as const;
const student = v.object({ id: v.nonEmpty(), name: v.string(), coachId: v.nullable(v.nonEmpty()), coachName: v.nullable(v.string()), revision: v.nonEmpty(), cadenceDays: v.nullable(v.int(1)), lastCompletedAt: v.nullable(v.iso()), nextAt: v.nullable(v.iso()), overdue: v.boolean() });
const session = v.object({ id: v.nonEmpty(), studentId: v.nonEmpty(), studentName: v.string(), coachName: v.string(), scheduledAt: v.iso(), completedAt: v.nullable(v.iso()), status: v.oneOf(["PLANNED", "COMPLETED", "MISSED", "CANCELLED"] as const), focus: v.nullable(v.string()) });
const overview = v.object({
  contractVersion: v.literal(1),
  students: v.array(student),
  coaches: v.array(v.object({ id: v.nonEmpty(), name: v.string(), capacity: v.nullable(v.int(0)), load: v.int(0), today: v.int(0), overdue: v.int(0), assignable: v.boolean() })),
  queues: v.array(v.object({ id: v.oneOf(COACHING_QUEUE_IDS), label: v.string(), count: v.int(0), rows: v.array(v.object({ id: v.nonEmpty(), studentId: v.nullable(v.nonEmpty()), title: v.string(), detail: v.string() })) })),
  sessions: v.array(session),
});
const detail = v.object({ contractVersion: v.literal(1), session, sharedNote: v.nullable(v.string()), meetingUrl: v.nullable(v.string()), proposedAt: v.nullable(v.iso()), rescheduleRequestedAt: v.nullable(v.iso()), rescheduleReason: v.nullable(v.string()) });
export type AdminCoaching = Infer<typeof overview>;
export type AdminCoachingStudent = Infer<typeof student>;
export type AdminCoachingSession = Infer<typeof detail>;
export const parseAdminCoaching = (input: unknown) => check(overview, input);
export const parseAdminCoachingSession = (input: unknown) => check(detail, input);
