import { redirect, notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getParentWithChildren } from "@/lib/parent-context";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { PageHeader } from "@/components/od/page-header";
import { KpiCard } from "@/components/od/charts/kpi-card";
import { EmptyState } from "@/components/od/feedback/empty-state";
import {
  ParentPaymentsTable,
  type ParentPaymentRow,
} from "@/components/od/domain/parent/parent-payments-table";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export default async function ParentPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  const ctx = await getParentWithChildren(session.user.id);
  if (!ctx) return notFound();

  const sp = await searchParams;
  const kindFilter = new Set(asArray(sp.kind).filter((k) => k === "INTENT" || k === "INCOME"));
  const statusFilter = new Set(asArray(sp.status));
  const childFilter = asArray(sp.childId).filter((id) => ctx.childIds.includes(id));
  const targetIds = childFilter.length ? childFilter : ctx.childIds;

  const includeIntent = kindFilter.size === 0 || kindFilter.has("INTENT");
  const includeIncome = kindFilter.size === 0 || kindFilter.has("INCOME");

  const [intents, accounting] = await Promise.all([
    includeIntent
      ? prisma.purchaseIntent.findMany({
          where: { studentId: { in: targetIds } },
          orderBy: { submittedAt: "desc" },
          take: 200,
          include: { student: { select: { id: true, fullName: true } } },
        })
      : Promise.resolve([] as any[]),
    includeIncome
      ? prisma.accountingEntry.findMany({
          where: { studentId: { in: targetIds }, type: "INCOME" },
          orderBy: { occurredAt: "desc" },
          take: 200,
          include: {
            student: { select: { id: true, fullName: true } },
            package: { select: { name: true } },
          },
        })
      : Promise.resolve([] as any[]),
  ]);

  const allRows: ParentPaymentRow[] = [
    ...intents.map((i: any) => ({
      id: "intent-" + i.id,
      occurredAt: i.submittedAt.toISOString(),
      childId: i.student?.id ?? null,
      childName: i.student?.fullName ?? i.studentFullName ?? "—",
      description: i.packageName,
      amount: 0,
      kind: "INTENT" as const,
      status: i.status,
      paymentLink: i.paymentLink,
    })),
    ...accounting.map((a: any) => ({
      id: "income-" + a.id,
      occurredAt: a.occurredAt.toISOString(),
      childId: a.student?.id ?? null,
      childName: a.student?.fullName ?? "—",
      description: a.package?.name ?? a.description ?? "—",
      amount: a.amount,
      kind: "INCOME" as const,
      status: "PAID",
      paymentLink: null,
    })),
  ]
    .filter((r) => statusFilter.size === 0 || statusFilter.has(r.status))
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));

  const totalPaid = accounting.reduce((acc: number, a: any) => acc + a.amount, 0);
  const pendingCount = intents.filter((i: any) => i.status === "PENDING").length;

  if (allRows.length === 0 && kindFilter.size === 0 && statusFilter.size === 0 && childFilter.length === 0) {
    return (
      <div className="space-y-od-5">
        <PageHeader title="Ödemeler" description="Henüz ödeme/sipariş yok" />
        <EmptyState
          tone="yellow"
          icon={Wallet}
          title="Henüz kayıt yok"
          description="Sipariş ve tahsilatlar burada listelenir."
        />
      </div>
    );
  }

  const childOptions = ctx.parent.students.map((ps) => ({
    id: ps.studentId,
    name: ps.student.fullName,
  }));

  const savedViews = await loadSavedViews("parent.payments", session.user.id);

  return (
    <div className="space-y-od-5">
      <PageHeader title="Ödemeler" description="Sipariş ve tahsilat geçmişi" />

      <div className="grid gap-od-3 md:grid-cols-3">
        <KpiCard tone="mint" label="Toplam Ödenen" value={fmtTL(totalPaid)} />
        <KpiCard tone="yellow" label="Bekleyen Sipariş" value={pendingCount} />
        <KpiCard tone="sky" label="Toplam Sipariş" value={intents.length} />
      </div>

      <ParentPaymentsTable
        data={allRows}
        children={childOptions}
        savedViews={savedViews}
        currentUserId={session.user.id}
      />
    </div>
  );
}
