/**
 * Phase 2 / Session 14 — Admin finance reports / cashflow cockpit.
 *
 * Read-only aggregation page. All write actions stay on the existing finance
 * routes (`/panel/admin/odemeler`, `/panel/admin/ogretmen-hakedisleri`,
 * `/panel/admin/muhasebe`).
 */
import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { getAdminFinanceDashboard } from "@/lib/panel/admin-finance-reports";
import { FinanceSummaryCards } from "@/components/panel/admin/finance/finance-summary-cards";
import { FinanceCashflowSeries } from "@/components/panel/admin/finance/finance-cashflow-series";
import { FinanceReceivablesTable } from "@/components/panel/admin/finance/finance-receivables-table";
import { FinancePayrollObligations } from "@/components/panel/admin/finance/finance-payroll-obligations";
import { FinanceActivityList } from "@/components/panel/admin/finance/finance-activity-list";
import { FinanceRangeFilter } from "@/components/panel/admin/finance/finance-range-filter";

export const dynamic = "force-dynamic";

const BASE_PATH = "/panel/admin/finans/raporlar";

export default async function AdminFinanceReports({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  // Yetki: SADECE admin (öğretmen / öğrenci / veli erişemez).
  await requirePanelRole("admin");

  const sp = await searchParams;
  const dashboard = await getAdminFinanceDashboard(sp.range ?? null);

  return (
    <div className="od-page">
      <PageHeader
        title="Finans Raporları"
        subtitle="Beklenen tahsilat, gerçekleşen gelir, hakediş yükümlülüğü ve net nakit akışı."
        breadcrumbs={[
          { label: "Panel", href: "/panel" },
          { label: "Admin", href: "/panel/admin" },
          { label: "Finans Raporları" },
        ]}
        secondary={<FinanceRangeFilter basePath={BASE_PATH} current={dashboard.range.preset} />}
        right={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/panel/admin/odemeler"
              className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Vadeli ödemeler
            </Link>
            <Link
              href="/panel/admin/ogretmen-hakedisleri"
              className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Öğretmen hakedişleri
            </Link>
            <Link
              href="/panel/admin/muhasebe?service=OD"
              className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Muhasebe kayıtları
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Disclaimer / data-source notes (subtle) */}
        <aside className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-600">
          <p>
            <strong className="font-semibold text-slate-700">Beklenen tahsilat</strong>{" "}
            vadeli ödeme kayıtlarından (PaymentScheduleItem),{" "}
            <strong className="font-semibold text-slate-700">gerçekleşen gelir</strong>{" "}
            muhasebe kayıtlarından (AccountingEntry) hesaplanır. Çifte sayımı
            önlemek için iki tutar ayrı gösterilir, toplam alınmaz.
          </p>
          <p className="mt-1">
            Bu ekran bir vergi/mali müşavirlik raporu değildir; idari
            görünürlük amacıyla hazırlanmıştır.
          </p>
        </aside>

        {/* KPI cards */}
        <FinanceSummaryCards
          accounting={dashboard.accounting}
          receivables={dashboard.receivables}
          payroll={dashboard.payroll}
        />

        {/* Cashflow + Activity in 2-column grid on lg */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FinanceCashflowSeries points={dashboard.cashflowMonthly} />
          <FinanceActivityList rows={dashboard.recentActivity} />
        </div>

        {/* Receivables — overdue + upcoming */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <FinanceReceivablesTable
            title="Geciken tahsilat"
            rows={dashboard.overdueReceivables}
            emptyLabel="Vadesi geçmiş ödeme yok."
            variant="overdue"
          />
          <FinanceReceivablesTable
            title="Yaklaşan tahsilat"
            rows={dashboard.upcomingReceivables}
            emptyLabel="Yaklaşan vadeli ödeme yok."
            variant="upcoming"
          />
        </div>

        {/* Payroll obligations */}
        <FinancePayrollObligations
          summary={dashboard.payroll}
          rows={dashboard.payrollObligations}
        />

        {/* Range echo (debugging-friendly footer) */}
        <p className="text-right text-[10px] text-slate-400">
          Aralık: {dashboard.range.label} ·{" "}
          {dashboard.range.startsAt.toLocaleDateString("tr-TR")} →{" "}
          {dashboard.range.endsAt.toLocaleDateString("tr-TR")}
        </p>
      </div>
    </div>
  );
}
