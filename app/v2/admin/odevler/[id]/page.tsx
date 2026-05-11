import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ClipboardList, Pencil, Users, GraduationCap, School } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "sky" | "mint" | "neutral"> = {
  PUBLISHED: "mint",
  DRAFT: "neutral",
  CLOSED: "sky",
};

const SUB_TONE: Record<string, "sky" | "mint" | "blush" | "yellow" | "neutral"> = {
  PENDING: "neutral",
  SUBMITTED: "sky",
  GRADED: "mint",
  LATE: "yellow",
  MISSED: "blush",
};

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("assignments.read");
  const { id } = await params;

  const a = await prisma.assignment.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, fullName: true } },
      classroom: { select: { id: true, name: true } },
      student: { select: { id: true, fullName: true } },
      submissions: {
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!a) return notFound();

  const target = a.classroomId
    ? "Sınıf"
    : a.studentId
    ? "Tek Öğrenci"
    : "Genel";

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={a.title}
        description={a.subject ?? "—"}
        actions={
          <Link href={`/v2/admin/odevler/${a.id}/duzenle`}>
            <Button variant="primary" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Düzenle
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-od-2">
        <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Badge>
        <Badge tone="lavender">{target}</Badge>
        {a.dueAt && (
          <span className="text-od-tiny text-od-mute">
            Son teslim: {format(a.dueAt, "dd MMM yyyy HH:mm", { locale: tr })}
          </span>
        )}
        {a.maxScore != null && (
          <span className="text-od-tiny text-od-mute">Maks {a.maxScore}p</span>
        )}
      </div>

      <div className="grid gap-od-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-od-2">
              <GraduationCap className="h-4 w-4 text-pastel-mint-ink" /> Öğretmen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/v2/admin/ogretmenler/${a.teacher.id}`}
              className="font-medium hover:text-od-accent"
            >
              {a.teacher.fullName}
            </Link>
          </CardContent>
        </Card>

        {a.classroom && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-od-2">
                <School className="h-4 w-4 text-pastel-lavender-ink" /> Sınıf
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/v2/admin/siniflar/${a.classroom.id}`} className="font-medium hover:text-od-accent">
                {a.classroom.name}
              </Link>
            </CardContent>
          </Card>
        )}

        {a.student && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-od-2">
                <Users className="h-4 w-4 text-pastel-sky-ink" /> Öğrenci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/v2/admin/ogrenciler/${a.student.id}`} className="font-medium hover:text-od-accent">
                {a.student.fullName}
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {a.description && (
        <Card>
          <CardHeader>
            <CardTitle>Açıklama</CardTitle>
          </CardHeader>
          <CardContent className="text-od-body whitespace-pre-line">{a.description}</CardContent>
        </Card>
      )}

      {a.attachmentUrl && (
        <Card>
          <CardContent className="p-od-3">
            <a
              href={a.attachmentUrl}
              target="_blank"
              rel="noopener"
              className="text-od-body text-pastel-sky-ink underline"
            >
              📎 Eklenti / Link
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <ClipboardList className="h-4 w-4 text-pastel-peach-ink" /> Gönderimler ({a.submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {a.submissions.length === 0 ? (
            <p className="p-od-3 text-od-tiny text-od-mute">Henüz gönderim yok.</p>
          ) : (
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Öğrenci</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                  <th className="px-od-4 py-od-2">Puan</th>
                  <th className="px-od-4 py-od-2">Gönderim</th>
                  <th className="px-od-4 py-od-2">Notlandı</th>
                </tr>
              </thead>
              <tbody>
                {a.submissions.map((s) => (
                  <tr key={s.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2">
                      <Link
                        href={`/v2/admin/ogrenciler/${s.student.id}`}
                        className="text-od-ink hover:text-od-accent"
                      >
                        {s.student.fullName}
                      </Link>
                    </td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={SUB_TONE[s.status] ?? "neutral"} size="sm">{s.status}</Badge>
                    </td>
                    <td className="px-od-4 py-od-2 text-od-mute">
                      {s.score != null ? `${s.score}${a.maxScore ? `/${a.maxScore}` : ""}` : "—"}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {s.submittedAt ? format(s.submittedAt, "dd MMM HH:mm", { locale: tr }) : "—"}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {s.gradedAt ? format(s.gradedAt, "dd MMM HH:mm", { locale: tr }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
