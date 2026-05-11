import { redirect, notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { PageHeader } from "@/components/od/page-header";
import { EmptyState } from "@/components/od/feedback/empty-state";
import {
  TeacherLessonsTable,
  type TeacherLessonRow,
} from "@/components/od/domain/teacher/teacher-lessons-table";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const STATUSES = new Set(["SCHEDULED", "COMPLETED", "CANCELLED"]);

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function TeacherLessonsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return notFound();

  const sp = await searchParams;
  const status = asArray(sp.status).filter((s) => STATUSES.has(s)) as any[];
  const fromStr = typeof sp.from === "string" ? sp.from : undefined;
  const toStr = typeof sp.to === "string" ? sp.to : undefined;

  const where: Prisma.LessonWhereInput = { teacherId: teacher.id };
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
      classroom: { select: { id: true, name: true } },
    },
  });

  const savedViews = await loadSavedViews("teacher.lessons", session.user.id);

  if (lessons.length === 0 && status.length === 0 && !fromStr && !toStr) {
    return (
      <div className="space-y-od-5">
        <PageHeader title="Derslerim" description="Henüz ders kaydın yok" />
        <EmptyState
          tone="sky"
          icon={CalendarDays}
          title="Henüz ders yok"
          description="Sana atanan dersler burada listelenir."
        />
      </div>
    );
  }

  const rows: TeacherLessonRow[] = lessons.map((l) => ({
    id: l.id,
    scheduledAt: l.scheduledAt.toISOString(),
    title: l.title,
    subject: l.subject,
    studentName: l.student.fullName,
    classroomName: l.classroom?.name ?? null,
    duration: l.duration,
    status: l.status,
    googleMeetLink: l.googleMeetLink,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Derslerim"
        description={rows.length + " ders · filtrele veya dışa aktar"}
      />
      <TeacherLessonsTable data={rows} savedViews={savedViews} currentUserId={session.user.id} />
    </div>
  );
}
