import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { ExportButton } from "@/components/od/data/export-button";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export default async function AccountingPage() {
  await requirePagePermission("accounting.read");

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [entries, income30, expense30, allTimeIncome, allTimeExpense] = await Promise.all([
    prisma.accountingEntry.findMany({
      orderBy: { occurredAt: "desc" },
      take: 150,
      include: {
        student: { select: { id: true, fullName: true } },
        teacher: { select: { id: true, fullName: true } },
        package: { select: { id: true, name: true } },
      },
    }),
    prisma.accountingEntry.aggregate({
      where: { type: "INCOME", occurredAt: { gte: since30 } },
      _sum: { amount: true },
    }),
    prisma.accountingEntry.aggregate({
      where: { type: "EXPENSE", occurredAt: { gte: since30 } },
      _sum: { amount: true },
    }),
    prisma.accountingEntry.aggregate({
      where: { type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.accountingEntry.aggregate({
      where: { type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const net30 = (income30._sum.amount ?? 0) - (expense30._sum.amount ?? 0);
  const netAll = (allTimeIncome._sum.amount ?? 0) - (allTimeExpense._sum.amount ?? 0);

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Muhasebe"
        description="Tüm gelir ve gider kayıtları"
        actions={
          <ExportButton
            endpoint="/api/v1/export/accounting"
            forwardParams={false}
          />
        }
      />

      <div className="grid gap-od-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          tone="mint"
          label="30 gün gelir"
          value={fmtTL(income30._sum.amount ?? 0)}
        />
        <KpiCard
          tone="blush"
          label="30 gün gider"
          value={fmtTL(expense30._sum.amount ?? 0)}
        />
        <KpiCard
          tone={net30 >= 0 ? "sky" : "blush"}
          label="30 gün net"
          value={fmtTL(net30)}
        />
        <KpiCard
          tone={netAll >= 0 ? "lavender" : "blush"}
          label="Tüm zaman net"
          value={fmtTL(netAll)}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState tone="lavender" icon={Wallet} title="Muhasebe kaydı yok" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-od-small">
              <thead className="border-b border-od-border bg-od-subtle text-left text-od-tiny uppercase text-od-mute">
                <tr>
                  <th className="px-od-4 py-od-2">Tarih</th>
                  <th className="px-od-4 py-od-2">Tip</th>
                  <th className="px-od-4 py-od-2">Kategori</th>
                  <th className="px-od-4 py-od-2">İlgili</th>
                  <th className="px-od-4 py-od-2">Açıklama</th>
                  <th className="px-od-4 py-od-2 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-od-border/60 hover:bg-od-subtle">
                    <td className="px-od-4 py-od-2 text-od-mute">
                      {format(new Date(e.occurredAt), "dd MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-od-4 py-od-2">
                      {e.type === "INCOME" ? (
                        <Badge tone="mint">
                          <TrendingUp className="mr-1 inline h-3 w-3" /> Gelir
                        </Badge>
                      ) : (
                        <Badge tone="blush">
                          <TrendingDown className="mr-1 inline h-3 w-3" /> Gider
                        </Badge>
                      )}
                    </td>
                    <td className="px-od-4 py-od-2">
                      <Badge tone="sky">{e.category}</Badge>
                    </td>
                    <td className="px-od-4 py-od-2 text-od-ink-2">
                      {e.student?.fullName ?? e.teacher?.fullName ?? e.package?.name ?? "—"}
                    </td>
                    <td className="px-od-4 py-od-2 text-od-mute">{e.description ?? "—"}</td>
                    <td
                      className={`px-od-4 py-od-2 text-right font-mono font-semibold ${
                        e.type === "INCOME" ? "text-pastel-mint-ink" : "text-pastel-blush-ink"
                      }`}
                    >
                      {e.type === "INCOME" ? "+" : "−"} {fmtTL(e.amount)}
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
