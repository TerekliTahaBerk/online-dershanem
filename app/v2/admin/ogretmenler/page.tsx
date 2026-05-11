import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { GraduationCap, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function TeachersPage() {
  await requirePagePermission("teachers.read");

  const teachers = await prisma.teacher.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      _count: { select: { lessons: true, classrooms: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Öğretmenler"
        description={`${teachers.length} kayıt`}
        actions={
          <Link href="/v2/admin/ogretmenler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Öğretmen
            </Button>
          </Link>
        }
      />
      {teachers.length === 0 ? (
        <EmptyState
          tone="sky"
          icon={GraduationCap}
          title="Henüz öğretmen yok"
          description="Sisteme öğretmen ekleyerek derslere başlayabilirsiniz."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Ad Soyad</th>
                  <th className="px-od-4 py-od-2">İletişim</th>
                  <th className="px-od-4 py-od-2">Branş</th>
                  <th className="px-od-4 py-od-2">Sınıflar</th>
                  <th className="px-od-4 py-od-2">Dersler</th>
                  <th className="px-od-4 py-od-2">Durum</th>
                  <th className="px-od-4 py-od-2">Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2 font-medium text-od-ink">{t.fullName}</td>
                    <td className="px-od-4 py-od-2 text-od-ink-2">
                      {t.email ?? "—"}
                      {t.phone && <div className="text-od-tiny text-od-mute">{t.phone}</div>}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-mute">{t.subjects}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">{t._count.classrooms}</td>
                    <td className="px-od-4 py-od-2 text-od-mute">{t._count.lessons}</td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone={t.status === "ACTIVE" ? "mint" : "neutral"}>{t.status}</Badge>
                    </td>
                    <td className="px-od-4 py-od-2 text-od-tiny text-od-mute">
                      {format(new Date(t.updatedAt), "dd MMM yyyy", { locale: tr })}
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
