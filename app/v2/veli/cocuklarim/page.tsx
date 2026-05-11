import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Users, ArrowRight, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

export default async function ParentChildrenPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx) return notFound();

  const childIds = ctx.childIds;
  const counts = await prisma.lesson.groupBy({
    by: ["studentId"],
    where: { studentId: { in: childIds } },
    _count: { _all: true },
  });
  const lessonCount = new Map(counts.map((c) => [c.studentId, c._count._all]));

  return (
    <div className="space-y-od-5">
      <PageHeader title="Çocuklarım" description={`${ctx.parent.students.length} çocuk`} />
      {ctx.parent.students.length === 0 ? (
        <EmptyState tone="lavender" icon={Users} title="Bağlı çocuk yok" />
      ) : (
        <div className="grid gap-od-4 md:grid-cols-2 lg:grid-cols-3">
          {ctx.parent.students.map((ps) => (
            <Card key={ps.studentId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-od-2">
                  <Users className="h-4 w-4 text-pastel-lavender-ink" />
                  {ps.student.fullName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-od-2">
                <div className="flex flex-wrap gap-od-2 text-od-tiny">
                  {ps.student.classLevel && <Badge tone="sky" size="sm">{ps.student.classLevel}</Badge>}
                  {ps.student.examType && <Badge tone="lavender" size="sm">{ps.student.examType}</Badge>}
                  <Badge tone={ps.student.status === "ACTIVE" ? "mint" : "neutral"} size="sm">
                    {ps.student.status}
                  </Badge>
                  {ps.relationship && <Badge tone="neutral" size="sm">{ps.relationship}</Badge>}
                  {ps.isPrimary && <Badge tone="mint" size="sm">Birincil</Badge>}
                </div>
                {ps.student.schoolName && (
                  <div className="text-od-tiny text-od-mute">{ps.student.schoolName}</div>
                )}
                <div className="text-od-tiny text-od-mute">
                  Toplam {lessonCount.get(ps.studentId) ?? 0} ders
                </div>
                <Link
                  href={`/v2/veli/cocuklarim/${ps.studentId}`}
                  className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink hover:underline"
                >
                  Detay <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
