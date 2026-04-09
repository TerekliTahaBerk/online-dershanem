"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { trackConversionEvent } from "@/lib/tracking";

type InlineLeadCaptureCardProps = {
  source: string;
  title?: string;
  description?: string;
  id?: string;
};

export function InlineLeadCaptureCard({
  source,
  title = "Formu Doldur, Seni Arayalım",
  description = "Sadece 1 dakikada bilgilerini bırak. Uzman danışmanımız en kısa sürede seni arayıp seviyene uygun programı birlikte netleştirsin.",
  id
}: InlineLeadCaptureCardProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [examType, setExamType] = useState("");
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim() || !phone.trim() || !classLevel || !examType || !kvkkConsent) {
      setError("Lütfen zorunlu alanları doldurup KVKK onayını ver.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
        fullName: fullName.trim(),
        phone: phone.trim(),
        classLevel,
        examType,
        targetGoal: "Inline kısa form",
        currentNet: "Belirtilmedi",
        parentPhone: "",
        kvkkConsent: "true",
        source,
        submittedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("lead-submit-failed");
      }
    } catch {
      setError("Gönderim sırasında bir sorun oluştu. Lütfen tekrar dene.");
      setIsSubmitting(false);
      return;
    }

    trackConversionEvent("lead_funnel_complete", {
      source,
      examType,
      classLevel
    });

    setIsSubmitted(true);
    setIsSubmitting(false);
    setFullName("");
    setPhone("");
    setClassLevel("");
    setExamType("");
    setKvkkConsent(false);
  };

  return (
    <section id={id} className="rounded-3xl border border-brand/25 bg-white p-5 shadow-soft sm:p-6">
      {isSubmitted ? (
        <div className="rounded-2xl border border-brand/35 bg-mint p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-pine">
            <CheckCircle2 className="h-4 w-4" /> Başvurun alındı
          </p>
          <p className="mt-2 text-sm text-muted">Ekibimiz kısa süre içinde seninle iletişime geçecek.</p>
        </div>
      ) : (
        <>
          <h3 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>

          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <label className="text-sm font-medium text-ink">
              Ad Soyad
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                placeholder="Örn: Ayşe Yılmaz"
                autoComplete="name"
              />
            </label>

            <label className="text-sm font-medium text-ink">
              Telefon
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                placeholder="05xx xxx xx xx"
                autoComplete="tel"
              />
            </label>

            <label className="text-sm font-medium text-ink">
              Sınıf / Durum
              <select
                value={classLevel}
                onChange={(event) => setClassLevel(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              >
                <option value="">Seç</option>
                <option>8. Sınıf</option>
                <option>9. Sınıf</option>
                <option>10. Sınıf</option>
                <option>11. Sınıf</option>
                <option>12. Sınıf</option>
                <option>Mezun</option>
              </select>
            </label>

            <label className="text-sm font-medium text-ink">
              Sınav Türü
              <select
                value={examType}
                onChange={(event) => setExamType(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              >
                <option value="">Seç</option>
                <option>LGS</option>
                <option>TYT</option>
                <option>AYT</option>
                <option>TYT + AYT</option>
              </select>
            </label>

            <label className="sm:col-span-2 flex items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={kvkkConsent}
                onChange={(event) => setKvkkConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line-strong text-anchor focus:ring-brand/30"
              />
              <span>
                <Link href="/kvkk/" target="_blank" className="font-semibold text-ink underline">
                  KVKK metnini
                </Link>{" "}
                okudum, iletişim amacıyla onaylıyorum.
              </span>
            </label>

            {error ? <p className="sm:col-span-2 text-xs font-semibold text-red-600">{error}</p> : null}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-anchor px-5 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-pine disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Gönderiliyor..." : "Beni Arayın"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
