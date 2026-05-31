/**
 * Phase 2 / Session 10 — Veli: Vadeli Ödemeler
 * Veli yalnızca kendisi ile bağlantılı çocukların finans kayıtlarını görür.
 * Mutasyon yapmaz; mark-paid yalnızca admin tarafından gerçekleştirilir.
 */
import { requireParent } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { NoChildEmpty } from "@/components/panel/parent/no-child-empty";
import {
  getParentFinanceContext,
  getParentFinanceSummary,
  getParentUpcomingDues,
  getParentOverdueDues,
  getParentPaidItems,
} from "@/lib/panel/parent-finance";
import { ParentFinanceSummaryCards } from "@/components/panel/parent/finance/parent-finance-summary";
import { ParentDueList } from "@/components/panel/parent/finance/parent-due-list";
import { ParentPaidHistory } from "@/components/panel/parent/finance/parent-paid-history";

export const dynamic = "force-dynamic";

export default async function ParentPayments({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { parent } = await requireParent();
  if (!parent) {
    return (
      <Card>
        <EmptyState icon="users" title="Veli profili yok" />
      </Card>
    );
  }

  const sp = await searchParams;
  const ctx = await getParentFinanceContext(parent.id, sp.studentId ?? null);

  if (ctx.childIds.length === 0) return <NoChildEmpty pageTitle="Ödemeler" />;

  const [summary, upcoming, overdue, paid] = await Promise.all([
    getParentFinanceSummary(ctx),
    getParentUpcomingDues(ctx, { take: 50 }),
    getParentOverdueDues(ctx, { take: 50 }),
    getParentPaidItems(ctx, { take: 50 }),
  ]);

  let subtitle = `${ctx.childOptions.length} öğrenci`;
  if (ctx.selectedChildId) {
    const sel = ctx.childOptions.find((c) => c.id === ctx.selectedChildId);
    if (sel) subtitle = sel.fullName;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ödemeler" subtitle={subtitle} />

      {ctx.childOptions.length > 1 ? (
        <form
          method="GET"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3"
        >
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Öğrenci</span>
            <select
              name="studentId"
              defaultValue={ctx.selectedChildId ?? ""}
              className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Tümü</option>
              {ctx.childOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Filtrele
          </button>
        </form>
      ) : null}

      <ParentFinanceSummaryCards summary={summary} />

      {summary.hasTrackedItems ? (
        <>
          <ParentDueList
            title="Geciken Ödemeler"
            rows={overdue}
            emptyText="Geciken ödeme yok."
            highlight
          />
          <ParentDueList
            title="Yaklaşan Ödemeler"
            rows={upcoming}
            emptyText="Bekleyen ödeme yok."
          />
          <ParentPaidHistory rows={paid} />
        </>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <strong>Not:</strong> Ödeme durum güncellemeleri yalnızca yönetim
        tarafından, banka/transfer onayı sonrası yapılır.
      </div>
    </div>
  );
}
