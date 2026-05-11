import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ClipboardList, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { PageHeader } from "@/components/od/page-header";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import {
  TeacherAssignmentsTable,
  type TeacherAssignmentRow,
} from "@/components/od/domain/teacher/teacher-assignments-table";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const STATUSES = new Set(["DRAFT", "PUBLISHED", "CLOSED"]);

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function TeacherAssignmentsPage({
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
  const classroomId = asArray(sp.classroomId);

  const where: Prisma.AssignmentWhereInput = { teacherId: teacher.id };
  if (status.length) where.status = { in: status };
  if (classroomId.length) where.classroomId = { in: classroomId };

  const [assignments, classroomOpts, savedViews] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        classroom: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true } },
        _count: { select: { submissions: true } },
      },
    }),
    prisma.classroom.findMany({
      where: { assignments: { some: { teacherId: teacher.id } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    loadSavedViews("teacher.assignments", session.user.id),
  ]);

  if (assignments.length === 0 && status.length === 0 && classroomId.length === 0) {
    return (
      <div className="space-y-od-5">
        <PageHeader
          title="Ödevlerim"
          description="Henüz ödev oluşturmadın"
          actions={
            <Link href="/v2/admin/odevler/yeni">
              <Button variant="primary" size="sm">
                <Plus className="mr-1 h-4 w-4" /> Yeni Ödev
              </Button>
            </Link>
          }
        />
        <EmptyState
          tone="blush"
          icon={ClipboardList}
          title="Henüz ödev yok"
          description="Yeni ödev oluşturarak öğrencilerine atayabilirsin."
        />
      </div>
    );
  }

  const rows: TeacherAssignmentRow[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    subject: a.subject,
    targetLabel: a.classroom?.name ?? a.student?.fullName ?? "Genel",
    classroomId: a.classroomId,
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    submissionCount: a._count.submissions,
    status: a.status,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Ödevlerim"
        description={rows.length + " ödev · filtrele veya dışa aktar"}
        actions={
          <Link href="/v2/admin/odevler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Ödev
            </Button>
          </Link>
        }
      />
      <TeacherAssignmentsTable
        data={rows}
        classrooms={classroomOpts}
        savedViews={savedViews}
        currentUserId={session.user.id}
      />
    </div>
  );
}
