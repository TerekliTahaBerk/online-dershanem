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
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/panel/admin/ogretmen-hakedisleri"
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            ← Hakediş Hub
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Bu dönemdeki tüm satırlar. PAID/EXCLUDED satırlar değiştirilemez.
          </p>
        </div>
      </header>

      <PayrollSummaryCards summary={summary} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="uppercase tracking-wide text-slate-500">Durum:</span>
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
              className={`rounded-full border px-2.5 py-0.5 ${
                active
                  ? "border-sky-300 bg-sky-50 text-sky-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
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
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-slate-600 hover:bg-slate-50"
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
