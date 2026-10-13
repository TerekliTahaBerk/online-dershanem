import { check, v, type Infer } from "./validate";
const home = v.object({ contractVersion: v.literal(1), weekCount: v.int(0), awaitingReleaseCount: v.nullable(v.int(0)), pilotBlocked: v.nullable(v.int(0)),
  attention: v.array(v.object({ key: v.nonEmpty(), kind: v.string(), tone: v.string(), title: v.string(), actionLabel: v.string(), href: v.string() })),
  upcoming: v.array(v.object({ id: v.nonEmpty(), title: v.string(), family: v.string(), status: v.string(), startsAt: v.nullable(v.iso()), readinessDone: v.int(0), readinessTotal: v.int(0) })),
  live: v.array(v.object({ id: v.nonEmpty(), title: v.string(), active: v.int(0), submitted: v.int(0), assigned: v.int(0) })),
  activity: v.array(v.object({ id: v.nonEmpty(), at: v.iso(), label: v.string(), examId: v.nonEmpty(), examTitle: v.string(), actor: v.optional(v.nullable(v.string()), null) })),
  modules: v.array(v.object({ id: v.nonEmpty(), title: v.string(), href: v.string() })),
});
const date = () => v.optional(v.nullable(v.string()), null);
const policy = v.object({ sales: v.object({ state: v.oneOf(["AVAILABLE", "SOLD_OUT", "PAUSED", "CLOSED"]), startsAt: date(), endsAt: date() }), access: v.object({ starts: v.oneOf(["PURCHASED_AT", "FIXED"]), startsAt: date(), endsAt: date(), durationDays: v.optional(v.nullable(v.int(1)), null) }), rights: v.object({ studentReports: v.boolean(), parentReports: v.boolean(), teacherReports: v.boolean(), liveService: v.boolean() }), exceptions: v.object({ soldOut: v.string(), outage: v.string(), cancellation: v.string(), refund: v.string(), exceptionalAccess: v.string() }) });
const packages = v.object({ contractVersion: v.literal(1), rows: v.array(v.object({ id: v.nonEmpty(), title: v.string(), slug: v.string(), priceCents: v.int(0), isActive: v.boolean(), contractVersion: v.int(1), policy: v.nullable(policy), orderCount: v.int(0), entitlementCount: v.int(0), exams: v.array(v.object({ id: v.nonEmpty(), title: v.string(), seriesTitle: v.nullable(v.string()), startsAt: v.nullable(v.iso()), endsAt: v.nullable(v.iso()), lateEntryMinutes: v.int(0), attemptLimit: v.int(1), resultsReleasedAt: v.nullable(v.iso()), answerKeyReleasedAt: v.nullable(v.iso()), meetRequired: v.boolean() })) })) });
export type OdkManagementHome = Infer<typeof home>;
export type OdkManagementPackages = Infer<typeof packages>;
export function parseOdkManagementHome(input: unknown) { return check(home, input); }
export function parseOdkManagementPackages(input: unknown) { return check(packages, input); }
