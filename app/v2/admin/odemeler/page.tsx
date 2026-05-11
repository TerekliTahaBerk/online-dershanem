import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { requirePagePermission } from "@/lib/rbac/define-action";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export default async function PaymentsPage() {
  await requirePagePermission("payments.read");

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [recent, totalIncome30, count30, todayCount] = await Promise.all([
    prisma.accountingEntry.findMany({
      where: { type: "INCOME" },
      orderBy: { occurredAt: "desc" },
      take: 100,
      include: {
        student: { select: { id: true, fullName: true } },
        package: { select: { id: true, name: true } },
      },
    }),
    prisma.accountingEntry.aggregate({
      where: { type: "INCOME", occurredAt: { gte: since30 } },
      _sum: { amount: true },
    }),
    prisma.accountingEntry.count({
      where: { type: "INCOME", occurredAt: { gte: since30 } },
    }),
    prisma.accountingEntry.count({
      where: {
        type: "INCOME",
        occurredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return (
    <div className="space-y-od-5">
      <PageHeader title="Ödemeler" description="Gelir kayıtları (son 100)" />

      <div className="grid gap-od-3 sm:grid-cols-3">
        <KpiCard
          tone="mint"
          label="Son 30 gün gelir"
          value={fmtTL(totalIncome30._sum.amount ?? 0)}
        />
        <KpiCard tone="sky" label="30 günlük işlem" value={count30} />
        <KpiCard tone="yellow" label="Bugünkü ödemeler" value={todayCount} />
      </div>

      {recent.length === 0 ? (
        <EmptyState tone="yellow" icon={Receipt} title="Henüz ödeme yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Öğrenci</th>
                  <th className="px-od-4 py-od-2">Paket</th>
                  <th className="px-od-4 py-od-2">Kategori</th>
                  <th className="px-od-4 py-od-2">Açıklama</th>
                  <th className="px-od-4 py-od-2 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2 text-od-mute">
                      {format(new Date(e.occurredAt), "dd MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-ink-2">
                      {e.student?.fullName ?? "—"}
                    </td>
                    <td className="px-od-4 py-od-2">
                      {e.package ? <Badge tone="lavender">{e.package.name}</Badge> : "—"}
                    </td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone="sky">{e.category}</Badge>
                    </td>
                    <td className="px-od-4 py-od-2 text-od-mute">{e.description ?? "—"}</td>
                    <td className="px-od-4 py-od-2 text-right font-mono font-semibold text-pastel-mint-ink">
                      {fmtTL(e.amount)}
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
