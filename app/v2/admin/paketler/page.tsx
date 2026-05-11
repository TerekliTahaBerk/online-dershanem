import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PackageOpen, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export default async function PackagesPage() {
  await requirePagePermission("packages.read");

  const packages = await prisma.package.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { studentPackages: true, lessons: true } },
    },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Paketler"
        description={`${packages.length} paket`}
        actions={
          <Link href="/v2/admin/paketler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Paket
            </Button>
          </Link>
        }
      />
      {packages.length === 0 ? (
        <EmptyState tone="yellow" icon={PackageOpen} title="Henüz paket yok" />
      ) : (
        <div className="grid gap-od-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className="transition-all hover:shadow-od-md">
              <CardContent className="space-y-od-2 py-od-4">
                <div className="flex items-start justify-between gap-od-2">
                  <h3 className="text-od-h3 font-semibold text-od-ink">{p.name}</h3>
                  <Badge tone={p.isActive ? "mint" : "neutral"}>
                    {p.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <Badge tone="lavender">{p.type}</Badge>
                <div className="text-od-h2 font-bold text-od-accent">
                  {fmtTL(p.price)}
                </div>
                <div className="grid grid-cols-2 gap-od-2 text-od-small text-od-ink-2">
                  <div>
                    <div className="text-od-tiny text-od-mute">Ders sayısı</div>
                    <div className="font-medium">{p.lessonCount}</div>
                  </div>
                  <div>
                    <div className="text-od-tiny text-od-mute">Aktif öğrenci</div>
                    <div className="font-medium">{p._count.studentPackages}</div>
                  </div>
                </div>
                <div className="text-od-tiny text-od-mute">{p.subjects}</div>
                {p.description && (
                  <p className="text-od-small text-od-mute line-clamp-2">{p.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
