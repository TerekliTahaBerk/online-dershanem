import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";

type Defaults = {
  teacherId?: string;
  periodStart?: Date | string;
  periodEnd?: Date | string;
  amount?: number; // cents
  status?: "DUE" | "PAID" | "CANCELLED";
  notes?: string | null;
};

function toDateInput(v?: Date | string): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function PayrollForm({
  action,
  teachers,
  defaults = {},
  submitLabel = "Kaydet",
  lockTeacher = false,
}: {
  action: (fd: FormData) => Promise<void>;
  teachers: { id: string; fullName: string }[];
  defaults?: Defaults;
  submitLabel?: string;
  lockTeacher?: boolean;
}) {
  return (
    <form action={action} className="od-grid g-2" style={{ gap: 12 }}>
      <Field label="Öğretmen *">
        {lockTeacher && defaults.teacherId ? (
          <>
            <input type="hidden" name="teacherId" value={defaults.teacherId} />
            <Input
              value={teachers.find((t) => t.id === defaults.teacherId)?.fullName || "—"}
              disabled
              readOnly
            />
          </>
        ) : (
          <Select name="teacherId" defaultValue={defaults.teacherId || ""} required>
            <option value="">Seçiniz…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Durum">
        <Select name="status" defaultValue={defaults.status || "DUE"}>
          <option value="DUE">Bekleyen</option>
          <option value="PAID">Ödendi</option>
          <option value="CANCELLED">İptal</option>
        </Select>
      </Field>

      <Field label="Dönem başlangıcı *">
        <Input type="date" name="periodStart" required defaultValue={toDateInput(defaults.periodStart)} />
      </Field>
      <Field label="Dönem bitişi *">
        <Input type="date" name="periodEnd" required defaultValue={toDateInput(defaults.periodEnd)} />
      </Field>

      <Field label="Tutar (₺) *" hint="Brüt — kuruşa otomatik çevrilir">
        <Input
          name="amount"
          type="number"
          step="0.01"
          min={0}
          required
          defaultValue={defaults.amount != null ? (defaults.amount / 100).toFixed(2) : ""}
        />
      </Field>
      <div />

      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Not">
          <Textarea name="notes" rows={2} defaultValue={defaults.notes || ""} />
        </Field>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <FormActions>
          <button type="submit" className="od-btn od-btn-primary">{submitLabel}</button>
        </FormActions>
      </div>
    </form>
  );
}
