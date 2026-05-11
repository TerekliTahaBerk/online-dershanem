import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforce, ForbiddenError } from "./enforce";
import type { PermissionKey } from "./matrix";
import { auditLog } from "@/lib/audit";

export type ActionContext = {
  user: {
    id: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  };
};

export type ActionError =
  | { code: "UNAUTHORIZED"; message: string }
  | { code: "FORBIDDEN"; message: string; permission: string }
  | { code: "VALIDATION"; message: string; fields: Record<string, string[]> }
  | { code: "INTERNAL"; message: string };

export type ActionResult<TData> =
  | { ok: true; data: TData }
  | { ok: false; error: ActionError };

type DefineActionOptions<TInput extends z.ZodTypeAny, TOutput> = {
  /** Zod schema for input validation — required. */
  input: TInput;
  /** Permission key(s) required to run this action. */
  permission: PermissionKey | PermissionKey[];
  /** Audit log metadata. If omitted, no audit entry is written. */
  audit?: {
    entityType: string;
    action: string;
    /** Resolve entity id from input/output. */
    entityId?: (args: { input: z.infer<TInput>; output: TOutput }) => string;
    summary?: (args: { input: z.infer<TInput>; output: TOutput }) => string;
  };
  /** Handler — receives validated input + auth context. */
  handler: (args: { input: z.infer<TInput>; ctx: ActionContext }) => Promise<TOutput>;
};

/**
 * Wrap a server action with auth, permission, validation, audit and structured error handling.
 *
 * Usage:
 *   export const updateStudent = defineAction({
 *     input: studentUpdateSchema,
 *     permission: "students.write",
 *     audit: { entityType: "Student", action: "update", entityId: ({ input }) => input.id },
 *     handler: async ({ input, ctx }) => students.update(input, ctx),
 *   });
 *
 * Returns `ActionResult<T>` — never throws to the client (TanStack Query
 * `onError` handles `ok: false` cases via thrown unwrap).
 */
export function defineAction<TInput extends z.ZodTypeAny, TOutput>(
  opts: DefineActionOptions<TInput, TOutput>
) {
  return async function actionExecutor(rawInput: unknown): Promise<ActionResult<TOutput>> {
    // 1. Resolve session
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return { ok: false, error: { code: "UNAUTHORIZED", message: "Oturum yok" } };
    }

    const ctx: ActionContext = {
      user: {
        id: session.user.id,
        email: session.user.email ?? "",
        role: session.user.role
      }
    };

    // 2. Permission check
    try {
      await enforce(ctx.user.id, ctx.user.role, opts.permission);
    } catch (e) {
      if (e instanceof ForbiddenError) {
        return { ok: false, error: { code: "FORBIDDEN", message: e.message, permission: e.permission } };
      }
      throw e;
    }

    // 3. Validate input
    const parsed = opts.input.safeParse(rawInput);
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_root";
        if (!fields[key]) fields[key] = [];
        fields[key].push(issue.message);
      }
      return { ok: false, error: { code: "VALIDATION", message: "Girdi doğrulanamadı", fields } };
    }

    // 4. Run handler
    let output: TOutput;
    try {
      output = await opts.handler({ input: parsed.data, ctx });
    } catch (err) {
      console.error("[defineAction] handler failed", { permission: opts.permission, err });
      return {
        ok: false,
        error: { code: "INTERNAL", message: err instanceof Error ? err.message : "Bilinmeyen hata" }
      };
    }

    // 5. Audit log (best-effort, non-blocking failure)
    if (opts.audit) {
      try {
        await auditLog({
          actorUserId: ctx.user.id,
          entityType: opts.audit.entityType,
          entityId: opts.audit.entityId?.({ input: parsed.data, output }) ?? "—",
          action: opts.audit.action,
          summary: opts.audit.summary?.({ input: parsed.data, output })
        });
      } catch (err) {
        console.error("[defineAction] audit write failed", err);
      }
    }

    return { ok: true, data: output };
  };
}

/**
 * Hard-redirect variant for page-level guards (server components).
 * Throws redirect if not authed / not authorized.
 */
export async function requirePagePermission(permission: PermissionKey | PermissionKey[]) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  try {
    await enforce(session.user.id, session.user.role, permission);
  } catch {
    redirect("/panel-secimi");
  }

  return session;
}

// Re-export so callers don't need to know audit internals
export { prisma };
