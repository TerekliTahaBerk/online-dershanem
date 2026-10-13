import { check, v, type Infer } from "./validate";
const role = () => v.oneOf(["ADMIN", "TEACHER", "STUDENT", "PARENT"]);
const coverage = v.object({ ADMIN: v.int(0), TEACHER: v.int(0), STUDENT: v.int(0), PARENT: v.int(0) });
const data = v.object({ contractVersion: v.literal(1), currentAdminId: v.nonEmpty(), revision: v.nonEmpty(),
  readiness: v.object({ canActivate: v.boolean(), canExpand: v.boolean(), checks: v.array(v.object({ key: v.nonEmpty(), label: v.string(), status: v.oneOf(["BLOCK", "WAIT", "PASS"]), detail: v.string() })) }),
  candidates: v.array(v.object({ id: v.nonEmpty(), label: v.string(), role: role() })),
  runs: v.array(v.object({ id: v.nonEmpty(), name: v.string(), status: v.oneOf(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ROLLED_BACK"]), version: v.int(1), revision: v.nonEmpty(), memberCount: v.int(0), coverage, createdAt: v.iso(), startedAt: v.nullable(v.iso()), stoppedAt: v.nullable(v.iso()), stopReason: v.nullable(v.string()) })) });
export type OdkManagementPilot = Infer<typeof data>;
export type OdkPilotAction = 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'ROLLBACK';
export type OdkPilotCommand = { operation: 'create'; name: string; userIds: string[] } | { operation: 'transition'; id: string; input: { action: OdkPilotAction; expectedVersion: number; stopReason?: 'GUARDRAIL_BREACH' | 'SECURITY_INCIDENT' | 'DATA_QUALITY' | 'OPERATIONAL' | 'MANUAL_COMPLETION' } };
export function parseOdkManagementPilot(input: unknown) { return check(data, input); }
export function parseOdkPilotWrite(input: unknown) { return check(v.object({ ok: v.literal(true), id: v.nonEmpty(), replayed: v.boolean() }), input); }
