import "server-only";

import { prisma } from "@/lib/prisma";
import { applyStudentScope } from "@/lib/rbac/policies";
import type { ActionContext } from "@/lib/rbac/define-action";
import { studentDetailSelect, studentListSelect } from "./selectors";
import type { StudentListFilter } from "./schemas";

/**
 * Resolve scope-binding ids (teacherId / studentId / parentId) for the current user.
 * Cached per request via React.cache could be added; for now direct query.
 */
async function resolveScopeIds(ctx: ActionContext) {
  const ids: { teacherId?: string; studentId?: string; parentId?: string } = {};
  const { id, role } = ctx.user;

  if (role === "TEACHER") {
    const t = await prisma.teacher.findUnique({ where: { userId: id }, select: { id: true } });
    if (t) ids.teacherId = t.id;
  } else if (role === "STUDENT") {
    const s = await prisma.student.findUnique({ where: { userId: id }, select: { id: true } });
    if (s) ids.studentId = s.id;
  } else if (role === "PARENT") {
    const p = await prisma.parent.findUnique({ where: { userId: id }, select: { id: true } });
    if (p) ids.parentId = p.id;
  }
  return ids;
}

export async function listStudents(filter: StudentListFilter, ctx: ActionContext) {
  const ids = await resolveScopeIds(ctx);

  const where: any = {};

  if (filter.q) {
    where.OR = [
      { fullName: { contains: filter.q, mode: "insensitive" } },
      { phone: { contains: filter.q } },
      { email: { contains: filter.q, mode: "insensitive" } },
      { schoolName: { contains: filter.q, mode: "insensitive" } }
    ];
  }
  if (filter.status?.length) where.status = { in: filter.status };
  if (filter.classroomId) where.classrooms = { some: { classroomId: filter.classroomId } };
  if (filter.tagIds?.length) where.tags = { some: { tagId: { in: filter.tagIds } } };

  const scoped = applyStudentScope(where, ctx, ids);

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where: scoped,
      select: studentListSelect,
      orderBy: { [filter.sort]: filter.order },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize
    }),
    prisma.student.count({ where: scoped })
  ]);

  return {
    items,
    meta: {
      page: filter.page,
      pageSize: filter.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filter.pageSize))
    }
  };
}

export async function getStudent(id: string, ctx: ActionContext) {
  const ids = await resolveScopeIds(ctx);
  const scoped = applyStudentScope({ id }, ctx, ids);
  return prisma.student.findFirst({
    where: scoped,
    select: studentDetailSelect
  });
}
