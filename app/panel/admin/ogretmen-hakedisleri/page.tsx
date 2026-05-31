/**
 * Phase 2 / Session 11 — Admin Teacher Payroll Hub (dashboard).
 * Lists payroll periods, KPIs for selected period, per-teacher roll-up.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import {
  getAdminPayrollDashboard,
  formatPayrollMoney,
} from "@/lib/panel/teacher-payroll";
import { PayrollSummaryCards } from "@/components/panel/admin/finance/payroll-summary-cards";
import { PayrollTeacherTable } from "@/components/panel/admin/finance/payroll-teacher-table";
import { PayrollStatusBadge } from "@/components/panel/finance/payroll-status-badge";
import {
  generatePayrollPeriodItemsAction,
  lockPayrollPeriodAction,
  markPayrollPeriodPaidAction,
  cancelPayrollPeriodAction,
} from "./_actions";

export const dynamic = "force-dynamic";

type Search = Promise<{ periodId?: string }>;

export default async function AdminPayrollHubPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;

  const periods = await prisma.teacherPayrollPeriod.findMany({
    orderBy: { startsAt: "desc" },
    take: 24,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
  });

  const activePeriodId = sp.periodId ?? periods[0]?.id ?? null;

  if (!activePeriodId) {
    return (
      <div className="space-y-6 p-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Öğretmen Hakedişleri
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Ders bazlı hakediş hesaplama, inceleme ve ödeme. Tutarlar
              muhasebeleştirilmedikçe gider olarak yansımaz.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/panel/admin/ogretmen-hakedisleri/kurallar"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Saatlik Ücret Kuralları
            </Link>
            <Link
              href="/panel/admin/ogretmen-hakedisleri/yeni"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              + Yeni Dönem
            </Link>
          </div>
        </header>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600">
          Henüz tanımlanmış bir bordro dönemi yok. Üstten <strong>Yeni Dönem</strong> ile başlayabilirsiniz.
        </div>
      </div>
    );
  }

  const { period, teachers } = await getAdminPayrollDashboard(activePeriodId);
  if (!period) redirect("/panel/admin/ogretmen-hakedisleri");

  const isMutable = period.status === "DRAFT" || period.status === "REVIEWED";
  const canLock = period.status !== "PAID" && period.status !== "CANCELLED";
  const canPay =
    period.status !== "PAID" && period.status !== "CANCELLED";
  const canCancel = period.status !== "PAID";

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Öğretmen Hakedişleri
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ders bazlı hakediş hesaplama, inceleme ve ödeme. Eski sayfa{" "}
            <Link
              href="/panel/admin/maaslar"
              className="underline hover:text-slate-900"
            >
              Öğretmen Ödemeleri
            </Link>{" "}
            (manuel kayıtlar) korunmaktadır.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/panel/admin/ogretmen-hakedisleri/kurallar"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Saatlik Ücret Kuralları
          </Link>
          <Link
            href="/panel/admin/ogretmen-hakedisleri/yeni"
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            + Yeni Dönem
          </Link>
        </div>
      </header>

      {/* Period switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">
          Dönem:
        </span>
        {periods.map((p) => (
          <Link
            key={p.id}
            href={`/panel/admin/ogretmen-hakedisleri?periodId=${p.id}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              p.id === activePeriodId
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{p.title}</span>
            <PayrollStatusBadge status={p.status} />
          </Link>
        ))}
      </div>

      <PayrollSummaryCards summary={period} />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {isMutable ? (
          <form
            action={generatePayrollPeriodItemsAction.bind(null, period.periodId)}
          >
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Hakedişleri Üret / Güncelle
            </button>
          </form>
        ) : null}
        {canLock ? (
          <form action={lockPayrollPeriodAction.bind(null, period.periodId)}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Dönemi Kilitle
            </button>
          </form>
        ) : null}
        {canPay ? (
          <form action={markPayrollPeriodPaidAction.bind(null, period.periodId)}>
            <input type="hidden" name="writeAccounting" value="1" />
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Onaylı Satırları Ödendi İşaretle (Muhasebe)
            </button>
          </form>
        ) : null}
        {canCancel ? (
          <form
            action={cancelPayrollPeriodAction.bind(null, period.periodId)}
            className="ml-auto"
          >
            <button
              type="submit"
              className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              Dönemi İptal Et
            </button>
          </form>
        ) : null}
        <Link
          href={`/panel/admin/ogretmen-hakedisleri/${period.periodId}`}
          className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Tüm Satırlar →
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Öğretmen Bazında ({teachers.length}) ·{" "}
          <span className="text-slate-500">
            Toplam tahmini {formatPayrollMoney(period.totals.estimatedKurus)}
          </span>
        </h2>
        <PayrollTeacherTable rows={teachers} periodId={period.periodId} />
      </section>
    </div>
  );
}
