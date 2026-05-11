import "server-only";

import type { Prisma } from "@prisma/client";
import type { ActionContext } from "./define-action";

/**
 * Scope helpers — service layer'da query'lere `where` ekleyerek
 * "kullanıcı sadece kendi kayıtlarını görsün" enforcement'ı.
 *
 * Kural: ADMIN → all. Diğer roller scope'lu.
 */

export type Scope = "own" | "classroom" | "all";

export function studentScope(role: ActionContext["user"]["role"]): Scope {
  switch (role) {
    case "ADMIN":   return "all";
    case "TEACHER": return "classroom";
    case "PARENT":  return "own";
    case "STUDENT": return "own";
  }
}

/**
 * Apply student-list scope to a Prisma `where`. Caller passes the user's
 * resolved teacherId / studentId / parentId.
 */
export function applyStudentScope(
  base: Prisma.StudentWhereInput,
  ctx: ActionContext,
  ids: { teacherId?: string; studentId?: string; parentId?: string }
): Prisma.StudentWhereInput {
  const scope = studentScope(ctx.user.role);

  if (scope === "all") return base;

  if (scope === "own") {
    if (ctx.user.role === "STUDENT" && ids.studentId) {
      return { ...base, id: ids.studentId };
    }
    if (ctx.user.role === "PARENT" && ids.parentId) {
      return {
        ...base,
        parents: { some: { parentId: ids.parentId } }
      };
    }
    // No identifying id — block.
    return { ...base, id: "__none__" };
  }

  if (scope === "classroom" && ids.teacherId) {
    return {
      ...base,
      OR: [
        { lessons: { some: { teacherId: ids.teacherId } } },
        { classrooms: { some: { classroom: { teachers: { some: { teacherId: ids.teacherId } } } } } }
      ]
    };
  }

  return { ...base, id: "__none__" };
}
