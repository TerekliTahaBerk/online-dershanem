import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { School, Users, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

export default async function TeacherClassroomsPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return notFound();

  const memberships = await prisma.classroomTeacher.findMany({
    where: { teacherId: teacher.id },
    include: {
      classroom: {
        include: {
          _count: { select: { students: true, lessons: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader title="Sınıflarım" description={`${memberships.length} sınıf`} />
      {memberships.length === 0 ? (
        <EmptyState tone="lavender" icon={School} title="Atanmış sınıf yok" />
      ) : (
        <div className="grid gap-od-4 md:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => (
            <Card key={m.classroomId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-od-2">
                  <School className="h-4 w-4 text-pastel-lavender-ink" />
                  {m.classroom.name}
                  {m.isLead && <Badge tone="lavender" size="sm">Lider</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-od-2 text-od-body">
                <div className="text-od-tiny text-od-mute">
                  {m.classroom.branch ?? "—"} · {m.classroom.level}
                </div>
                <div className="flex items-center gap-od-3 pt-od-2">
                  <span className="inline-flex items-center gap-1 text-od-tiny text-od-mute">
                    <Users className="h-3.5 w-3.5" /> {m.classroom._count.students}
                  </span>
                  <span className="inline-flex items-center gap-1 text-od-tiny text-od-mute">
                    <GraduationCap className="h-3.5 w-3.5" /> {m.classroom._count.lessons}
                  </span>
                </div>
                {m.subject && (
                  <Badge tone="sky" size="sm">{m.subject}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
