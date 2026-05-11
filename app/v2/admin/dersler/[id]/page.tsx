import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Pencil, Video, User, GraduationCap, School, PackageOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "sky" | "mint" | "blush" | "neutral"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
};

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("lessons.read");
  const { id } = await params;

  const l = await prisma.lesson.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, fullName: true, classLevel: true } },
      teacher: { select: { id: true, fullName: true, subjects: true } },
      classroom: { select: { id: true, name: true } },
      package: { select: { id: true, name: true } },
      attendances: true,
    },
  });
  if (!l) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={l.title ?? l.subject ?? "Ders"}
        description={format(l.scheduledAt, "dd MMMM yyyy · HH:mm", { locale: tr })}
        actions={
          <Link href={`/v2/admin/dersler/${l.id}/duzenle`}>
            <Button variant="primary" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Düzenle
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-od-2">
        <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>{l.status}</Badge>
        <span className="text-od-tiny text-od-mute">{l.duration} dk</span>
        {l.googleMeetLink && (
          <a
            href={l.googleMeetLink}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink underline"
          >
            <Video className="h-3.5 w-3.5" /> Meet linki
          </a>
        )}
      </div>

      <div className="grid gap-od-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <User className="h-4 w-4 text-pastel-sky-ink" /> Öğrenci
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/v2/admin/ogrenciler/${l.student.id}`}
              className="font-medium text-od-body hover:text-od-accent"
            >
              {l.student.fullName}
            </Link>
            {l.student.classLevel && <Badge tone="sky" className="ml-od-2">{l.student.classLevel}</Badge>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <GraduationCap className="h-4 w-4 text-pastel-mint-ink" /> Öğretmen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/v2/admin/ogretmenler/${l.teacher.id}`}
              className="font-medium text-od-body hover:text-od-accent"
            >
              {l.teacher.fullName}
            </Link>
            <div className="text-od-tiny text-od-mute">{l.teacher.subjects}</div>
          </CardContent>
        </Card>

        {l.classroom && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-od-2">
                <School className="h-4 w-4 text-pastel-lavender-ink" /> Sınıf
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/v2/admin/siniflar/${l.classroom.id}`}
                className="font-medium hover:text-od-accent"
              >
                {l.classroom.name}
              </Link>
            </CardContent>
          </Card>
        )}

        {l.package && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-od-2">
                <PackageOpen className="h-4 w-4 text-pastel-peach-ink" /> Paket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/v2/admin/paketler/${l.package.id}`}
                className="font-medium hover:text-od-accent"
              >
                {l.package.name}
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {l.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notlar</CardTitle>
          </CardHeader>
          <CardContent className="text-od-body whitespace-pre-line">{l.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <CalendarDays className="h-4 w-4 text-pastel-mint-ink" /> Yoklama ({l.attendances.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border">
          {l.attendances.length === 0 && <p className="text-od-tiny text-od-mute">Henüz yoklama yok.</p>}
          {l.attendances.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-od-2 text-od-body">
              <span>{a.status}</span>
              <span className="text-od-tiny text-od-mute">
                {format(a.sessionDate, "dd MMM HH:mm", { locale: tr })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
