import { redirect, notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { PageHeader } from "@/components/od/page-header";
import { EmptyState } from "@/components/od/feedback/empty-state";
import {
  ParentLessonsTable,
  type ParentLessonRow,
} from "@/components/od/domain/parent/parent-lessons-table";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const STATUSES = new Set(["SCHEDULED", "COMPLETED", "CANCELLED"]);

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function ParentLessonsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx) return notFound();

  const sp = await searchParams;
  const status = asArray(sp.status).filter((s) => STATUSES.has(s)) as any[];
  const childFilter = asArray(sp.childId).filter((id) => ctx.childIds.includes(id));
  const fromStr = typeof sp.from === "string" ? sp.from : undefined;
  const toStr = typeof sp.to === "string" ? sp.to : undefined;

  const where: Prisma.LessonWhereInput = {
    studentId: { in: childFilter.length ? childFilter : ctx.childIds },
  };
  if (status.length) where.status = { in: status };
  if (fromStr || toStr) {
    where.scheduledAt = {};
    if (fromStr) where.scheduledAt.gte = new Date(fromStr);
    if (toStr) {
      const end = new Date(toStr);
      end.setHours(23, 59, 59, 999);
      where.scheduledAt.lte = end;
    }
  }

  const lessons = await prisma.lesson.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    take: 500,
    include: {
      student: { select: { id: true, fullName: true } },
      teacher: { select: { fullName: true } },
    },
  });

  const savedViews = await loadSavedViews("parent.lessons", session.user.id);

  if (
    lessons.length === 0 &&
    status.length === 0 &&
    childFilter.length === 0 &&
    !fromStr &&
    !toStr
  ) {
    return (
      <div className="space-y-od-5">
        <PageHeader title="Dersler" description="Henüz ders yok" />
        <EmptyState
          tone="sky"
          icon={CalendarDays}
          title="Henüz ders yok"
          description="Çocuklarına atanan dersler burada listelenir."
        />
      </div>
    );
  }

  const rows: ParentLessonRow[] = lessons.map((l) => ({
    id: l.id,
    scheduledAt: l.scheduledAt.toISOString(),
    childId: l.student.id,
    childName: l.student.fullName,
    title: l.title,
    subject: l.subject,
    teacherName: l.teacher.fullName,
    duration: l.duration,
    status: l.status,
  }));

  const childOptions = ctx.parent.students.map((ps) => ({
    id: ps.studentId,
    name: ps.student.fullName,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Dersler"
        description={rows.length + " ders · filtrele veya dışa aktar"}
      />
      <ParentLessonsTable
        data={rows}
        children={childOptions}
        savedViews={savedViews}
        currentUserId={session.user.id}
      />
    </div>
  );
}
