import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { StudentDetailTabs } from "@/components/od/domain/students/student-detail-tabs";
import { Button } from "@/components/od/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
  if (!student) notFound();

  const [packages, payments, attendance, notes, files, submissions, history] =
    await Promise.all([
      prisma.studentPackage.findMany({
        where: { studentId: id },
        include: { package: { select: { id: true, name: true } } },
        orderBy: { assignedAt: "desc" },
      }).catch(() => []),
      prisma.accountingEntry.findMany({
        where: { studentId: id },
        orderBy: { occurredAt: "desc" },
        take: 100,
      }),
      prisma.attendance.findMany({
        where: { studentId: id },
        include: { lesson: { select: { title: true } } },
        orderBy: { sessionDate: "desc" },
        take: 100,
      }).catch(() => []),
      prisma.studentNote.findMany({
        where: { studentId: id },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.studentFile.findMany({
        where: { studentId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId: id },
        include: { assignment: { select: { title: true, maxScore: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.auditLog.findMany({
        where: { entityType: "Student", entityId: id },
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={student.fullName}
        description={`${student.phone}${student.email ? ` · ${student.email}` : ""}`}
        actions={
          <Link href="/v2/admin/ogrenciler">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Listeye dön
            </Button>
          </Link>
        }
      />

      <StudentDetailTabs
        student={student}
        packages={packages}
        payments={payments}
        attendance={attendance}
        notes={notes}
        files={files}
        assignments={submissions}
        history={history}
      />
    </div>
  );
}
