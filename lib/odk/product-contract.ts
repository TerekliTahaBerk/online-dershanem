import { z } from "zod";

const dateString = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Geçerli bir tarih olmalıdır.");
const nullableIsoDate = dateString.nullable();

export const odkPackagePolicySchema = z.object({
  sales: z.object({
    state: z.enum(["AVAILABLE", "SOLD_OUT", "PAUSED", "CLOSED"]),
    startsAt: nullableIsoDate.optional(),
    endsAt: nullableIsoDate.optional(),
  }),
  access: z.object({
    starts: z.enum(["PURCHASED_AT", "FIXED"]),
    startsAt: nullableIsoDate.optional(),
    endsAt: nullableIsoDate.optional(),
    durationDays: z.number().int().positive().nullable().optional(),
  }),
  rights: z.object({
    studentReports: z.boolean(),
    parentReports: z.boolean(),
    teacherReports: z.boolean(),
    liveService: z.boolean(),
  }),
  exceptions: z.object({
    soldOut: z.literal("BLOCK_NEW_ORDERS"),
    outage: z.enum(["RESCHEDULE_OR_EXTEND_ACCESS", "EXTEND_ACCESS"]),
    cancellation: z.enum(["RESCHEDULE_OR_REFUND", "REFUND"]),
    refund: z.enum(["BEFORE_FIRST_ATTEMPT", "NO_AUTOMATIC_REFUND", "FULL_REFUND"]),
    exceptionalAccess: z.literal("ADMIN_GRANT_WITH_REASON_AND_EXPIRY"),
  }),
});

export const odkContractExamSchema = z.object({
  id: z.string().min(1),
  seriesId: z.string().nullable(),
  seriesTitle: z.string().nullable().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  family: z.enum(["LGS", "TYT", "AYT"]),
  startsAt: nullableIsoDate,
  endsAt: nullableIsoDate,
  lateEntryMinutes: z.number().int().nonnegative(),
  attemptLimit: z.number().int().positive(),
  resultsReleasedAt: nullableIsoDate,
  answerKeyReleasedAt: nullableIsoDate,
  liveServiceRequired: z.boolean(),
});

export const odkProductContractSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.number().int().positive(),
  capturedAt: dateString,
  package: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    priceCents: z.number().int().nonnegative(),
    originalPriceCents: z.number().int().nonnegative().nullable(),
  }),
  policy: odkPackagePolicySchema,
  exams: z.array(odkContractExamSchema),
});

export type OdkPackagePolicy = z.infer<typeof odkPackagePolicySchema>;
export type OdkProductContract = z.infer<typeof odkProductContractSchema>;
export type OdkContractExam = z.infer<typeof odkContractExamSchema>;

export const defaultOdkPackagePolicy: OdkPackagePolicy = {
  sales: { state: "PAUSED" },
  access: { starts: "PURCHASED_AT", durationDays: null },
  rights: { studentReports: true, parentReports: true, teacherReports: true, liveService: true },
  exceptions: {
    soldOut: "BLOCK_NEW_ORDERS",
    outage: "RESCHEDULE_OR_EXTEND_ACCESS",
    cancellation: "RESCHEDULE_OR_REFUND",
    refund: "BEFORE_FIRST_ATTEMPT",
    exceptionalAccess: "ADMIN_GRANT_WITH_REASON_AND_EXPIRY",
  },
};

export function parseOdkPackagePolicy(value: unknown) {
  return odkPackagePolicySchema.safeParse(value);
}

export function parseOdkProductContract(value: unknown) {
  return odkProductContractSchema.safeParse(value);
}

export function decideOdkSale(policy: OdkPackagePolicy, now = new Date()) {
  if (policy.sales.state !== "AVAILABLE") return { allowed: false as const, reason: policy.sales.state };
  const startsAt = policy.sales.startsAt ? new Date(policy.sales.startsAt) : null;
  const endsAt = policy.sales.endsAt ? new Date(policy.sales.endsAt) : null;
  if (startsAt && startsAt > now) return { allowed: false as const, reason: "NOT_STARTED" as const };
  if (endsAt && endsAt <= now) return { allowed: false as const, reason: "ENDED" as const };
  return { allowed: true as const };
}

export function contractAccessWindow(policy: OdkPackagePolicy, purchasedAt: Date) {
  const startsAt = policy.access.starts === "FIXED" && policy.access.startsAt
    ? new Date(policy.access.startsAt)
    : purchasedAt;
  const fixedEnd = policy.access.endsAt ? new Date(policy.access.endsAt) : null;
  const durationEnd = policy.access.durationDays
    ? new Date(startsAt.getTime() + policy.access.durationDays * 86_400_000)
    : null;
  const expiresAt = fixedEnd && durationEnd
    ? new Date(Math.min(fixedEnd.getTime(), durationEnd.getTime()))
    : fixedEnd || durationEnd;
  return { startsAt, expiresAt };
}

export function contractExam(contract: OdkProductContract, examId: string) {
  return contract.exams.find((exam) => exam.id === examId) ?? null;
}

export function contractExamSchedule(exam: OdkContractExam) {
  return {
    startsAt: exam.startsAt ? new Date(exam.startsAt) : null,
    endsAt: exam.endsAt ? new Date(exam.endsAt) : null,
    lateEntryMinutes: exam.lateEntryMinutes,
    attemptLimit: exam.attemptLimit,
  };
}

export function contractAllowsReport(contract: OdkProductContract, role: "STUDENT" | "PARENT" | "TEACHER" | "ADMIN") {
  if (role === "ADMIN") return true;
  if (role === "STUDENT") return contract.policy.rights.studentReports;
  if (role === "PARENT") return contract.policy.rights.parentReports;
  return contract.policy.rights.teacherReports;
}

export function odkSellableContractIssues(contract: OdkProductContract) {
  const issues: string[] = [];
  if (!contract.exams.length) issues.push("PACKAGE_HAS_NO_EXAMS");
  if (contract.policy.access.starts === "FIXED" && !contract.policy.access.startsAt) issues.push("FIXED_ACCESS_START_MISSING");
  for (const exam of contract.exams) {
    if (!exam.startsAt || !exam.endsAt) issues.push(`EXAM_SCHEDULE_MISSING:${exam.id}`);
    if (!exam.resultsReleasedAt) issues.push(`RESULT_RELEASE_MISSING:${exam.id}`);
    if (!exam.answerKeyReleasedAt) issues.push(`ANSWER_KEY_RELEASE_MISSING:${exam.id}`);
    if (exam.startsAt && exam.endsAt && new Date(exam.endsAt) <= new Date(exam.startsAt)) issues.push(`EXAM_WINDOW_INVALID:${exam.id}`);
    if (exam.endsAt && exam.resultsReleasedAt && new Date(exam.resultsReleasedAt) < new Date(exam.endsAt)) issues.push(`RESULT_RELEASE_BEFORE_END:${exam.id}`);
    if (exam.endsAt && exam.answerKeyReleasedAt && new Date(exam.answerKeyReleasedAt) < new Date(exam.endsAt)) issues.push(`ANSWER_KEY_RELEASE_BEFORE_END:${exam.id}`);
    if (exam.liveServiceRequired && !contract.policy.rights.liveService) issues.push(`LIVE_SERVICE_RIGHT_MISSING:${exam.id}`);
  }
  return issues;
}
