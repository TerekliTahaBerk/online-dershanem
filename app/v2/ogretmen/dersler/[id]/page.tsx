import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, CalendarDays, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { AttendanceForm } from "@/components/od/domain/attendance/attendance-form";

export const dynamic = "force-dynamic";

export default async function TeacherLessonAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return notFound();

  const lesson = await prisma.lesson.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      student: { select: { id: true, fullName: true } },
      classroom: {
        include: {
          students: {
            where: { leftAt: null },
            include: { student: { select: { id: true, fullName: true } } },
          },
        },
      },
      attendances: { where: { context: "LESSON" } },
    },
  });
  if (!lesson) return notFound();

  // Bireysel ders → tek öğrenci, sınıf dersi → sınıftaki öğrenciler
  const students = lesson.classroom
    ? lesson.classroom.students.map((cs) => cs.student)
    : [lesson.student];

  const existing = lesson.attendances.map((a) => ({
    studentId: a.studentId,
    status: a.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
    minutesLate: a.minutesLate,
    notes: a.notes,
  }));

  return (
    <div className="space-y-od-5">
      <Link
        href="/v2/ogretmen/yoklama"
        className="inline-flex items-center gap-1 text-od-tiny text-od-mute hover:text-od-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Yoklama listesi
      </Link>
      <PageHeader
        title={lesson.title ?? lesson.subject ?? "Ders"}
        description={`${format(lesson.scheduledAt, "dd MMM yyyy HH:mm", { locale: tr })} · ${students.length} öğrenci`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <CalendarDays className="h-4 w-4 text-pastel-sky-ink" /> Ders Bilgisi
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-od-2 text-od-small">
          <Badge tone="sky" size="sm">{lesson.status}</Badge>
          <span className="text-od-mute">{lesson.duration} dk</span>
          {lesson.classroom && (
            <Badge tone="lavender" size="sm">{lesson.classroom.name}</Badge>
          )}
          {lesson.googleMeetLink && (
            <a
              href={lesson.googleMeetLink}
              target="_blank"
              rel="noopener"
              className="ml-auto inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
            >
              <Video className="h-3.5 w-3.5" /> Meet
            </a>
          )}
        </CardContent>
      </Card>

      <AttendanceForm lessonId={lesson.id} students={students} existing={existing} />
    </div>
  );
}
