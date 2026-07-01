"use client";

import { useRef, useState } from "react";
import { MessageCircle, Mail, Check } from "lucide-react";
import Link from "next/link";
import { contact } from "@/lib/content";
import { trackConversionEvent } from "@/lib/tracking";

type FormState = {
  parentName: string;
  phone: string;
  email: string;
  grade: string;
  goal: string;
  topic: string;
  channel: string;
  preferredTime: string;
  kvkk: boolean;
};

type Errors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  parentName: "",
  phone: "",
  email: "",
  grade: "",
  goal: "",
  topic: "",
  channel: "WhatsApp",
  preferredTime: "Fark etmez",
  kvkk: false,
};

const goals = ["LGS", "TYT", "AYT", "Temel destek"];
const grades = [
  "5. sınıf",
  "6. sınıf",
  "7. sınıf",
  "8. sınıf (LGS)",
  "9. sınıf",
  "10. sınıf",
  "11. sınıf",
  "12. sınıf",
  "Mezun",
];
const channels = ["WhatsApp", "Telefon", "E-posta"];
const preferredTimes = [
  "Fark etmez",
  "Sabah (09:00–12:00)",
  "Öğleden sonra (12:00–17:00)",
  "Akşam (17:00–21:00)",
];

const whatsappDigits = contact.whatsapp.replace(/[^\d]/g, "");

function buildMessage(f: FormState): string {
  return [
    "Ön görüşme talebi — Online Dershanem",
    `Veli adı: ${f.parentName}`,
    `Telefon: ${f.phone}`,
    `E-posta: ${f.email || "-"}`,
    `Öğrenci sınıfı: ${f.grade}`,
    `Hedef: ${f.goal}`,
    `Zorlanılan konu: ${f.topic || "-"}`,
    `Tercih edilen kanal: ${f.channel}`,
    `Uygun iletişim zamanı: ${f.preferredTime}`,
  ].join("\n");
}

// LeadSubmission modelinde ayrı sütunu olmayan alanları tek notes metninde topla.
function buildNotes(f: FormState): string {
  return [
    f.email ? `E-posta: ${f.email}` : null,
    f.topic ? `Zorlanılan konu: ${f.topic}` : null,
    `Tercih edilen kanal: ${f.channel}`,
    `Uygun iletişim zamanı: ${f.preferredTime}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function ContactLeadForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  // Sunucuya kayıt yapıldı mı — success ekranındaki metni buna göre uyarlarız.
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.parentName.trim()) e.parentName = "Adınızı paylaşmanız gerekiyor.";
    if (!form.phone.trim()) {
      e.phone = "Telefon numaranızı paylaşmanız gerekiyor.";
    } else if (form.phone.replace(/[^\d]/g, "").length < 10) {
      e.phone = "Telefon numarası eksik veya hatalı görünüyor.";
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "E-posta adresi eksik veya hatalı görünüyor.";
    }
    if (!form.grade) e.grade = "Öğrencinin sınıf bilgisi eksik.";
    if (!form.goal) e.goal = "Hedef bilgisi eksik.";
    if (!form.kvkk) e.kvkk = "İletişim talebini iletebilmemiz için KVKK onayı gerekiyor.";
    return e;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setStatus("idle");
      // İlk hatalı alana odaklan
      const firstKey = Object.keys(e)[0];
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
      el?.focus();
      return;
    }

    setStatus("loading");
    trackConversionEvent("trial_cta_click", { source: "contact_lead_form", goal: form.goal });

    // Önce gerçek /api/leads ucuna kaydet; başarısız olursa WhatsApp/mailto
    // fallback'i success ekranındaki butonlarla devreye girer.
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.parentName.trim(),
          phone: form.phone.trim(),
          classLevel: form.grade,
          examType: form.goal,
          targetGoal: form.goal,
          currentNet: "Belirtilmedi",
          kvkkConsent: true,
          source: "contact_lead_form",
          formType: "INLINE",
          notes: buildNotes(form),
          submittedAt: new Date().toISOString(),
        }),
      });
      setSaved(res.ok);
    } catch {
      setSaved(false);
    }

    setStatus("success");
  };

  if (status === "success") {
    const message = buildMessage(form);
    return (
      <div className="rounded-[24px] border border-[var(--od-line)] bg-white p-8 sm:p-10" role="status" aria-live="polite">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--od-olive)]/10 text-[var(--od-olive)]">
          <Check size={24} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-display text-[26px] leading-tight text-[var(--od-ink)]">
          {saved ? "Talebiniz bize ulaştı." : "Talebiniz hazır."}
        </h2>
        <p className="mt-2 max-w-md text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
          {saved
            ? "Talebinizi aldık. Ekibimiz tercih ettiğiniz kanaldan size dönecek; isterseniz aşağıdan doğrudan da yazabilirsiniz."
            : "Formu kaydedemedik. Talebinizi aşağıdaki seçeneklerden biriyle doğrudan bize iletebilirsiniz."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1ebe5a]"
          >
            <MessageCircle size={16} aria-hidden="true" />
            WhatsApp&apos;tan gönder
          </a>
          <a
            href={`mailto:${contact.email}?subject=${encodeURIComponent("Ön görüşme talebi — Online Dershanem")}&body=${encodeURIComponent(message)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[14px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/35"
          >
            <Mail size={16} aria-hidden="true" />
            E-posta ile gönder
          </a>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(initial);
            setStatus("idle");
            setSaved(false);
          }}
          className="mt-5 text-[13px] text-[var(--od-ink-soft)] underline-offset-2 hover:text-[var(--od-ink)] hover:underline"
        >
          Yeni talep oluştur
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[24px] border border-[var(--od-line)] bg-white p-7 sm:p-9"
    >
      <h2 className="font-display text-[26px] leading-tight text-[var(--od-ink)] sm:text-[30px]">
        Kısa ön görüşme talebi
      </h2>
      <p className="mt-2 text-[14px] leading-7 text-[var(--od-ink-soft)]">
        Bilgilerinizi paylaşırsanız tercih ettiğiniz kanaldan size döneriz. Bu form bir
        ödeme adımı değildir.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field id="parentName" label="Veli adı" required error={errors.parentName}>
          <input
            id="parentName"
            name="parentName"
            type="text"
            autoComplete="name"
            value={form.parentName}
            onChange={(e) => update("parentName", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.parentName}
            aria-describedby={errors.parentName ? "parentName-error" : undefined}
            className={inputClass(!!errors.parentName)}
          />
        </Field>

        <Field id="phone" label="Telefon" required error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={inputClass(!!errors.phone)}
          />
        </Field>

        <Field id="email" label="E-posta (opsiyonel)" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClass(!!errors.email)}
          />
        </Field>

        <Field id="grade" label="Öğrenci sınıfı" required error={errors.grade}>
          <select
            id="grade"
            name="grade"
            value={form.grade}
            onChange={(e) => update("grade", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.grade}
            aria-describedby={errors.grade ? "grade-error" : undefined}
            className={inputClass(!!errors.grade)}
          >
            <option value="">Seçin</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>

        <Field id="goal" label="Hedef" required error={errors.goal}>
          <select
            id="goal"
            name="goal"
            value={form.goal}
            onChange={(e) => update("goal", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.goal}
            aria-describedby={errors.goal ? "goal-error" : undefined}
            className={inputClass(!!errors.goal)}
          >
            <option value="">Seçin</option>
            {goals.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>

        <Field id="channel" label="Tercih edilen iletişim kanalı">
          <select
            id="channel"
            name="channel"
            value={form.channel}
            onChange={(e) => update("channel", e.target.value)}
            className={inputClass(false)}
          >
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field id="preferredTime" label="Uygun iletişim zamanı">
          <select
            id="preferredTime"
            name="preferredTime"
            value={form.preferredTime}
            onChange={(e) => update("preferredTime", e.target.value)}
            className={inputClass(false)}
          >
            {preferredTimes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field id="topic" label="En çok zorlanılan konu (opsiyonel)">
            <input
              id="topic"
              name="topic"
              type="text"
              value={form.topic}
              onChange={(e) => update("topic", e.target.value)}
              placeholder="Örn. üslü sayılar, paragraf-problem, türev…"
              className={inputClass(false)}
            />
          </Field>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="kvkk" className="flex items-start gap-3 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">
          <input
            id="kvkk"
            name="kvkk"
            type="checkbox"
            checked={form.kvkk}
            onChange={(e) => update("kvkk", e.target.checked)}
            aria-required="true"
            aria-invalid={!!errors.kvkk}
            aria-describedby={errors.kvkk ? "kvkk-error" : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--od-ink)]/30 text-[var(--od-olive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--od-olive)]"
          />
          <span>
            <Link href="/kvkk/" className="font-medium text-[var(--od-ink)] underline-offset-2 hover:underline">
              KVKK Aydınlatma Metni
            </Link>
            {" "}kapsamında bilgilerimin iletişim amacıyla işlenmesini onaylıyorum.
          </span>
        </label>
        {errors.kvkk ? (
          <p id="kvkk-error" className="mt-1.5 text-[12.5px] text-[#B0392F]">
            {errors.kvkk}
          </p>
        ) : null}
      </div>

      {status === "error" ? (
        <p className="mt-5 rounded-xl border border-[#B0392F]/30 bg-[#B0392F]/5 px-4 py-3 text-[13.5px] text-[#B0392F]" role="alert">
          Formu şu anda iletemedik. {contact.whatsapp} numaralı WhatsApp hattımızdan
          bize ulaşabilirsiniz.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#2E3B24] disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {status === "loading" ? "Hazırlanıyor…" : "Ön görüşme talebi gönder"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-[var(--od-ink)]">
        {label}
        {required ? <span className="text-[#B0392F]"> *</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] text-[#B0392F]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return `w-full rounded-xl border bg-white px-4 py-2.5 text-[14.5px] text-[var(--od-ink)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--od-olive)] focus-visible:ring-offset-1 ${
    hasError ? "border-[#B0392F]" : "border-[var(--od-ink)]/15 hover:border-[var(--od-ink)]/30"
  }`;
}
