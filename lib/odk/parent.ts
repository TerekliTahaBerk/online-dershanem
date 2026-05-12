import { prisma } from "@/lib/prisma";
import { requireOdkPanel } from "@/lib/access/odk-panel";

export type ChildSummary = {
  studentId: string;
  userId: string;
  name: string | null;
  email: string | null;
  relationship: string | null;
};

export async function requireParentWithChildren() {
  const ctx = await requireOdkPanel("veli");
  const parent = await prisma.parent.findFirst({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!parent) {
    return { ctx, parentId: null as string | null, children: [] as ChildSummary[], userIds: [] as string[] };
  }

  const links = await prisma.parentStudent.findMany({
    where: { parentId: parent.id },
    select: {
      relationship: true,
      student: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const children: ChildSummary[] = links
    .filter((l) => l.student.user)
    .map((l) => ({
      studentId: l.student.id,
      userId: l.student.user!.id,
      name: l.student.user!.name,
      email: l.student.user!.email,
      relationship: l.relationship,
    }));

  const userIds = Array.from(new Set(children.map((c) => c.userId)));
  return { ctx, parentId: parent.id, children, userIds };
}

export async function parentCanAccessAttempt(attemptId: string, parentUserIds: string[]): Promise<boolean> {
  if (parentUserIds.length === 0) return false;
  const a = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true },
  });
  return Boolean(a && parentUserIds.includes(a.userId));
}
