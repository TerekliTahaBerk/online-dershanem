import { redirect, notFound } from "next/navigation";
import { School, Users, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentClassroomPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return notFound();

  const memberships = await prisma.classroomStudent.findMany({
    where: { studentId: student.id, leftAt: null },
    include: {
      classroom: {
        include: {
          teachers: { include: { teacher: { select: { id: true, fullName: true, subjects: true } } } },
          _count: { select: { students: true, lessons: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader title="Sınıfım" description={`${memberships.length} sınıf`} />
      {memberships.length === 0 ? (
        <EmptyState tone="lavender" icon={School} title="Henüz bir sınıfa kayıtlı değilsin" />
      ) : (
        <div className="space-y-od-4">
          {memberships.map((m) => (
            <Card key={m.classroomId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-od-2">
                  <School className="h-4 w-4 text-pastel-lavender-ink" /> {m.classroom.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-od-3">
                <div className="text-od-tiny text-od-mute">
                  {m.classroom.branch ?? "—"} · {m.classroom.level}
                </div>
                <div className="flex items-center gap-od-3 text-od-tiny text-od-mute">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {m.classroom._count.students}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" /> {m.classroom._count.lessons} ders
                  </span>
                </div>
                <div>
                  <div className="text-od-tiny font-medium uppercase text-od-mute">Öğretmenler</div>
                  <div className="mt-1 flex flex-wrap gap-od-2">
                    {m.classroom.teachers.map((ct) => (
                      <Badge key={ct.teacherId} tone="sky" size="sm">
                        {ct.teacher.fullName}
                        {ct.subject ? ` · ${ct.subject}` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
