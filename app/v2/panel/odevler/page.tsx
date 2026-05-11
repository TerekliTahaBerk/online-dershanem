import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ClipboardList, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

const SUB_TONE: Record<string, "mint" | "yellow" | "sky" | "blush" | "neutral"> = {
  PENDING: "yellow",
  SUBMITTED: "sky",
  GRADED: "mint",
  LATE: "blush",
};

export default async function StudentAssignmentsPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return notFound();

  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { studentId: student.id },
        { classroom: { students: { some: { studentId: student.id } } } },
      ],
      status: { in: ["PUBLISHED", "CLOSED"] },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    include: {
      teacher: { select: { fullName: true } },
      submissions: { where: { studentId: student.id } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader title="Ödevlerim" description={`${assignments.length} ödev`} />
      {assignments.length === 0 ? (
        <EmptyState tone="yellow" icon={ClipboardList} title="Henüz ödev yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Başlık</th>
                  <th className="px-od-4 py-od-2">Öğretmen</th>
                  <th className="px-od-4 py-od-2">Son Teslim</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                  <th className="px-od-4 py-od-2">Notum</th>
                  <th className="px-od-4 py-od-2"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const sub = a.submissions[0];
                  const status = sub?.status ?? "PENDING";
                  return (
                    <tr key={a.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                      <td className="px-od-4 py-od-2 font-medium text-od-ink">{a.title}</td>
                      <td className="px-od-4 py-od-2 text-od-mute">{a.teacher.fullName}</td>
                      <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                        {a.dueAt ? format(a.dueAt, "dd MMM yyyy HH:mm", { locale: tr }) : "—"}
                      </td>
                      <td className="px-od-4 py-od-2">
                        <Badge tone={SUB_TONE[status] ?? "neutral"} size="sm">{status}</Badge>
                      </td>
                      <td className="px-od-4 py-od-2 font-medium">
                        {sub?.score != null ? `${sub.score}${a.maxScore ? `/${a.maxScore}` : ""}` : "—"}
                      </td>
                      <td className="px-od-4 py-od-2">
                        <Link
                          href={`/v2/panel/odevler/${a.id}`}
                          className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
                        >
                          Detay <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
