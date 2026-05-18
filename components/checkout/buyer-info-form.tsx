"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type BuyerInfoFormDefaults = {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  district?: string;
  schoolName?: string;
  classLevel?: string;
  department?: string;
  examType?: string;
  targetSchool?: string;
  parentFullName?: string;
  parentPhone?: string;
};

export type BuyerInfoFormProps = {
  action: string;
  packageLabel: string;
  priceLabel: string;
  hiddenFields?: Record<string, string>;
  defaults?: BuyerInfoFormDefaults;
  /**
   * After submit:
   *  - "redirect": go to result.redirectUrl
   *  - "external": open result.paymentLink in same tab (link payment flow)
   */
  submitMode: "redirect" | "external";
  submitLabel?: string;
  service: "OD" | "ODK";
};

type ApiResult =
  | { ok: true; redirectUrl?: string; paymentLink?: string }
  | { ok: false; error: string };

export function BuyerInfoForm({
  action,
  packageLabel,
  priceLabel,
  hiddenFields = {},
  defaults = {},
  submitMode,
  submitLabel = "Ödemeye Geç",
  service,
}: BuyerInfoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = {};
    fd.forEach((value, key) => {
      payload[key] = typeof value === "string" ? value.trim() : value;
    });

    // Client-side validation
    const required = [
      "fullName",
      "email",
      "phone",
      "city",
      "district",
      "classLevel",
      "kvkkConsent",
    ];
    for (const k of required) {
      if (!payload[k]) {
        setError(`Lütfen tüm zorunlu alanları doldurun (${k}).`);
        return;
      }
    }
    if (!String(payload.email).includes("@")) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    const phoneDigits = String(payload.phone).replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("Geçerli bir telefon numarası girin.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json: ApiResult = await res.json();
        if (!res.ok || !json.ok) {
          setError(
            (json as { error?: string }).error ||
              "Bir hata oluştu. Lütfen tekrar deneyin.",
          );
          return;
        }
        if (submitMode === "external" && json.paymentLink) {
          window.location.href = json.paymentLink;
          return;
        }
        if (json.redirectUrl) {
          router.push(json.redirectUrl);
          return;
        }
        setError("Sunucudan yönlendirme adresi alınamadı.");
      } catch (err) {
        setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 flex items-start gap-3">
        <div className="text-2xl">🛒</div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-indigo-700 font-semibold mb-1">
            Sepetiniz
          </div>
          <div className="text-slate-900 font-semibold">{packageLabel}</div>
          <div className="text-indigo-700 text-xl font-bold mt-1">
            {priceLabel}
          </div>
        </div>
      </div>

      <Section title="Kişisel Bilgiler">
        <Field
          name="fullName"
          label="Ad Soyad"
          defaultValue={defaults.fullName}
          required
        />
        <Field
          name="email"
          label="E-posta"
          type="email"
          defaultValue={defaults.email}
          required
          help="Satın alma bu e-posta hesabına tanımlanır."
        />
        <Field
          name="phone"
          label="Cep Telefonu"
          type="tel"
          placeholder="05XX XXX XX XX"
          defaultValue={defaults.phone}
          required
        />
        <Field
          name="tcKimlik"
          label="T.C. Kimlik No (opsiyonel)"
          maxLength={11}
        />
      </Section>

      <Section title="Adres Bilgileri">
        <Field name="city" label="İl" defaultValue={defaults.city} required />
        <Field
          name="district"
          label="İlçe"
          defaultValue={defaults.district}
          required
        />
        <Field
          name="address"
          label="Açık Adres (fatura için)"
          textarea
          rows={2}
        />
      </Section>

      <Section title="Eğitim Bilgileri">
        <Field
          name="schoolName"
          label="Okul"
          defaultValue={defaults.schoolName}
        />
        <SelectField
          name="classLevel"
          label="Sınıf Düzeyi"
          defaultValue={defaults.classLevel}
          required
          options={[
            { v: "", l: "Seçin" },
            { v: "9", l: "9. Sınıf" },
            { v: "10", l: "10. Sınıf" },
            { v: "11", l: "11. Sınıf" },
            { v: "12", l: "12. Sınıf" },
            { v: "Mezun", l: "Mezun" },
            { v: "5", l: "5. Sınıf (LGS)" },
            { v: "6", l: "6. Sınıf (LGS)" },
            { v: "7", l: "7. Sınıf (LGS)" },
            { v: "8", l: "8. Sınıf (LGS)" },
          ]}
        />
        <Field
          name="department"
          label="Alan / Bölüm"
          placeholder="Sayısal, EA, Sözel..."
          defaultValue={defaults.department}
        />
        <SelectField
          name="examType"
          label="Hedef Sınav"
          defaultValue={defaults.examType}
          options={[
            { v: "", l: "Seçin" },
            { v: "TYT", l: "TYT" },
            { v: "AYT", l: "AYT" },
            { v: "YKS", l: "YKS (TYT+AYT)" },
            { v: "LGS", l: "LGS" },
            { v: "DGS", l: "DGS" },
            { v: "KPSS", l: "KPSS" },
            { v: "Diğer", l: "Diğer" },
          ]}
        />
        <Field
          name="targetSchool"
          label="Hedef Üniversite / Lise (opsiyonel)"
          defaultValue={defaults.targetSchool}
        />
      </Section>

      <Section title="Veli Bilgileri (öğrenci 18 yaş altıysa)">
        <Field
          name="parentFullName"
          label="Veli Ad Soyad"
          defaultValue={defaults.parentFullName}
        />
        <Field
          name="parentPhone"
          label="Veli Telefon"
          type="tel"
          defaultValue={defaults.parentPhone}
        />
      </Section>

      <Section title="Notlar">
        <Field
          name="notes"
          label="Eklemek istediğiniz bir şey var mı?"
          textarea
          rows={3}
          placeholder="Tercih, müsaitlik, ihtiyaç vb."
        />
      </Section>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="kvkkConsent"
            value="1"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            <Link
              href="/kvkk"
              target="_blank"
              className="text-indigo-600 underline"
            >
              KVKK Aydınlatma Metni
            </Link>
            'ni okudum ve onaylıyorum.{" "}
            <span className="text-rose-600">*</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="marketingConsent"
            value="1"
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            Kampanya, duyuru ve eğitim içerikleri için elektronik ileti
            (SMS/e-posta) almayı kabul ediyorum.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="paymentConsent"
            value="1"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">
            Ön bilgilendirme ve mesafeli satış sözleşmesini okudum, kabul
            ediyorum. Hizmet hocalarımız tarafından planlandıktan sonra
            başlatılacaktır. <span className="text-rose-600">*</span>
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Bilgi:</strong>{" "}
        {service === "OD"
          ? "Ödemeniz alındıktan sonra hocalarımız 24 saat içinde sizinle iletişime geçerek programınızı planlayacaktır. Bu form sonrasında güvenli ödeme sayfasına yönlendirileceksiniz."
          : "Ödeme tamamlandığında ODK erişiminiz otomatik aktive olur. Deneme planınız için hocalarımız sizinle iletişime geçecektir."}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "İşleniyor..." : submitLabel} →
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900 mb-4">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  textarea?: boolean;
  rows?: number;
  maxLength?: number;
};

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  placeholder,
  help,
  textarea,
  rows = 3,
  maxLength,
}: FieldProps) {
  return (
    <label
      className={`block ${textarea ? "sm:col-span-2" : ""}`}
    >
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required ? <span className="text-rose-600 ml-0.5">*</span> : null}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      )}
      {help && <span className="block text-xs text-slate-500 mt-1">{help}</span>}
    </label>
  );
}

function SelectField({
  name,
  label,
  required,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required ? <span className="text-rose-600 ml-0.5">*</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}
