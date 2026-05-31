/**
 * Phase 2 / Session 11 — Admin Teacher Payroll: period detail.
 * Per-item review table with optional teacher filter.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPayrollPeriodSummary,
  getTeacherPayrollItems,
} from "@/lib/panel/teacher-payroll";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { PayrollSummaryCards } from "@/components/panel/admin/finance/payroll-summary-cards";
import { PayrollItemReviewTable } from "@/components/panel/admin/finance/payroll-item-review-table";

export const dynamic = "force-dynamic";

type Params = Promise<{ periodId: string }>;
type Search = Promise<{ teacherId?: string; status?: string }>;

export default async function AdminPayrollPeriodDetail({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  await requirePanelRole("admin");
  const { periodId } = await params;
  const sp = await searchParams;

  const summary = await getPayrollPeriodSummary(periodId);
  if (!summary) notFound();

  const teacherFilter = sp.teacherId || undefined;
  let items = await getTeacherPayrollItems(periodId, teacherFilter);
  if (sp.status) {
    items = items.filter((i) => i.status === sp.status);
  }

  const locked =
    summary.status === "LOCKED" ||
    summary.status === "PAID" ||
    summary.status === "CANCELLED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={summary.title}
        subtitle="Bu dönemdeki tüm satırlar. PAID/EXCLUDED satırlar değiştirilemez."
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmen Hakedişleri", href: "/panel/admin/ogretmen-hakedisleri" },
          { label: summary.title },
        ]}
        right={
          <Link
            href="/panel/admin/ogretmen-hakedisleri"
            className="od-btn ghost sm"
          >
            ← Hakediş Hub
          </Link>
        }
      />

      <PayrollSummaryCards summary={summary} />

      {/* Filters */}
      <div className="od-payroll-period-strip">
        <span className="od-payroll-period-strip-label">Durum:</span>
        {[
          { id: "", label: "Tümü" },
          { id: "DRAFT", label: "Taslak" },
          { id: "REVIEWED", label: "İncelendi" },
          { id: "APPROVED", label: "Onaylı" },
          { id: "PAID", label: "Ödendi" },
          { id: "EXCLUDED", label: "Hariç" },
        ].map((f) => {
          const params = new URLSearchParams();
          if (f.id) params.set("status", f.id);
          if (sp.teacherId) params.set("teacherId", sp.teacherId);
          const href = `?${params.toString()}`;
          const active = (sp.status ?? "") === f.id;
          return (
            <Link
              key={f.id || "all"}
              href={href}
              className={`od-payroll-period-pill ${active ? "is-active" : ""}`}
            >
              {f.label}
            </Link>
          );
        })}
        {sp.teacherId ? (
          <Link
            href={`/panel/admin/ogretmen-hakedisleri/${periodId}${
              sp.status ? `?status=${sp.status}` : ""
            }`}
            className="od-payroll-period-pill"
          >
            Öğretmen filtresini kaldır ✕
          </Link>
        ) : null}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Satırlar ({items.length})
        </h2>
        <PayrollItemReviewTable rows={items} locked={locked} />
      </section>
    </div>
  );
}
