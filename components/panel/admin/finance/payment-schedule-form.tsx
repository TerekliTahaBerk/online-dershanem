/**
 * Admin → Yeni Vade formu.
 * Server action ile gönderim. Dropdown'lar pre-loaded server'dan geliyor.
 */
import { createPaymentScheduleItemAction } from "@/app/panel/admin/odemeler/_actions";

export type PaymentScheduleFormOptions = {
  students: Array<{ id: string; fullName: string; parentIds: string[] }>;
  parents: Array<{ id: string; fullName: string }>;
  packages: Array<{ id: string; name: string }>;
};

export function PaymentScheduleForm({
  options,
}: {
  options: PaymentScheduleFormOptions;
}) {
  return (
    <form
      action={createPaymentScheduleItemAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Başlık *</span>
          <input
            name="title"
            required
            placeholder="Ör. Mart 2026 taksiti"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Tutar (₺) *</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="1500.00"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Vade Tarihi *</span>
          <input
            type="date"
            name="dueDate"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Öğrenci</span>
          <select
            name="studentId"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">— Seçilmedi —</option>
            {options.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Veli</span>
          <select
            name="parentId"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">— Seçilmedi —</option>
            {options.parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Paket</span>
          <select
            name="packageId"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">— Seçilmedi —</option>
            {options.packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">
            Ödeme Bağlantısı (opsiyonel)
          </span>
          <input
            name="paymentLink"
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Not</span>
          <textarea
            name="note"
            rows={2}
            placeholder="İç not (opsiyonel)"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Vade Oluştur
        </button>
        <p className="text-xs text-slate-500">
          Veli ve öğrenci ikisi de seçilirse, eşleşme otomatik kontrol edilir.
        </p>
      </div>
    </form>
  );
}
