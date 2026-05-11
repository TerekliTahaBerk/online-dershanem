import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { School, Pencil, Users, GraduationCap, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("classrooms.read");
  const { id } = await params;

  const c = await prisma.classroom.findUnique({
    where: { id },
    include: {
      teachers: { include: { teacher: { select: { id: true, fullName: true, subjects: true } } } },
      students: {
        where: { leftAt: null },
        include: { student: { select: { id: true, fullName: true, classLevel: true, status: true } } },
      },
      _count: { select: { lessons: true, assignments: true } },
    },
  });
  if (!c) return notFound();

  const recentLessons = await prisma.lesson.findMany({
    where: { classroomId: id },
    orderBy: { scheduledAt: "desc" },
    take: 10,
    include: { teacher: { select: { fullName: true } } },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={c.name}
        description={`${c.branch ?? "—"} · ${c.level} · Kapasite ${c.capacity}`}
        actions={
          <Link href={`/v2/admin/siniflar/${c.id}/duzenle`}>
            <Button variant="primary" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Düzenle
            </Button>
          </Link>
        }
      />

      <div className="grid gap-od-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Öğrenci</div>
            <div className="text-od-h3 font-semibold">{c.students.length}/{c.capacity}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Öğretmen</div>
            <div className="text-od-h3 font-semibold">{c.teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Ders</div>
            <div className="text-od-h3 font-semibold">{c._count.lessons}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Ödev</div>
            <div className="text-od-h3 font-semibold">{c._count.assignments}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-od-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <GraduationCap className="h-4 w-4 text-pastel-mint-ink" /> Öğretmenler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2">
            {c.teachers.length === 0 && <p className="text-od-tiny text-od-mute">Atanmış öğretmen yok.</p>}
            {c.teachers.map((ct) => (
              <Link
                key={ct.teacherId}
                href={`/v2/admin/ogretmenler/${ct.teacher.id}`}
                className="flex items-center justify-between rounded-od border border-od-border p-od-2 hover:bg-od-surface-soft"
              >
                <div>
                  <div className="font-medium">{ct.teacher.fullName}</div>
                  <div className="text-od-tiny text-od-mute">{ct.subject ?? ct.teacher.subjects}</div>
                </div>
                {ct.isLead && <Badge tone="lavender">Lider</Badge>}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <Users className="h-4 w-4 text-pastel-sky-ink" /> Öğrenciler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2">
            {c.students.length === 0 && <p className="text-od-tiny text-od-mute">Kayıtlı öğrenci yok.</p>}
            {c.students.map((cs) => (
              <Link
                key={cs.studentId}
                href={`/v2/admin/ogrenciler/${cs.student.id}`}
                className="flex items-center justify-between rounded-od border border-od-border p-od-2 hover:bg-od-surface-soft"
              >
                <div className="font-medium text-od-body">{cs.student.fullName}</div>
                <div className="flex items-center gap-od-2">
                  {cs.student.classLevel && <Badge tone="sky">{cs.student.classLevel}</Badge>}
                  <Badge tone={cs.student.status === "ACTIVE" ? "mint" : "blush"}>{cs.student.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <BookOpen className="h-4 w-4 text-pastel-peach-ink" /> Son Dersler
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border">
          {recentLessons.length === 0 && <p className="text-od-tiny text-od-mute">Kayıt yok.</p>}
          {recentLessons.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-od-2 text-od-body">
              <div>
                <div className="font-medium">{l.title ?? l.subject ?? "—"}</div>
                <div className="text-od-tiny text-od-mute">{l.teacher.fullName}</div>
              </div>
              <div className="text-od-tiny text-od-mute">
                {format(l.scheduledAt, "dd MMM yyyy HH:mm", { locale: tr })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {c.description && (
        <Card>
          <CardHeader>
            <CardTitle>Açıklama</CardTitle>
          </CardHeader>
          <CardContent className="text-od-body whitespace-pre-line">{c.description}</CardContent>
        </Card>
      )}
    </div>
  );
}
