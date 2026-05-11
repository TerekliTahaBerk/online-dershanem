import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { GraduationCap, Mail, Phone, Pencil, BookOpen, School } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("teachers.read");
  const { id } = await params;

  const t = await prisma.teacher.findUnique({
    where: { id },
    include: {
      classrooms: { include: { classroom: true } },
      _count: { select: { lessons: true, assignments: true } },
    },
  });
  if (!t) return notFound();

  const recentLessons = await prisma.lesson.findMany({
    where: { teacherId: id },
    orderBy: { scheduledAt: "desc" },
    take: 10,
    include: { student: { select: { fullName: true } } },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={t.fullName}
        description={t.subjects}
        actions={
          <Link href={`/v2/admin/ogretmenler/${t.id}/duzenle`}>
            <Button variant="primary" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Düzenle
            </Button>
          </Link>
        }
      />

      <div className="grid gap-od-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <GraduationCap className="h-4 w-4 text-pastel-mint-ink" /> Genel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2 text-od-body">
            <div className="flex items-center gap-od-2 text-od-mute">
              <Mail className="h-4 w-4" /> {t.email ?? "—"}
            </div>
            <div className="flex items-center gap-od-2 text-od-mute">
              <Phone className="h-4 w-4" /> {t.phone ?? "—"}
            </div>
            <div className="pt-od-2">
              <Badge tone={t.status === "ACTIVE" ? "mint" : "blush"}>{t.status}</Badge>
            </div>
            {t.bio && <p className="pt-od-2 text-od-tiny text-od-mute whitespace-pre-line">{t.bio}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sayılar</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-od-3">
            <div>
              <div className="text-od-tiny text-od-mute">Toplam Ders</div>
              <div className="text-od-h3 font-semibold">{t._count.lessons}</div>
            </div>
            <div>
              <div className="text-od-tiny text-od-mute">Ödev</div>
              <div className="text-od-h3 font-semibold">{t._count.assignments}</div>
            </div>
            <div className="col-span-2">
              <div className="text-od-tiny text-od-mute">Sınıf</div>
              <div className="text-od-h3 font-semibold">{t.classrooms.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <School className="h-4 w-4 text-pastel-sky-ink" /> Sınıflar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2">
            {t.classrooms.length === 0 && <p className="text-od-tiny text-od-mute">Atanmış sınıf yok.</p>}
            {t.classrooms.map((ct) => (
              <div key={ct.classroomId} className="flex items-center justify-between text-od-body">
                <span>{ct.classroom.name}</span>
                {ct.isLead && <Badge tone="lavender">Lider</Badge>}
              </div>
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
                <div className="text-od-tiny text-od-mute">{l.student.fullName}</div>
              </div>
              <div className="text-od-tiny text-od-mute">
                {format(l.scheduledAt, "dd MMM yyyy HH:mm", { locale: tr })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
