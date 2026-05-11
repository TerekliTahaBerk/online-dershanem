import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { HeartHandshake, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function ParentsPage() {
  await requirePagePermission("parents.read");

  const parents = await prisma.parent.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      students: { include: { student: { select: { id: true, fullName: true } } } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Veliler"
        description={`${parents.length} kayıt`}
        actions={
          <Link href="/v2/admin/veliler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Veli
            </Button>
          </Link>
        }
      />
      {parents.length === 0 ? (
        <EmptyState tone="yellow" icon={HeartHandshake} title="Veli kaydı yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Ad Soyad</th>
                  <th className="px-od-4 py-od-2">Telefon</th>
                  <th className="px-od-4 py-od-2">Email</th>
                  <th className="px-od-4 py-od-2">Öğrenciler</th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2 font-medium text-od-ink">{p.fullName}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">{p.phone ?? "—"}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">{p.email ?? "—"}</td>
                    <td className="px-od-4 py-od-2">
                      <div className="flex flex-wrap gap-1">
                        {p.students.map((ps) => (
                          <Badge key={ps.student.id} tone="mint">
                            {ps.student.fullName}
                          </Badge>
                        ))}
                      </div>
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
