import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { School, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function ClassroomsPage() {
  await requirePagePermission("classrooms.read");

  const rooms = await prisma.classroom.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      _count: { select: { students: true, teachers: true, lessons: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Sınıflar"
        description={`${rooms.length} sınıf`}
        actions={
          <Link href="/v2/admin/siniflar/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Sınıf
            </Button>
          </Link>
        }
      />
      {rooms.length === 0 ? (
        <EmptyState tone="lavender" icon={School} title="Henüz sınıf yok" />
      ) : (
        <div className="grid gap-od-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((c) => (
            <Card key={c.id} className="transition-all hover:shadow-od-md">
              <CardContent className="space-y-od-2 py-od-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-od-h3 font-semibold text-od-ink">{c.name}</h3>
                    {c.branch && <p className="text-od-tiny text-od-mute">{c.branch}</p>}
                  </div>
                  <Badge tone={c.isActive ? "mint" : "neutral"}>
                    {c.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div className="flex items-center gap-od-3 text-od-small text-od-ink-2">
                  <span><b>{c._count.students}</b> / {c.capacity} öğrenci</span>
                  <span className="text-od-mute">·</span>
                  <span>{c._count.teachers} öğretmen</span>
                  <span className="text-od-mute">·</span>
                  <span>{c._count.lessons} ders</span>
                </div>
                <Badge tone="sky">{c.level}</Badge>
                {c.description && (
                  <p className="text-od-small text-od-mute line-clamp-2">{c.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
