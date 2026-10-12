import { check, v, type Infer } from "./validate";
const metric = v.object({ key: v.nonEmpty(), label: v.string(), display: v.string(), definition: v.string(), domain: v.string(), unit: v.string(), denominator: v.string(), querySource: v.string(), dateSemantics: v.string(), timezone: v.string() });
const gain = v.union("status", {
  INSUFFICIENT_SAMPLE: v.object({ exam: v.string(), status: v.literal("INSUFFICIENT_SAMPLE") }),
  READY: v.object({ exam: v.string(), status: v.literal("READY"), pairedStudents: v.int(10), observedStudents: v.int(10), medianChange: v.number(), lowerQuartile: v.number(), upperQuartile: v.number(), positiveChangePercent: v.number(), medianGapDays: v.number(), coveragePercent: v.nullable(v.number()), dataThrough: v.nullable(v.iso()) }),
});
const item = v.object({ label: v.string(), value: v.string() });
const section = v.object({ title: v.string(), items: v.array(item) });
const analytics = v.object({ contractVersion: v.literal(1), ruleVersion: v.string(), timezone: v.string(), filters: v.object({ from: v.string(), to: v.string(), examType: v.string(), product: v.string(), classLevel: v.string(), groupId: v.string(), teacherId: v.string(), notice: v.nullable(v.string()) }), metrics: v.array(metric), sections: v.array(section), gains: v.array(gain) });
const auditRow = v.object({ id: v.nonEmpty(), action: v.string(), summary: v.string(), entityType: v.string(), actor: v.string(), createdAt: v.iso() });
const audit = v.object({ contractVersion: v.literal(1), logs: v.array(auditRow) });
const features = v.object({ contractVersion: v.literal(1), features: v.array(v.object({ key: v.nonEmpty(), label: v.string(), status: v.string(), enabled: v.boolean(), source: v.string(), environmentKey: v.string(), defaultEnabled: v.boolean(), legacyPublicConfigured: v.boolean(), legacyPublicDrift: v.boolean(), owner: v.string(), roles: v.array(v.string()), dataDependency: v.string(), e2eCoverage: v.string(), rollback: v.string() })), logs: v.array(auditRow) });
const quality = v.object({ contractVersion: v.literal(1), ruleVersion: v.string(), minStudents: v.int(1), minGapDays: v.int(1), sections: v.array(section), gains: v.array(gain), commonErrors: v.array(v.object({ label: v.string(), students: v.int(10) })) });
export type AdminAnalytics = Infer<typeof analytics>;
export type AdminQuality = Infer<typeof quality>;
export type AdminAudit = Infer<typeof audit>;
export type AdminFeatures = Infer<typeof features>;
export type AdminGain = Infer<typeof gain>;
export const parseAdminAnalytics = (input: unknown) => check(analytics, input);
export const parseAdminAudit = (input: unknown) => check(audit, input);
export const parseAdminFeatures = (input: unknown) => check(features, input);
export const parseAdminQuality = (input: unknown) => check(quality, input);
