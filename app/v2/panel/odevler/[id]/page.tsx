import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, ClipboardList, ExternalLink, Calendar, Award } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { SubmissionForm } from "@/components/od/domain/assignments/submission-form";

export const dynamic = "force-dynamic";

const SUB_TONE: Record<string, "mint" | "yellow" | "sky" | "blush" | "neutral"> = {
  PENDING: "yellow",
  SUBMITTED: "sky",
  GRADED: "mint",
  LATE: "blush",
};

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return notFound();

  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      OR: [
        { studentId: student.id },
        { classroom: { students: { some: { studentId: student.id } } } },
      ],
    },
    include: {
      teacher: { select: { fullName: true } },
      classroom: { select: { name: true } },
      submissions: { where: { studentId: student.id } },
    },
  });
  if (!assignment) return notFound();

  const sub = assignment.submissions[0];
  const status = sub?.status ?? "PENDING";
  const isClosed = assignment.status === "CLOSED";

  return (
    <div className="space-y-od-5">
      <Link
        href="/v2/panel/odevler"
        className="inline-flex items-center gap-1 text-od-tiny text-od-mute hover:text-od-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Ödevlerim
      </Link>
      <PageHeader
        title={assignment.title}
        description={`${assignment.teacher.fullName}${assignment.classroom ? ` · ${assignment.classroom.name}` : ""}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <ClipboardList className="h-4 w-4 text-pastel-peach-ink" /> Ödev
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-od-3">
          <div className="flex flex-wrap items-center gap-od-2">
            <Badge tone={SUB_TONE[status] ?? "neutral"}>{status}</Badge>
            {assignment.dueAt && (
              <span className="inline-flex items-center gap-1 text-od-tiny text-od-mute">
                <Calendar className="h-3.5 w-3.5" /> Son: {format(assignment.dueAt, "dd MMM yyyy HH:mm", { locale: tr })}
              </span>
            )}
            {assignment.maxScore && (
              <span className="inline-flex items-center gap-1 text-od-tiny text-od-mute">
                <Award className="h-3.5 w-3.5" /> Maks: {assignment.maxScore}
              </span>
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

      {sub?.status === "GRADED" && (
        <Card>
          <CardHeader>
            <CardTitle>Notlandırma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-od-2">
            <div className="text-od-h2 font-bold text-pastel-mint-ink">
              {sub.score}{assignment.maxScore ? ` / ${assignment.maxScore}` : ""}
            </div>
            {sub.feedback && (
              <p className="rounded-od border border-od-border bg-od-subtle p-od-2 text-od-small whitespace-pre-line">
                {sub.feedback}
              </p>
            )}
            <p className="text-od-tiny text-od-mute">
              Notlandırma tarihi: {sub.gradedAt && format(sub.gradedAt, "dd MMM yyyy HH:mm", { locale: tr })}
            </p>
          </CardContent>
        </Card>
      )}

      {!isClosed && status !== "GRADED" ? (
        <SubmissionForm
          assignmentId={assignment.id}
          initialContent={sub?.content ?? null}
          initialAttachmentUrl={sub?.attachmentUrl ?? null}
          alreadySubmitted={!!sub}
        />
      ) : isClosed ? (
        <Card>
          <CardContent className="p-od-3 text-od-tiny text-od-mute">
            Bu ödev kapatılmış, gönderim yapılamaz.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
