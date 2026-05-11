import { redirect, notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { PageHeader } from "@/components/od/page-header";
import { EmptyState } from "@/components/od/feedback/empty-state";
import {
  TeacherStudentsTable,
  type TeacherStudentRow,
} from "@/components/od/domain/teacher/teacher-students-table";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const STATUSES = new Set([
  "NEW",
  "FOLLOW_UP",
  "ACTIVE",
  "AT_RISK",
  "COMPLETED",
  "INACTIVE",
]);

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function TeacherStudentsPage({
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
  const classLevel = asArray(sp.classLevel);
  const examType = asArray(sp.examType);

  const lessonStudents = await prisma.lesson.findMany({
    where: { teacherId: teacher.id },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const ids = lessonStudents.map((l) => l.studentId);

  if (ids.length === 0) {
    return (
      <div className="space-y-od-5">
        <PageHeader title="Öğrencilerim" description="Henüz ders verdiğin öğrenci yok" />
        <EmptyState
          tone="sky"
          icon={Users}
          title="Öğrenci yok"
          description="Sana atanmış ders olmadan burası boş kalır."
        />
      </div>
    );
  }

  const where: Prisma.StudentWhereInput = { id: { in: ids } };
  if (status.length) where.status = { in: status };
  if (classLevel.length) where.classLevel = { in: classLevel };
  if (examType.length) where.examType = { in: examType };

  const [students, classLevelOpts, examTypeOpts, savedViews] = await Promise.all([
    prisma.student.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        phone: true,
        classLevel: true,
        examType: true,
        status: true,
        _count: { select: { lessons: { where: { teacherId: teacher.id } } } },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.student.findMany({
      where: { id: { in: ids }, classLevel: { not: null } },
      distinct: ["classLevel"],
      select: { classLevel: true },
      orderBy: { classLevel: "asc" },
    }),
    prisma.student.findMany({
      where: { id: { in: ids }, examType: { not: null } },
      distinct: ["examType"],
      select: { examType: true },
      orderBy: { examType: "asc" },
    }),
    loadSavedViews("teacher.students", session.user.id),
  ]);

  const rows: TeacherStudentRow[] = students.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    phone: s.phone,
    classLevel: s.classLevel,
    examType: s.examType,
    status: s.status,
    lessonCount: s._count.lessons,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Öğrencilerim"
        description={rows.length + " öğrenci · filtrele, ara veya dışa aktar"}
      />
      <TeacherStudentsTable
        data={rows}
        classLevels={classLevelOpts.map((c) => c.classLevel!).filter(Boolean)}
        examTypes={examTypeOpts.map((c) => c.examType!).filter(Boolean)}
        savedViews={savedViews}
        currentUserId={session.user.id}
      />
    </div>
  );
}
