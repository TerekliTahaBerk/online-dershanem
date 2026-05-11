import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ClipboardList, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "sky" | "mint" | "neutral"> = {
  PUBLISHED: "mint",
  DRAFT: "neutral",
  CLOSED: "sky",
};

export default async function TeacherAssignmentsPage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return notFound();

  const assignments = await prisma.assignment.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      classroom: { select: { id: true, name: true } },
      student: { select: { id: true, fullName: true } },
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Ödevler"
        description={`${assignments.length} ödev`}
        actions={
          <Link href="/v2/admin/odevler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Ödev
            </Button>
          </Link>
        }
      />
      {assignments.length === 0 ? (
        <EmptyState tone="blush" icon={ClipboardList} title="Henüz ödev yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Başlık</th>
                  <th className="px-od-4 py-od-2">Hedef</th>
                  <th className="px-od-4 py-od-2">Son Teslim</th>
                  <th className="px-od-4 py-od-2">Gönderim</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2 font-medium text-od-ink">
                      <Link href={`/v2/ogretmen/odevler/${a.id}`} className="hover:text-pastel-sky-ink">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {a.classroom?.name ?? a.student?.fullName ?? "Genel"}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {a.dueAt ? format(a.dueAt, "dd MMM yyyy HH:mm", { locale: tr }) : "—"}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-mute">{a._count.submissions}</td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={STATUS_TONE[a.status] ?? "neutral"} size="sm">{a.status}</Badge>
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
