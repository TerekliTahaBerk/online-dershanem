import { createHash } from "node:crypto";

export class GroupMutationError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}

export type GroupRevisionInput = {
  id: string; name: string; subject: string; level: string | null; teacherId: string;
  capacity: number; isActive: boolean; updatedAt: Date;
  enrollments: Array<{ studentId: string; startedAt: Date }>;
};

/** Aktif üyelikler de sürüme dahildir; legacy üyelik yazmaları Group.updatedAt'i değiştirmeyebilir. */
export function groupRevision(group: GroupRevisionInput): string {
  const { id, name, subject, level, teacherId, capacity, isActive, updatedAt } = group;
  return operationDigest({ id, name, subject, level, teacherId, capacity, isActive, updatedAt, enrollments: group.enrollments.map(({ studentId, startedAt }) => ({ studentId, startedAt })).sort((a, b) => a.studentId.localeCompare(b.studentId)) });
}

export function operationDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function assertGroupRevision(actual: string, expected: string | undefined) {
  if (expected !== undefined && actual !== expected) throw new GroupMutationError("GROUP_CONFLICT", "Grup veya üyeleri değişti. Güncel hâline göz atıp tekrar deneyebilirsiniz.");
}

export function mutationReceiptKey(actorId: string, key: string) { return `group-mutation:${actorId}:${key}`; }

export function readGroupReceipt(payload: unknown, digest: string): Record<string, unknown> {
  const stored = payload as { operationDigest?: string; result?: Record<string, unknown> } | null;
  if (!stored?.result || stored.operationDigest !== digest) throw new GroupMutationError("IDEMPOTENCY_REUSE", "Aynı işlem anahtarı farklı bir istek için kullanılamaz.");
  return { ...stored.result, replayed: true };
}
