"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, CircleAlert, Clock3, ShoppingBag, UsersRound } from "lucide-react";
import { OD_NO_SLOT_OPTIONS, OD_TIME_RANGE_OPTIONS, type OdPlacementExpectation } from "@/lib/od/placement";

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
  parentEmail?: string;
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
  placementExpectation?: OdPlacementExpectation;
  /**
   * İndirim kodu alanını açar. Verilmezse alan basılmaz.
   *
   * `subtotalCents` yalnızca doğrulama çağrısı içindir; ödenecek tutarı
   * SUNUCU yeniden hesaplar (`/api/od/checkout/start` kuponu bir kez daha
   * doğrular), bu yüzden buradaki değer manipüle edilse bile para riski yok.
   */
  couponContext?: { subtotalCents: number };
};

type AppliedCoupon = { code: string; discountCents: number; label: string };

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
  placementExpectation,
  couponContext,
}: BuyerInfoFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<"idle" | "checking">("idle");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const formElementRef = useRef<HTMLFormElement>(null);

  /**
   * Kodu ödemeden ÖNCE doğrular ki kullanıcı geçersiz kodla ödeme ekranına
   * gitmesin. Yalnızca doğrulanmış kod payload'a eklenir; yazım hatası tüm
   * checkout'u düşürmez.
   */
  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code || !couponContext) return;
    const email = String(
      new FormData(formElementRef.current!).get("email") ?? "",
    ).trim();
    if (!email.includes("@")) {
      setCouponError("Kodu uygulamak için önce e-posta adresinizi girin.");
      return;
    }
    setCouponState("checking");
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          service,
          subtotalCents: couponContext.subtotalCents,
          email,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        discountCents?: number;
        kindLabel?: string;
      };
      if (!res.ok || !json.ok || !json.code || typeof json.discountCents !== "number") {
        setAppliedCoupon(null);
        setCouponError(json.error || "İndirim kodu doğrulanamadı.");
        return;
      }
      setAppliedCoupon({
        code: json.code,
        discountCents: json.discountCents,
        label: json.kindLabel || "İndirim",
      });
    } catch {
      setCouponError("İndirim kodu doğrulanamadı. Bağlantınızı kontrol edin.");
    } finally {
      setCouponState("idle");
    }
  }

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
    payload.availabilityTimeRanges = fd.getAll("availabilityTimeRanges").map(String);
    // Yalnız doğrulanmış kod gönderilir; sunucu yine de yeniden doğrular.
    payload.couponCode = appliedCoupon?.code ?? null;
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
    if (service === "OD" && !(payload.availabilityTimeRanges as unknown[]).length) nextFieldErrors.availabilityTimeRanges = "En az bir uygun zaman aralığı seçin.";
    if (service === "OD" && !payload.noSlotPreference) nextFieldErrors.noSlotPreference = "Bir tercih seçin.";
    if (service === "OD" && !payload.placementConsent) nextFieldErrors.placementConsent = "Tahmini yerleştirme koşullarını onaylayın.";
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
      const firstInvalid = form.querySelector<HTMLElement>(
        `[name="${CSS.escape(Object.keys(nextFieldErrors)[0])}"]`,
      );
      firstInvalid?.focus();
      return;
    }

    // Guard: çift gönderimi engelle (React 18'de async submit boyunca pending
    // güvenilir kalsın diye useTransition yerine explicit state kullanıyoruz).
    if (pendingRef.current || isPending) return;
    pendingRef.current = true;
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
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <form
      ref={formElementRef}
      onSubmit={onSubmit}
      onChange={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
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

      <div className="flex items-start gap-3 rounded-[20px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-5 py-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
          <ShoppingBag size={18} strokeWidth={1.7} />
        </div>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-orange-ink)] font-semibold mb-1">
            Sepetiniz
          </div>
          <div className="text-[var(--site-ink)] font-display text-[22px] leading-tight">{packageLabel}</div>
          <div className="text-[var(--brand-orange-ink)] text-[20px] font-bold mt-1">
            {priceLabel}
          </div>
        </div>
      </div>

      <Section title="Kişisel Bilgiler">
        <Field
          name="fullName"
          label="Ad Soyad"
          autoComplete="section-checkout name"
          defaultValue={defaults.fullName}
          required
          error={fieldErrors.fullName}
        />
        <Field
          name="email"
          label="E-posta"
          type="email"
          autoComplete="section-checkout email"
          defaultValue={defaults.email}
          required
          error={fieldErrors.email}
          help="Ödeme sonrası hesabınız ekibimiz tarafından bu e-posta ile oluşturulur."
        />
        <Field
          name="phone"
          label="Cep Telefonu"
          type="tel"
          autoComplete="section-checkout tel"
          placeholder="05XX XXX XX XX"
          defaultValue={defaults.phone}
          required
          error={fieldErrors.phone}
        />
        <Field
          name="tcKimlik"
          label="T.C. Kimlik No (opsiyonel)"
          autoComplete="off"
          inputMode="numeric"
          maxLength={11}
          error={fieldErrors.tcKimlik}
        />
      </Section>

      <Section title="Adres Bilgileri">
        <Field
          name="city"
          label="İl"
          autoComplete="section-checkout billing address-level1"
          defaultValue={defaults.city}
          required
          error={fieldErrors.city}
        />
        <Field
          name="district"
          label="İlçe"
          autoComplete="section-checkout billing address-level2"
          defaultValue={defaults.district}
          required
          error={fieldErrors.district}
        />
        <Field
          name="address"
          label="Açık Adres (fatura için)"
          autoComplete="section-checkout billing street-address"
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
          autoComplete="off"
          defaultValue={defaults.schoolName}
          required
          error={fieldErrors.schoolName}
        />
        <SelectField
          name="classLevel"
          label="Sınıf Düzeyi"
          autoComplete="off"
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
          autoComplete="off"
          placeholder="Sayısal, EA, Sözel..."
          defaultValue={defaults.department}
        />
        <SelectField
          name="examType"
          label="Hedef Sınav"
          autoComplete="off"
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
          autoComplete="off"
          defaultValue={defaults.targetSchool}
        />
      </Section>

      <Section title="Veli Bilgileri (öğrenci 18 yaş altıysa)">
        <Field
          name="parentFullName"
          label="Veli Ad Soyad"
          autoComplete="section-parent name"
          defaultValue={defaults.parentFullName}
        />
        <Field
          name="parentPhone"
          label="Veli Telefon"
          type="tel"
          autoComplete="section-parent tel"
          defaultValue={defaults.parentPhone}
        />
        <Field
          name="parentEmail"
          label="Veli E-posta"
          type="email"
          autoComplete="section-parent email"
          defaultValue={defaults.parentEmail}
        />
      </Section>

      {service === "OD" ? (
        <section className="rounded-[24px] border border-[var(--brand-orange-soft)] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,15,0.03)] sm:p-6">
          <h2 className="text-[22px] font-medium tracking-[-0.015em] text-[var(--site-ink)]">Ders zamanı ve yerleştirme</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--site-body)]">Bu bilgiler uygun grubu bulmak için doğrudan operasyon ekibine aktarılır; yeniden girmeniz gerekmez.</p>
          {placementExpectation ? <PlacementExpectationCard expectation={placementExpectation} /> : null}
          <fieldset className="mt-5">
            <legend className="text-[12.5px] font-medium uppercase tracking-wide text-[var(--site-body)]">Uygun olduğunuz saatler <RequiredMark /></legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{OD_TIME_RANGE_OPTIONS.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-3 py-3 text-sm"><input type="checkbox" name="availabilityTimeRanges" value={option.value} className="h-4 w-4 accent-[var(--brand-orange)]" />{option.label}</label>)}</div>
            {fieldErrors.availabilityTimeRanges ? <FieldError id="availabilityTimeRanges-error">{fieldErrors.availabilityTimeRanges}</FieldError> : null}
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="earliestStartDate" label="En erken başlayabileceğiniz tarih" type="date" autoComplete="off" />
            <SelectField name="noSlotPreference" label="Uygun grup yoksa" required error={fieldErrors.noSlotPreference} options={[{ v: "", l: "Tercih seçin" }, ...OD_NO_SLOT_OPTIONS.map((option) => ({ v: option.value, l: option.label }))]} />
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3">
            <input type="checkbox" name="placementConsent" value="1" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-orange)]" />
            <span className="text-sm leading-6 text-amber-950"><strong>Anladım:</strong> Gösterilen kapasite, saatler ve başlangıç tarihi tahmindir; belirli bir grup veya saat ödeme ile garanti edilmez. Ekip 24 saat içinde iletişim kurar ve 48 saat içinde grup, alternatif, bekleme listesi veya talebim doğrultusunda iade yolunu netleştirir. <RequiredMark /></span>
          </label>
          {fieldErrors.placementConsent ? <FieldError id="placementConsent-error">{fieldErrors.placementConsent}</FieldError> : null}
        </section>
      ) : null}

      <Section title="Notlar">
        <Field
          name="notes"
          label="Eklemek istediğiniz bir şey var mı?"
          autoComplete="off"
          textarea
          rows={3}
          placeholder="Tercih, müsaitlik, ihtiyaç vb."
        />
      </Section>

      {couponContext ? (
        <section className="rounded-[24px] border border-[var(--site-line)] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,15,0.03)] sm:p-6">
          <h2 className="text-[22px] font-medium tracking-[-0.015em] text-[var(--site-ink)]">
            İndirim kodu
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--site-body)]">
            Kodunuz varsa buraya girin; indirim ödeme tutarına yansır.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="couponCodeInput" className="sr-only">
              İndirim kodu
            </label>
            <input
              id="couponCodeInput"
              type="text"
              value={couponCode}
              autoComplete="off"
              maxLength={60}
              disabled={!!appliedCoupon}
              onChange={(event) => {
                setCouponCode(event.target.value);
                setCouponError(null);
              }}
              placeholder="ÖRN. HOSGELDIN"
              aria-invalid={!!couponError}
              aria-describedby={couponError ? "couponCode-error" : undefined}
              className="min-h-12 flex-1 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-3 text-[15px] uppercase text-[var(--site-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:normal-case placeholder:text-[var(--site-muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/15 disabled:opacity-60"
            />
            {appliedCoupon ? (
              <button
                type="button"
                onClick={() => {
                  setAppliedCoupon(null);
                  setCouponCode("");
                  setCouponError(null);
                }}
                className="min-h-12 rounded-2xl border border-[var(--site-line)] px-5 text-[14px] font-semibold text-[var(--site-body)] transition-colors hover:border-rose-300 hover:text-rose-600"
              >
                Kaldır
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void applyCoupon()}
                disabled={couponState === "checking" || !couponCode.trim()}
                className="min-h-12 rounded-2xl border border-[var(--brand-orange)] px-5 text-[14px] font-semibold text-[var(--brand-orange-ink)] transition-colors hover:bg-[var(--brand-orange-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponState === "checking" ? "Kontrol ediliyor..." : "Uygula"}
              </button>
            )}
          </div>
          {couponError ? (
            <FieldError id="couponCode-error">{couponError}</FieldError>
          ) : null}
          {appliedCoupon ? (
            <p role="status" className="mt-3 rounded-[14px] bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-900">
              <strong>{appliedCoupon.code}</strong> uygulandı ·{" "}
              {(appliedCoupon.discountCents / 100).toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              })}{" "}
              indirim ödeme ekranında düşülür.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="space-y-3 rounded-[20px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-5 py-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="kvkkConsent"
            value="1"
            required
            aria-invalid={!!fieldErrors.kvkkConsent}
            aria-describedby={fieldErrors.kvkkConsent ? "kvkkConsent-error" : undefined}
            className={`mt-0.5 h-5 w-5 shrink-0 rounded accent-[var(--brand-orange)] ${fieldErrors.kvkkConsent ? "outline outline-2 outline-rose-400" : "border-[var(--site-line)]"}`}
          />
          <span className="text-sm text-[var(--site-body)]">
            <Link
              href="/kvkk"
              target="_blank"
              className="text-[var(--brand-orange-ink)] underline font-medium"
            >
              KVKK Aydınlatma Metni
            </Link>
            'ni okudum ve onaylıyorum.{" "}
            <RequiredMark />
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
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-[var(--site-line)] accent-[var(--brand-orange)]"
          />
          <span className="text-sm text-[var(--site-body)]">
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
            className={`mt-0.5 h-5 w-5 shrink-0 rounded accent-[var(--brand-orange)] ${fieldErrors.paymentConsent ? "outline outline-2 outline-rose-400" : "border-[var(--site-line)]"}`}
          />
          <span className="text-sm text-[var(--site-body)]">
            <Link href="/iade" target="_blank" className="text-[var(--brand-orange-ink)] underline font-medium">
              Ön bilgilendirme ve mesafeli satış sözleşmesini
            </Link>{" "}
            okudum, kabul ediyorum. Hizmet hocalarımız tarafından planlandıktan sonra
            başlatılacaktır. <RequiredMark />
          </span>
        </label>
        {fieldErrors.paymentConsent ? (
          <FieldError id="paymentConsent-error">{fieldErrors.paymentConsent}</FieldError>
        ) : null}
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="rounded-[16px] border border-[var(--brand-orange-soft)] bg-[var(--brand-orange-tint)] px-4 py-3 text-[13.5px] text-[var(--site-ink)]">
        <strong>Bilgi:</strong>{" "}
        {service === "OD"
          ? "Satın almak için hesap oluşturmanız gerekmez. Ödeme sonrası ekibimiz sizinle iletişime geçer, öğrencinin seviyesini değerlendirir ve ilk ders planlamasını yapar. Bu form sonrasında güvenli ödeme sayfasına yönlendirileceksiniz."
          : "Ödeme tamamlandığında ODK erişiminiz otomatik aktive olur. Deneme planınız için hocalarımız sizinle iletişime geçecektir."}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-orange)] px-6 py-4 text-[16px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(44,58,32,0.5)] transition-colors hover:bg-[var(--brand-orange-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "İşleniyor..." : submitLabel} →
      </button>
    </form>
  );
}

function PlacementExpectationCard({ expectation }: { expectation: OdPlacementExpectation }) {
  const signalTone = expectation.capacitySignal === "OPEN_SEATS" ? "bg-emerald-50 text-emerald-900" : expectation.capacitySignal === "LIMITED" ? "bg-amber-50 text-amber-950" : "bg-slate-100 text-slate-800";
  return <div className="mt-4 grid gap-2 text-[12.5px] sm:grid-cols-2">
    <div className={`rounded-2xl px-4 py-3 ${signalTone}`}><p className="flex items-center gap-2 font-bold"><UsersRound size={15} />Kapasite sinyali</p><p className="mt-1 leading-5">{expectation.capacityLabel}</p></div>
    <div className="rounded-2xl bg-[var(--site-bg-warm)] px-4 py-3"><p className="flex items-center gap-2 font-bold"><CalendarClock size={15} />Beklenen başlangıç</p><p className="mt-1 leading-5">{expectation.expectedStartLabel}</p></div>
    <div className="rounded-2xl bg-[var(--site-bg-warm)] px-4 py-3"><p className="flex items-center gap-2 font-bold"><Clock3 size={15} />Gözlenen ders saatleri</p><p className="mt-1 leading-5">{expectation.observedTimeRanges.length ? expectation.observedTimeRanges.join(" · ") : "Saat uyumu görüşmede belirlenecek"}</p></div>
    <div className="rounded-2xl bg-[var(--site-bg-warm)] px-4 py-3"><p className="font-bold">Yerleştirme SLA'sı</p><p className="mt-1 leading-5">{expectation.placementSlaLabel}</p></div>
  </div>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--site-line)] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,15,0.03)] sm:p-6">
      <h2 className="mb-4 text-[22px] font-medium tracking-[-0.015em] text-[var(--site-ink)]">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
  autoComplete,
  inputMode,
  required,
  defaultValue,
  placeholder,
  help,
  textarea,
  rows = 3,
  maxLength,
  error,
}: FieldProps) {
  const describedBy = [help ? `${name}-help` : null, error ? `${name}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
  const fieldClass = `min-h-12 w-full rounded-2xl border px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-[var(--site-muted)] ${
    error
      ? "border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
      : "border-[var(--site-line)] bg-[var(--site-bg-warm)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/15"
  }`;
  return (
    <label
      htmlFor={name}
      className={`block ${textarea ? "sm:col-span-2" : ""}`}
    >
      <span className="block text-[12.5px] font-medium text-[var(--site-body)] mb-1.5 uppercase tracking-wide">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={fieldClass}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={fieldClass}
        />
      )}
      {help && <span id={`${name}-help`} className="block text-[11.5px] text-[var(--site-body)] mt-1">{help}</span>}
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : null}
    </label>
  );
}

function SelectField({
  name,
  label,
  autoComplete,
  required,
  defaultValue,
  error,
  options,
}: {
  name: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <label htmlFor={name} className="block">
      <span className="block text-[12.5px] font-medium text-[var(--site-body)] mb-1.5 uppercase tracking-wide">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <select
        id={name}
        name={name}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`min-h-12 w-full rounded-2xl border px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none transition-[border-color,background-color,box-shadow] duration-150 ${error ? "border-rose-400 bg-rose-50 focus:ring-2 focus:ring-rose-400/20" : "border-[var(--site-line)] bg-[var(--site-bg-warm)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/15"}`}
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

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-rose-600">★</span>
      <span className="sr-only"> (zorunlu)</span>
    </>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className="mt-[7px] flex items-center gap-1.5 text-[12px] text-rose-600">
      <CircleAlert size={13} strokeWidth={2} aria-hidden="true" />
      {children}
    </span>
  );
}
