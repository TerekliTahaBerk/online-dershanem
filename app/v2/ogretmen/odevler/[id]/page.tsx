import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, ClipboardList, ExternalLink, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { GradeForm } from "@/components/od/domain/assignments/grade-form";

export const dynamic = "force-dynamic";

const SUB_TONE: Record<string, "mint" | "yellow" | "sky" | "blush" | "neutral"> = {
  PENDING: "yellow",
  SUBMITTED: "sky",
  GRADED: "mint",
  LATE: "blush",
};

export default async function TeacherAssignmentDetailPage({
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

  const assignment = await prisma.assignment.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      classroom: {
        include: {
          students: {
            where: { leftAt: null },
            include: { student: { select: { id: true, fullName: true } } },
          },
        },
      },
      student: { select: { id: true, fullName: true } },
      submissions: { include: { student: { select: { id: true, fullName: true } } } },
    },
  });
  if (!assignment) return notFound();

  // Hedef öğrenci listesi (sınıf veya direct)
  const targets = assignment.student
    ? [assignment.student]
    : assignment.classroom?.students.map((cs) => cs.student) ?? [];

  const subByStudent = new Map(assignment.submissions.map((s) => [s.studentId, s]));

  return (
    <div className="space-y-od-5">
      <Link
        href="/v2/ogretmen/odevler"
        className="inline-flex items-center gap-1 text-od-tiny text-od-mute hover:text-od-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Ödevler
      </Link>
      <PageHeader
        title={assignment.title}
        description={`${targets.length} hedef · ${assignment.submissions.length} gönderim`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <ClipboardList className="h-4 w-4 text-pastel-peach-ink" /> Ödev
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-od-2">
          <div className="flex flex-wrap items-center gap-od-2">
            <Badge tone={assignment.status === "PUBLISHED" ? "mint" : "neutral"}>{assignment.status}</Badge>
            {assignment.dueAt && (
              <span className="inline-flex items-center gap-1 text-od-tiny text-od-mute">
                <Calendar className="h-3.5 w-3.5" /> Son: {format(assignment.dueAt, "dd MMM yyyy HH:mm", { locale: tr })}
              </span>
            )}
            {assignment.maxScore && (
              <span className="text-od-tiny text-od-mute">Maks: {assignment.maxScore}</span>
            )}
          </div>
          {assignment.description && (
            <p className="whitespace-pre-line rounded-od border border-od-border bg-od-subtle p-od-2 text-od-small">
              {assignment.description}
            </p>
          )}
          {assignment.attachmentUrl && (
            <a
              href={assignment.attachmentUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ek dosya
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gönderimler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-od-3 p-od-3">
          {targets.length === 0 ? (
            <p className="text-od-tiny text-od-mute">Hedef öğrenci yok.</p>
          ) : (
            targets.map((t) => {
              const sub = subByStudent.get(t.id);
              const status = sub?.status ?? "PENDING";
              return (
                <div key={t.id} className="space-y-od-2 rounded-od border border-od-border p-od-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-od-body">{t.fullName}</div>
                    <Badge tone={SUB_TONE[status] ?? "neutral"} size="sm">{status}</Badge>
                  </div>
                  {sub?.submittedAt && (
                    <div className="text-od-tiny text-od-mute">
                      Gönderildi: {format(sub.submittedAt, "dd MMM yyyy HH:mm", { locale: tr })}
                    </div>
                  )}
                  {sub?.content && (
                    <div className="rounded-od bg-od-subtle p-od-2 text-od-tiny whitespace-pre-line">
                      {sub.content}
                    </div>
                  )}
                  {sub?.attachmentUrl && (
                    <a
                      href={sub.attachmentUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Ek
                    </a>
                  )}
                  {sub ? (
                    <GradeForm
                      submissionId={sub.id}
                      initialScore={sub.score}
                      initialFeedback={sub.feedback}
                      maxScore={assignment.maxScore}
                    />
                  ) : (
                    <p className="text-od-tiny text-od-mute">Henüz gönderim yok.</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
