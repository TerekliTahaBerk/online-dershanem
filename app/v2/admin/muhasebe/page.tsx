import { prisma } from "@/lib/prisma";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { AdminAccountingTable, type AccountingRow } from "@/components/od/domain/admin/admin-accounting-table";

export const dynamic = "force-dynamic";

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export default async function AccountingPage() {
  await requirePagePermission("accounting.read");
  const session = await getServerAuthSession();
  const currentUserId = session?.user?.id;

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [entries, income30, expense30, allTimeIncome, allTimeExpense, savedViews] =
    await Promise.all([
      prisma.accountingEntry.findMany({
        orderBy: { occurredAt: "desc" },
        take: 500,
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
      loadSavedViews("accounting", currentUserId),
    ]);

  const net30 = (income30._sum.amount ?? 0) - (expense30._sum.amount ?? 0);
  const netAll = (allTimeIncome._sum.amount ?? 0) - (allTimeExpense._sum.amount ?? 0);

  const rows: AccountingRow[] = entries.map((e) => ({
    id: e.id,
    occurredAt: e.occurredAt.toISOString(),
    type: e.type as "INCOME" | "EXPENSE",
    category: e.category,
    related: e.student?.fullName ?? e.teacher?.fullName ?? e.package?.name ?? "",
    description: e.description,
    amount: e.amount,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader title="Muhasebe" description="Tüm gelir ve gider kayıtları" />

      <div className="grid gap-od-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard tone="mint" label="30 gün gelir" value={fmtTL(income30._sum.amount ?? 0)} />
        <KpiCard tone="blush" label="30 gün gider" value={fmtTL(expense30._sum.amount ?? 0)} />
        <KpiCard tone={net30 >= 0 ? "sky" : "blush"} label="30 gün net" value={fmtTL(net30)} />
        <KpiCard tone={netAll >= 0 ? "lavender" : "blush"} label="Tüm zaman net" value={fmtTL(netAll)} />
      </div>

      {rows.length === 0 ? (
        <EmptyState tone="lavender" icon={Wallet} title="Muhasebe kaydı yok" />
      ) : (
        <Card>
          <CardContent className="py-od-3">
            <AdminAccountingTable
              data={rows}
              savedViews={savedViews}
              currentUserId={currentUserId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
