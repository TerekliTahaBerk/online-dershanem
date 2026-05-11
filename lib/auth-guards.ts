import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";

/**
 * Centralized auth guards — one source of truth for panel server actions
 * and protected pages. Every guard:
 *  1. resolves session (redirects to /giris if missing)
 *  2. checks panel access via panel-access.ts (single RBAC source)
 *  3. returns the resolved session/user/entity for further use
 *
 * Usage in a server action:
 *   await requireAdmin();
 *   const teacherId = await requireTeacher();
 *
 * NEVER duplicate `requireAdmin` style code in actions.ts files anymore —
 * import from here.
 */

async function getSessionOrRedirect() {
  const session = await getServerAuthSession();
  if (!session) redirect("/giris");
  return session;
}

export async function requireAdmin() {
  const session = await getSessionOrRedirect();
  if (!getPanelAccess(session.user).hasAdminPanel) {
    redirect("/giris");
  }
  return session;
}

export async function requireTeacher() {
  const session = await getSessionOrRedirect();
  const access = getPanelAccess(session.user);
  if (!access.hasTeacherPanel) redirect("/giris");

  if (access.hasAdminPanel) {
    // Admin acting on behalf — return null teacherId; pages can branch.
    return { session, teacherId: null as string | null, isAdmin: true };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user!.id },
    select: { id: true },
  });
  if (!teacher) redirect("/giris");
  return { session, teacherId: teacher.id, isAdmin: false };
}

export async function requireStudent() {
  const session = await getSessionOrRedirect();
  const access = getPanelAccess(session.user);
  if (!access.hasStudentPanel) redirect("/giris");

  if (access.hasAdminPanel) {
    return { session, studentId: null as string | null, isAdmin: true };
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user!.id },
    select: { id: true },
  });
  if (!student) redirect("/giris");
  return { session, studentId: student.id, isAdmin: false };
}

export async function requireParent() {
  const session = await getSessionOrRedirect();
  const access = getPanelAccess(session.user);
  if (!access.hasParentPanel) redirect("/giris");

  if (access.hasAdminPanel) {
    return { session, parentId: null as string | null, isAdmin: true };
  }

  const parent = await prisma.parent.findUnique({
    where: { userId: session.user!.id },
    select: { id: true },
  });
  if (!parent) redirect("/giris");
  return { session, parentId: parent.id, isAdmin: false };
}

/**
 * Assert that a teacher owns/teaches a specific student.
 * Owns = there is a Lesson(teacherId, studentId), OR they share a Classroom.
 * Throws (via redirect) if not allowed.
 */
export async function assertTeacherOwnsStudent(teacherId: string, studentId: string) {
  const found = await prisma.student.findFirst({
    where: {
      id: studentId,
      OR: [
        { lessons: { some: { teacherId } } },
        {
          classrooms: {
            some: {
              classroom: { teachers: { some: { teacherId } } },
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  if (!found) redirect("/ogretmen?error=forbidden");
}

/** Assert a parent (by Parent.id) is linked to a Student. */
export async function assertParentSeesStudent(parentId: string, studentId: string) {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { parentId: true },
  });
  if (!link) redirect("/veli?error=forbidden");
}
