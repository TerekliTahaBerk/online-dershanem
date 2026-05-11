import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { PackageOpen, Pencil, Users, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("packages.read");
  const { id } = await params;

  const p = await prisma.package.findUnique({
    where: { id },
    include: {
      _count: { select: { studentPackages: true, lessons: true, enrollments: true } },
    },
  });
  if (!p) return notFound();

  const studentPackages = await prisma.studentPackage.findMany({
    where: { packageId: id, revokedAt: null },
    orderBy: { assignedAt: "desc" },
    take: 50,
    include: { student: { select: { id: true, fullName: true, status: true } } },
  });

  const recentLessons = await prisma.lesson.findMany({
    where: { packageId: id },
    orderBy: { scheduledAt: "desc" },
    take: 10,
    include: { student: { select: { fullName: true } }, teacher: { select: { fullName: true } } },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={p.name}
        description={`${p.type} · ${p.subjects}`}
        actions={
          <Link href={`/v2/admin/paketler/${p.id}/duzenle`}>
            <Button variant="primary" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Düzenle
            </Button>
          </Link>
        }
      />

      <div className="grid gap-od-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Fiyat</div>
            <div className="text-od-h3 font-semibold text-pastel-mint-ink">{fmtTL(p.price)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Ders Sayısı</div>
            <div className="text-od-h3 font-semibold">{p.lessonCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Aktif Atama</div>
            <div className="text-od-h3 font-semibold">{p._count.studentPackages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-od-3">
            <div className="text-od-tiny text-od-mute">Ders Toplam</div>
            <div className="text-od-h3 font-semibold">{p._count.lessons}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-od-2">
        <Badge tone={p.isActive ? "mint" : "blush"}>{p.isActive ? "Aktif" : "Pasif"}</Badge>
        <Badge tone="sky">{p.type}</Badge>
        {p.paytrLink && (
          <a href={p.paytrLink} target="_blank" rel="noopener" className="text-od-tiny text-pastel-sky-ink underline">
            PayTR Link
          </a>
        )}
      </div>

      {p.description && (
        <Card>
          <CardHeader>
            <CardTitle>Açıklama</CardTitle>
          </CardHeader>
          <CardContent className="text-od-body whitespace-pre-line">{p.description}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <Users className="h-4 w-4 text-pastel-sky-ink" /> Öğrenciler ({studentPackages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border">
          {studentPackages.length === 0 && <p className="text-od-tiny text-od-mute">Atanmış öğrenci yok.</p>}
          {studentPackages.map((sp) => (
            <Link
              key={`${sp.studentId}-${sp.packageId}`}
              href={`/v2/admin/ogrenciler/${sp.student.id}`}
              className="flex items-center justify-between py-od-2 hover:bg-od-surface-soft"
            >
              <div>
                <div className="font-medium text-od-body">{sp.student.fullName}</div>
                <div className="text-od-tiny text-od-mute">
                  {format(sp.assignedAt, "dd MMM yyyy", { locale: tr })}
                </div>
              </div>
              <Badge tone={sp.student.status === "ACTIVE" ? "mint" : "blush"}>{sp.student.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-od-2">
            <BookOpen className="h-4 w-4 text-pastel-peach-ink" /> Son Dersler
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-od-border">
          {recentLessons.length === 0 && <p className="text-od-tiny text-od-mute">Kayıt yok.</p>}
          {recentLessons.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-od-2 text-od-body">
              <div>
                <div className="font-medium">{l.title ?? l.subject ?? "—"}</div>
                <div className="text-od-tiny text-od-mute">
                  {l.student.fullName} · {l.teacher.fullName}
                </div>
              </div>
              <div className="text-od-tiny text-od-mute">
                {format(l.scheduledAt, "dd MMM yyyy HH:mm", { locale: tr })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
