import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
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

export default async function ParentAssignmentsPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx) return notFound();

  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { studentId: { in: ctx.childIds } },
        { classroom: { students: { some: { studentId: { in: ctx.childIds } } } } },
      ],
      status: { in: ["PUBLISHED", "CLOSED"] },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    include: {
      teacher: { select: { fullName: true } },
      submissions: {
        where: { studentId: { in: ctx.childIds } },
        include: { student: { select: { fullName: true } } },
      },
      classroom: {
        include: {
          students: {
            where: { studentId: { in: ctx.childIds } },
            include: { student: { select: { id: true, fullName: true } } },
          },
        },
      },
      student: { select: { id: true, fullName: true } },
    },
  });

  // Per-child rows expansion
  const rows: Array<{
    assignmentId: string;
    title: string;
    teacher: string;
    childName: string;
    dueAt: Date | null;
    status: string;
    score: number | null;
    maxScore: number | null;
  }> = [];
  for (const a of assignments) {
    const targets = a.student
      ? [a.student]
      : a.classroom?.students.map((cs) => cs.student) ?? [];
    for (const t of targets) {
      const sub = a.submissions.find((s) => s.studentId === t.id);
      rows.push({
        assignmentId: a.id,
        title: a.title,
        teacher: a.teacher.fullName,
        childName: t.fullName,
        dueAt: a.dueAt,
        status: sub?.status ?? "PENDING",
        score: sub?.score ?? null,
        maxScore: a.maxScore ?? null,
      });
    }
  }

  return (
    <div className="space-y-od-5">
      <PageHeader title="Ödevler" description={`${rows.length} kayıt`} />
      {rows.length === 0 ? (
        <EmptyState tone="yellow" icon={ClipboardList} title="Aktif ödev yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Çocuk</th>
                  <th className="px-od-4 py-od-2">Ödev</th>
                  <th className="px-od-4 py-od-2">Öğretmen</th>
                  <th className="px-od-4 py-od-2">Son Teslim</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                  <th className="px-od-4 py-od-2">Not</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.assignmentId}-${i}`} className="border-b border-od-border/60">
                    <td className="px-od-4 py-od-2 font-medium text-od-ink">{r.childName}</td>
                    <td className="px-od-4 py-od-2">{r.title}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">{r.teacher}</td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {r.dueAt ? format(r.dueAt, "dd MMM yyyy HH:mm", { locale: tr }) : "—"}
                    </td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={SUB_TONE[r.status] ?? "neutral"} size="sm">{r.status}</Badge>
                    </td>
                    <td className="px-od-4 py-od-2 font-medium">
                      {r.score != null ? `${r.score}${r.maxScore ? `/${r.maxScore}` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
