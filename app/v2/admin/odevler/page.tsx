import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";

const STATUS_TONE: Record<string, "sky" | "mint" | "neutral"> = {
  PUBLISHED: "mint",
  DRAFT: "neutral",
  CLOSED: "sky",
};

export default async function AssignmentsPage() {
  await requirePagePermission("assignments.read");

  const assignments = await prisma.assignment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      teacher: { select: { id: true, fullName: true } },
      classroom: { select: { id: true, name: true } },
      student: { select: { id: true, fullName: true } },
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Ödevler"
        description={`Son ${assignments.length} ödev`}
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
                  <th className="px-od-4 py-od-2">Öğretmen</th>
                  <th className="px-od-4 py-od-2">Hedef</th>
                  <th className="px-od-4 py-od-2">Teslim</th>
                  <th className="px-od-4 py-od-2">Gönderim</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2">
                      <div className="font-medium text-od-ink">{a.title}</div>
                      {a.subject && <div className="text-od-tiny text-od-mute">{a.subject}</div>}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-ink-2">{a.teacher?.fullName ?? "—"}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">
                      {a.classroom ? (
                        <Badge tone="lavender">{a.classroom.name}</Badge>
                      ) : a.student ? (
                        <Badge tone="mint">{a.student.fullName}</Badge>
                      ) : (
                        <Badge tone="sky">Tüm öğrenciler</Badge>
                      )}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {a.dueAt ? format(new Date(a.dueAt), "dd MMM yyyy", { locale: tr }) : "—"}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-mute">{a._count.submissions}</td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Badge>
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
