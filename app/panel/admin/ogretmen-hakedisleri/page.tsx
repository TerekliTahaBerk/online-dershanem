/**
 * Phase 2 / Session 11 — Admin Teacher Payroll Hub (dashboard).
 * Lists payroll periods, KPIs for selected period, per-teacher roll-up.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
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
      <div className="space-y-6">
        <PageHeader
          title="Öğretmen Hakedişleri"
          subtitle="Ders bazlı hakediş hesaplama, inceleme ve ödeme. Tutarlar muhasebeleştirilmedikçe gider olarak yansımaz."
          breadcrumbs={[
            { label: "Yönetim", href: "/panel/admin" },
            { label: "Öğretmen Hakedişleri" },
          ]}
          right={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/panel/admin/ogretmen-hakedisleri/kurallar"
                className="od-btn ghost sm"
              >
                Saatlik Ücret Kuralları
              </Link>
              <Link
                href="/panel/admin/ogretmen-hakedisleri/yeni"
                className="od-btn dark sm"
              >
                + Yeni Dönem
              </Link>
            </div>
          }
        />
        <div className="od-empty-soft">
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
    <div className="space-y-6">
      <PageHeader
        title="Öğretmen Hakedişleri"
        subtitle="Ders bazlı hakediş hesaplama, inceleme ve ödeme. Tutarlar muhasebeleştirilmedikçe gider olarak yansımaz."
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmen Hakedişleri" },
        ]}
        right={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/panel/admin/ogretmen-hakedisleri/kurallar"
              className="od-btn ghost sm"
            >
              Saatlik Ücret Kuralları
            </Link>
            <Link
              href="/panel/admin/ogretmen-hakedisleri/yeni"
              className="od-btn dark sm"
            >
              + Yeni Dönem
            </Link>
          </div>
        }
      />
      <p className="text-xs text-slate-500 -mt-2">
        Eski sayfa{" "}
        <Link href="/panel/admin/maaslar" className="underline hover:text-slate-900">
          Öğretmen Ödemeleri
        </Link>{" "}
        (manuel kayıtlar) korunmaktadır.
      </p>

      {/* Period switcher */}
      <div className="od-payroll-period-strip">
        <span className="od-payroll-period-strip-label">Dönem:</span>
        {periods.map((p) => (
          <Link
            key={p.id}
            href={`/panel/admin/ogretmen-hakedisleri?periodId=${p.id}`}
            className={`od-payroll-period-pill ${p.id === activePeriodId ? "is-active" : ""}`}
          >
            <span>{p.title}</span>
            <PayrollStatusBadge status={p.status} />
          </Link>
        ))}
      </div>

      <PayrollSummaryCards summary={period} />

      {/* Action bar */}
      <div className="od-payroll-period-card">
        {isMutable ? (
          <form
            action={generatePayrollPeriodItemsAction.bind(null, period.periodId)}
          >
            <button type="submit" className="od-btn dark sm">
              Hakedişleri Üret / Güncelle
            </button>
          </form>
        ) : null}
        {canLock ? (
          <form action={lockPayrollPeriodAction.bind(null, period.periodId)}>
            <button type="submit" className="od-btn ghost sm">
              Dönemi Kilitle
            </button>
          </form>
        ) : null}
        {canPay ? (
          <form action={markPayrollPeriodPaidAction.bind(null, period.periodId)}>
            <input type="hidden" name="writeAccounting" value="1" />
            <button type="submit" className="od-btn dark sm" style={{ background: "#2E6B4F", borderColor: "#2E6B4F" }}>
              Onaylı Satırları Ödendi İşaretle (Muhasebe)
            </button>
          </form>
        ) : null}
        <div className="spacer" />
        {canCancel ? (
          <form action={cancelPayrollPeriodAction.bind(null, period.periodId)}>
            <button type="submit" className="od-btn ghost sm" style={{ color: "var(--pd-bad, #B25758)" }}>
              Dönemi İptal Et
            </button>
          </form>
        ) : null}
        <Link
          href={`/panel/admin/ogretmen-hakedisleri/${period.periodId}`}
          className="od-btn ghost sm"
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
