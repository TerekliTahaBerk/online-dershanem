import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { ToastForm } from "@/components/ui/toast-form";

type CouponFormDefaults = {
  code?: string;
  type?: "PERCENT" | "FIXED";
  service?: "OD" | "ODK" | "ALL";
  value?: number;
  minOrderCents?: number | null;
  maxDiscountCents?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  description?: string | null;
  isActive?: boolean;
};

function toDateInput(d?: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 16);
}

export function CouponForm({
  action,
  defaults = {},
  submitLabel = "Kaydet",
}: {
  action: (fd: FormData) => Promise<void>;
  defaults?: CouponFormDefaults;
  submitLabel?: string;
}) {
  const d = defaults;
  return (
    <ToastForm action={action} className="od-grid g-2" style={{ gap: 12 }} successMessage="Kupon kaydedildi">
      <Field label="Kod *" hint="Otomatik büyük harfe çevrilir (örn: HOSGELDIN20)">
        <Input name="code" required defaultValue={d.code || ""} maxLength={60} style={{ textTransform: "uppercase" }} />
      </Field>
      <Field label="Tür *">
        <Select name="type" defaultValue={d.type || "PERCENT"}>
          <option value="PERCENT">Yüzde (%)</option>
          <option value="FIXED">Sabit (₺)</option>
        </Select>
      </Field>

      <Field label="Servis *">
        <Select name="service" defaultValue={d.service || "ALL"}>
          <option value="ALL">Tüm Servisler</option>
          <option value="OD">Sadece OD (Dershane)</option>
          <option value="ODK">Sadece ODK (Deneme Kulübü)</option>
        </Select>
      </Field>
      <Field label="Değer *" hint="Yüzde için 1-100, Sabit için kuruş cinsinden">
        <Input name="value" type="number" required defaultValue={d.value ?? ""} min={1} />
      </Field>

      <Field label="Min. sepet tutarı (kuruş)" hint="Boş bırakılırsa sınır yok">
        <Input name="minOrderCents" type="number" defaultValue={d.minOrderCents ?? ""} min={0} />
      </Field>
      <Field label="Maks. indirim (kuruş)" hint="Yüzde tipinde tavan; boş = sınırsız">
        <Input name="maxDiscountCents" type="number" defaultValue={d.maxDiscountCents ?? ""} min={0} />
      </Field>

      <Field label="Toplam kullanım limiti" hint="Boş = sınırsız">
        <Input name="usageLimit" type="number" defaultValue={d.usageLimit ?? ""} min={1} />
      </Field>
      <Field label="Kullanıcı başına limit" hint="Boş = sınırsız">
        <Input name="perUserLimit" type="number" defaultValue={d.perUserLimit ?? ""} min={1} />
      </Field>

      <Field label="Geçerlilik başlangıcı" hint="Boş = hemen aktif">
        <Input name="startsAt" type="datetime-local" defaultValue={toDateInput(d.startsAt)} />
      </Field>
      <Field label="Geçerlilik bitişi" hint="Boş = süresiz">
        <Input name="expiresAt" type="datetime-local" defaultValue={toDateInput(d.expiresAt)} />
      </Field>

      <Field label="Aktif">
        <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
          <input type="checkbox" name="isActive" defaultChecked={d.isActive ?? true} />
          <span>Yayında</span>
        </label>
      </Field>
      <div />

      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Açıklama (admin notu)">
          <Textarea name="description" defaultValue={d.description || ""} rows={2} />
        </Field>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <FormActions>
          <button className="od-btn od-btn-primary" type="submit">{submitLabel}</button>
        </FormActions>
      </div>
    </ToastForm>
  );
}
