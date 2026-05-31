/**
 * Admin → Yeni Vade formu.
 * Server action ile gönderim. Dropdown'lar pre-loaded server'dan geliyor.
 * Stage 3H: migrated to v2 `od-finance-card` + `od-finance-form-grid`.
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
    <form action={createPaymentScheduleItemAction} className="od-finance-card">
      <div className="od-finance-form-grid">
        <label>
          <span>Başlık *</span>
          <input
            name="title"
            required
            placeholder="Ör. Mart 2026 taksiti"
          />
        </label>
        <label>
          <span>Tutar (₺) *</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="1500.00"
          />
        </label>
        <label>
          <span>Vade Tarihi *</span>
          <input type="date" name="dueDate" required />
        </label>
        <label>
          <span>Öğrenci</span>
          <select name="studentId" defaultValue="">
            <option value="">— Seçilmedi —</option>
            {options.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Veli</span>
          <select name="parentId" defaultValue="">
            <option value="">— Seçilmedi —</option>
            {options.parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Paket</span>
          <select name="packageId" defaultValue="">
            <option value="">— Seçilmedi —</option>
            {options.packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          <span>Ödeme Bağlantısı (opsiyonel)</span>
          <input name="paymentLink" placeholder="https://…" />
        </label>
        <label className="full">
          <span>Not</span>
          <textarea name="note" rows={2} placeholder="İç not (opsiyonel)" />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        <button type="submit" className="od-btn dark sm">
          Vade Oluştur
        </button>
        <p className="od-money-muted" style={{ fontSize: 11.5, margin: 0 }}>
          Veli ve öğrenci ikisi de seçilirse, eşleşme otomatik kontrol edilir.
        </p>
      </div>
    </form>
  );
}
