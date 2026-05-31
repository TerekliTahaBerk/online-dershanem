/**
 * Phase 2 / Session 11 — New payroll period form.
 */
import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { createPayrollPeriodAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function AdminNewPayrollPeriodPage() {
  await requirePanelRole("admin");
  // Default range: previous calendar month.
  const now = new Date();
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const titleDefault = firstPrevMonth
    .toLocaleDateString("tr-TR", { year: "numeric", month: "long" });

  function fmt(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <Link
          href="/panel/admin/ogretmen-hakedisleri"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Hakediş Hub
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Yeni Bordro Dönemi
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Dönem oluşturulduktan sonra <strong>Hakedişleri Üret</strong> butonu
          ile uygun dersler tarandığı esnada dakikadan tutar hesaplanır.
        </p>
      </header>

      <form
        action={createPayrollPeriodAction}
        className="grid max-w-2xl grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
      >
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Başlık *</span>
          <input
            name="title"
            required
            defaultValue={titleDefault}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Başlangıç *</span>
          <input
            type="date"
            name="startsAt"
            required
            defaultValue={fmt(firstPrevMonth)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Bitiş *</span>
          <input
            type="date"
            name="endsAt"
            required
            defaultValue={fmt(firstThisMonth)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Not</span>
          <textarea
            name="note"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Dönemi Oluştur
          </button>
        </div>
      </form>
    </div>
  );
}
