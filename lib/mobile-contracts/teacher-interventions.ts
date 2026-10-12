import { parseInterventionInbox, type MobileInterventionInbox } from "./admin";
import type { ContractResult } from "./bootstrap";
import { check, v } from "./validate";

export type TeacherInterventions = MobileInterventionInbox & { revision: string };
export function parseTeacherInterventions(input: unknown): ContractResult<TeacherInterventions> {
  const inbox = parseInterventionInbox(input);
  if (!inbox.ok) return inbox;
  const revision = check(v.object({ revision: v.nonEmpty() }), input);
  if (!revision.ok) return revision;
  return { ok: true, value: { ...inbox.value, revision: revision.value.revision } };
}
