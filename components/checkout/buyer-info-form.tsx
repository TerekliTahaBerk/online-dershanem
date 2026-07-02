"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleAlert, ShoppingBag } from "lucide-react";

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
  /**
   * Extra non-string payload (e.g. cart `items[]`) merged into the JSON body
   * AFTER the flat FormData. Use for arrays/objects that can't live in
   * `<input type="hidden">`.
   */
  extraPayload?: Record<string, unknown>;
  defaults?: BuyerInfoFormDefaults;
  /**
   * After submit:
   *  - "redirect": go to result.redirectUrl
   *  - "external": open result.paymentLink in same tab (link payment flow)
   */
  submitMode: "redirect" | "external";
  submitLabel?: string;
  service: "OD" | "ODK";
  /** Called after successful submission (e.g. to clear cart). */
  onSuccess?: () => void;
};

type ApiResult =
  | { ok: true; redirectUrl?: string; paymentLink?: string }
  | { ok: false; error: string };

/**
 * Checkout başlatma hatasını console'a anlamlı ama HASSAS BİLGİSİZ logla.
 * Loglanan: endpoint, status, response özeti, sepet kalem sayısı, toplam tutar,
 * fromCart. Loglanmayan: kart bilgisi, hash/secret, ad/email/telefon gibi PII.
 * Prod'da tek-satır JSON, dev'de okunabilir grup.
 */
function logCheckoutError(meta: {
  endpoint: string;
  service: "OD" | "ODK";
  status: number;
  responseSnippet: string;
  itemCount: number;
  totalCents: number;
  fromCart: string | null;
}) {
  if (process.env.NODE_ENV === "production") {
    // Vercel/log aggregator'ların parse edebileceği tek satır.
    console.error(JSON.stringify({ event: "checkout.start_failed", ...meta }));
  } else {
    console.error("[checkout.start_failed]", meta);
  }
}

export function BuyerInfoForm({
  action,
  packageLabel,
  priceLabel,
  hiddenFields = {},
  extraPayload,
  defaults = {},
  submitMode,
  submitLabel = "Ödemeye Geç",
  service,
  onSuccess,
}: BuyerInfoFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = {};
    fd.forEach((value, key) => {
      payload[key] = typeof value === "string" ? value.trim() : value;
    });
    // Merge extraPayload (cart items, etc.) — overrides any flat duplicates.
    if (extraPayload) {
      for (const [k, v] of Object.entries(extraPayload)) {
        payload[k] = v;
      }
    }

    // Client-side validation
    const nextFieldErrors: Record<string, string> = {};
    const required = ["fullName", "email", "phone", "city", "district", "address", "schoolName", "classLevel", "examType"];
    for (const key of required) {
      if (!payload[key]) nextFieldErrors[key] = "Bu alan gerekli.";
    }
    if (!payload.kvkkConsent) nextFieldErrors.kvkkConsent = "Devam etmek için onaylayın.";
    if (!payload.paymentConsent) nextFieldErrors.paymentConsent = "Devam etmek için onaylayın.";
    if (!String(payload.email).includes("@")) {
      nextFieldErrors.email = payload.email ? "Geçerli bir e-posta adresi girin." : "Bu alan gerekli.";
    }
    const phoneDigits = String(payload.phone).replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      nextFieldErrors.phone = payload.phone ? "Geçerli bir telefon numarası girin (en az 10 hane)." : "Bu alan gerekli.";
    }
    if (payload.tcKimlik && String(payload.tcKimlik).replace(/\D/g, "").length !== 11) {
      nextFieldErrors.tcKimlik = "T.C. Kimlik No 11 hane olmalı veya boş bırakılmalı.";
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const firstInvalid = form.elements.namedItem(Object.keys(nextFieldErrors)[0]);
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
      return;
    }

    // Guard: çift gönderimi engelle (React 18'de async submit boyunca pending
    // güvenilir kalsın diye useTransition yerine explicit state kullanıyoruz).
    if (isPending) return;
    setIsPending(true);

    // Loglama için hassas olmayan özet metadata (PII / sırlar HARİÇ).
    const items = Array.isArray(extraPayload?.items)
      ? (extraPayload!.items as Array<{ priceCents?: number; qty?: number }>)
      : [];
    const totalCents = items.reduce(
      (acc, i) => acc + (Number(i.priceCents) || 0) * (Number(i.qty) || 0),
      0,
    );
    const fromCart =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("fromCart")
        : null;

    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // res.ok kontrolü yapmadan json() parse ETME. Hata response'ları HTML
      // (500 sayfası) veya boş gövde olabilir → önce text oku, sonra güvenli
      // parse et. Aksi halde res.json() yakalanmayan promise üretir.
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      let json: ApiResult | null = null;
      if (raw && contentType.includes("application/json")) {
        try {
          json = JSON.parse(raw) as ApiResult;
        } catch {
          json = null;
        }
      }

      if (!res.ok || !json || json.ok !== true) {
        logCheckoutError({
          endpoint: action,
          service,
          status: res.status,
          responseSnippet: raw.slice(0, 300),
          itemCount: items.length,
          totalCents,
          fromCart,
        });
        setError(
          (json as { error?: string } | null)?.error ||
            "Ödeme başlatılamadı. Lütfen tekrar deneyin veya bizimle iletişime geçin.",
        );
        return;
      }

      if (submitMode === "external" && json.paymentLink) {
        onSuccess?.();
        window.location.href = json.paymentLink;
        return;
      }
      if (json.redirectUrl) {
        onSuccess?.();
        router.push(json.redirectUrl);
        return;
      }
      setError("Sunucudan yönlendirme adresi alınamadı. Lütfen tekrar deneyin.");
    } catch (err) {
      logCheckoutError({
        endpoint: action,
        service,
        status: 0,
        responseSnippet: err instanceof Error ? err.message : String(err),
        itemCount: items.length,
        totalCents,
        fromCart,
      });
      setError(
        "Ödeme başlatılamadı. Lütfen tekrar deneyin veya bizimle iletişime geçin.",
      );
    } finally {
      // Yönlendirme yapılmadıysa (hata) butonu tekrar aktifleştir; başarıyla
      // redirect olduysa sayfa zaten değişir, bu güvenli bir no-op'tur.
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={(event) => {
        const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (!target.name || !fieldErrors[target.name]) return;
        setFieldErrors((current) => {
          const next = { ...current };
          delete next[target.name];
          return next;
        });
      }}
      className="space-y-6"
      noValidate
    >
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <div className="flex items-start gap-3 rounded-[14px] border border-[var(--od-line)] bg-[var(--od-cream-2)] px-5 py-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--od-paper)] text-[var(--od-olive)]">
          <ShoppingBag size={18} strokeWidth={1.7} />
        </div>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--od-olive)] font-semibold mb-1">
            Sepetiniz
          </div>
          <div className="text-[var(--od-ink)] font-display text-[22px] leading-tight">{packageLabel}</div>
          <div className="text-[var(--od-olive)] text-[20px] font-bold mt-1">
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
          error={fieldErrors.fullName}
        />
        <Field
          name="email"
          label="E-posta"
          type="email"
          defaultValue={defaults.email}
          required
          error={fieldErrors.email}
          help="Ödeme sonrası hesabınız ekibimiz tarafından bu e-posta ile oluşturulur."
        />
        <Field
          name="phone"
          label="Cep Telefonu"
          type="tel"
          placeholder="05XX XXX XX XX"
          defaultValue={defaults.phone}
          required
          error={fieldErrors.phone}
        />
        <Field
          name="tcKimlik"
          label="T.C. Kimlik No (opsiyonel)"
          maxLength={11}
          error={fieldErrors.tcKimlik}
        />
      </Section>

      <Section title="Adres Bilgileri">
        <Field name="city" label="İl" defaultValue={defaults.city} required error={fieldErrors.city} />
        <Field
          name="district"
          label="İlçe"
          defaultValue={defaults.district}
          required
          error={fieldErrors.district}
        />
        <Field
          name="address"
          label="Açık Adres (fatura için)"
          textarea
          rows={2}
          required
          error={fieldErrors.address}
        />
      </Section>

      <Section title="Eğitim Bilgileri">
        <Field
          name="schoolName"
          label="Okul"
          defaultValue={defaults.schoolName}
          required
          error={fieldErrors.schoolName}
        />
        <SelectField
          name="classLevel"
          label="Sınıf Düzeyi"
          defaultValue={defaults.classLevel}
          required
          error={fieldErrors.classLevel}
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
          required
          defaultValue={defaults.examType}
          error={fieldErrors.examType}
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

      <div className="space-y-3 rounded-[14px] border border-[var(--od-line)] bg-[var(--od-cream-2)] px-5 py-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="kvkkConsent"
            value="1"
            required
            aria-invalid={!!fieldErrors.kvkkConsent}
            aria-describedby={fieldErrors.kvkkConsent ? "kvkkConsent-error" : undefined}
            className={`mt-0.5 h-5 w-5 shrink-0 rounded accent-[var(--od-olive)] ${fieldErrors.kvkkConsent ? "outline outline-2 outline-[#C06A52]" : "border-[var(--od-line)]"}`}
          />
          <span className="text-sm text-[var(--od-ink-soft)]">
            <Link
              href="/kvkk"
              target="_blank"
              className="text-[var(--od-olive)] underline font-medium"
            >
              KVKK Aydınlatma Metni
            </Link>
            'ni okudum ve onaylıyorum.{" "}
            <span className="text-rose-600">★</span>
          </span>
        </label>
        {fieldErrors.kvkkConsent ? (
          <FieldError id="kvkkConsent-error">{fieldErrors.kvkkConsent}</FieldError>
        ) : null}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="marketingConsent"
            value="1"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-[var(--od-line)] accent-[var(--od-olive)]"
          />
          <span className="text-sm text-[var(--od-ink-soft)]">
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
            aria-invalid={!!fieldErrors.paymentConsent}
            aria-describedby={fieldErrors.paymentConsent ? "paymentConsent-error" : undefined}
            className={`mt-0.5 h-5 w-5 shrink-0 rounded accent-[var(--od-olive)] ${fieldErrors.paymentConsent ? "outline outline-2 outline-[#C06A52]" : "border-[var(--od-line)]"}`}
          />
          <span className="text-sm text-[var(--od-ink-soft)]">
            <Link href="/iade" target="_blank" className="text-[var(--od-olive)] underline font-medium">
              Ön bilgilendirme ve mesafeli satış sözleşmesini
            </Link>{" "}
            okudum, kabul ediyorum. Hizmet hocalarımız tarafından planlandıktan sonra
            başlatılacaktır. <span className="text-rose-600">★</span>
          </span>
        </label>
        {fieldErrors.paymentConsent ? (
          <FieldError id="paymentConsent-error">{fieldErrors.paymentConsent}</FieldError>
        ) : null}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[var(--od-yellow)]/40 bg-[var(--od-yellow-soft)] px-4 py-3 text-[13.5px] text-[var(--od-ink)]">
        <strong>Bilgi:</strong>{" "}
        {service === "OD"
          ? "Satın almak için hesap oluşturmanız gerekmez. Ödeme sonrası ekibimiz öğrenci hesabınızı hazırlayıp giriş bilgilerinizi sizinle paylaşacaktır. Bu form sonrasında güvenli ödeme sayfasına yönlendirileceksiniz."
          : "Ödeme tamamlandığında ODK erişiminiz otomatik aktive olur. Deneme planınız için hocalarımız sizinle iletişime geçecektir."}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--od-olive)] px-6 py-4 text-[15px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21] disabled:cursor-not-allowed disabled:opacity-60"
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
    <section className="rounded-[16px] border border-[var(--od-line)] bg-[var(--od-paper)] p-5 shadow-[0_1px_2px_rgba(20,20,15,0.03)]">
      <h2 className="mb-4 text-[22px] font-medium tracking-[-0.015em] text-[var(--od-ink)]">{title}</h2>
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
  error?: string;
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
  error,
}: FieldProps) {
  const fieldClass = `min-h-12 w-full rounded-[10px] border px-3.5 py-3 text-[15px] text-[var(--od-ink)] outline-none transition-[border-color,background-color,box-shadow] duration-150 ${
    error
      ? "border-[#C06A52] bg-[#FBEDE7] focus:border-[#C06A52] focus:ring-2 focus:ring-[#C06A52]/20"
      : "border-[var(--od-line)] bg-[var(--od-paper)] focus:border-[var(--od-olive)] focus:ring-2 focus:ring-[var(--od-olive)]/15"
  }`;
  return (
    <label
      className={`block ${textarea ? "sm:col-span-2" : ""}`}
    >
      <span className="block text-[12.5px] font-medium text-[var(--od-ink-soft)] mb-1.5 uppercase tracking-wide">
        {label}
        {required ? <span className="text-rose-600 ml-0.5">★</span> : null}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={fieldClass}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={fieldClass}
        />
      )}
      {help && <span className="block text-[11.5px] text-[var(--od-ink-soft)] mt-1">{help}</span>}
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : null}
    </label>
  );
}

function SelectField({
  name,
  label,
  required,
  defaultValue,
  error,
  options,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-medium text-[var(--od-ink-soft)] mb-1.5 uppercase tracking-wide">
        {label}
        {required ? <span className="text-rose-600 ml-0.5">★</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`min-h-12 w-full rounded-[10px] border px-3.5 py-3 text-[15px] text-[var(--od-ink)] outline-none transition-[border-color,background-color,box-shadow] duration-150 ${error ? "border-[#C06A52] bg-[#FBEDE7] focus:ring-2 focus:ring-[#C06A52]/20" : "border-[var(--od-line)] bg-[var(--od-paper)] focus:border-[var(--od-olive)] focus:ring-2 focus:ring-[var(--od-olive)]/15"}`}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : null}
    </label>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className="mt-[7px] flex items-center gap-1.5 text-[12px] text-[#9A3B2C]">
      <CircleAlert size={13} strokeWidth={2} aria-hidden="true" />
      {children}
    </span>
  );
}
