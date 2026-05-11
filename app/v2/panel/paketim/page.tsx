import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Package, CheckCircle2, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";

export const dynamic = "force-dynamic";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

const STATUS_TONE: Record<string, "mint" | "blush" | "neutral"> = {
  ACTIVE: "mint",
  CANCELLED: "blush",
  EXPIRED: "neutral",
};

export default async function StudentPackagePage() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return notFound();

  const enrollments = await prisma.studentPackageEnrollment.findMany({
    where: { studentId: student.id },
    orderBy: { startsAt: "desc" },
    include: { package: true },
  });

  return (
    <div className="space-y-od-5">
      <PageHeader title="Paketim" description={`${enrollments.length} kayıt`} />
      {enrollments.length === 0 ? (
        <EmptyState tone="yellow" icon={Package} title="Henüz aktif paket yok" />
      ) : (
        <div className="grid gap-od-4 lg:grid-cols-2">
          {enrollments.map((e) => {
            const isActive = e.status === "ACTIVE";
            return (
              <Card key={e.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-od-2">
                    {isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-pastel-mint-ink" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-pastel-blush-ink" />
                    )}
                    {e.package.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-od-2">
                  <div className="flex items-center gap-od-2">
                    <Badge tone={STATUS_TONE[e.status] ?? "neutral"} size="sm">{e.status}</Badge>
                    <Badge tone="sky" size="sm">{e.package.type}</Badge>
                  </div>
                  {e.package.description && (
                    <p className="text-od-tiny text-od-mute">{e.package.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-od-2 pt-od-2 text-od-tiny">
                    <div>
                      <div className="text-od-mute">Başlangıç</div>
                      <div className="font-medium">
                        {format(e.startsAt, "dd MMM yyyy", { locale: tr })}
                      </div>
                    </div>
                    <div>
                      <div className="text-od-mute">Bitiş</div>
                      <div className="font-medium">
                        {e.endsAt ? format(e.endsAt, "dd MMM yyyy", { locale: tr }) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-od-mute">Ders Sayısı</div>
                      <div className="font-medium">{e.package.lessonCount}</div>
                    </div>
                    <div>
                      <div className="text-od-mute">Ücret</div>
                      <div className="font-medium">{fmtTL(e.listPrice ?? e.package.price)}</div>
                    </div>
                  </div>
                  {e.package.subjects && (
                    <div className="border-t border-od-border pt-od-2 text-od-tiny text-od-mute">
                      Konular: {e.package.subjects}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
