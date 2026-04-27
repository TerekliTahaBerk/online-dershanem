import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

/**
 * Append a row to the AuditLog table.
 *
 * Usage inside a server action:
 *   await auditLog({ entityType: "Student", entityId: studentId, action: "DELETE" });
 *
 * - actorUserId is resolved from the current session automatically.
 * - Errors are swallowed so a logging failure never breaks the primary operation.
 */
export async function auditLog({
  entityType,
  entityId,
  action,
  summary,
  payload,
  actorUserId,
}: {
  entityType: string;
  entityId: string;
  action: string;
  summary?: string;
  payload?: Record<string, unknown>;
  /** Override actor — provide when session is already resolved. */
  actorUserId?: string | null;
}): Promise<void> {
  try {
    let resolvedActorId = actorUserId;
    if (resolvedActorId === undefined) {
      const session = await getServerAuthSession();
      resolvedActorId = session?.user?.id ?? null;
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: resolvedActorId,
        actorType: resolvedActorId ? "USER" : "SYSTEM",
        entityType,
        entityId,
        action,
        summary: summary ?? null,
        payload: payload ? (payload as never) : undefined,
      },
    });
  } catch (err) {
    // Log to console but don't surface to caller — audit failure ≠ operation failure.
    console.error("[audit] failed to write log:", err);
  }
}
