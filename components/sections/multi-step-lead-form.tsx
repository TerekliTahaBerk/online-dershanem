"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, PhoneCall, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ContactLink } from "@/components/ui/contact-link";
import { contact } from "@/lib/content";
import { trackConversionEvent } from "@/lib/tracking";

type FormData = {
  fullName: string;
  phone: string;
  classLevel: string;
  examType: string;
  targetGoal: string;
  currentNet: string;
  supportType: string;
  parentPhone: string;
};

const initialData: FormData = {
  fullName: "",
  phone: "",
  classLevel: "",
  examType: "",
  targetGoal: "",
  currentNet: "",
  supportType: "",
  parentPhone: ""
};

const totalSteps = 4;

export function MultiStepLeadForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [source, setSource] = useState("unknown");
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const openHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ source?: string }>;
      setSource(customEvent.detail?.source ?? "unknown");
      setIsOpen(true);
      setIsSubmitted(false);
      setStep(1);
      trackConversionEvent("lead_funnel_open", { source: customEvent.detail?.source ?? "unknown" });
    };

    window.addEventListener("open-lead-funnel", openHandler as EventListener);
    return () => window.removeEventListener("open-lead-funnel", openHandler as EventListener);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("lead-funnel-visibility", { detail: { isOpen } }));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isSubmitted) return;
    trackConversionEvent("lead_funnel_step", { step, source });
  }, [isOpen, isSubmitted, source, step]);

  const progress = useMemo(() => (step / totalSteps) * 100, [step]);

  const updateField = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.fullName.trim() || !formData.phone.trim()) {
        setError("Lütfen ad soyad ve telefon bilgisini doldurun.");
        return false;
      }
    }

    if (step === 2) {
      if (!formData.classLevel || !formData.examType) {
        setError("Lütfen sınıf seviyeni ve sınav türünü seç.");
        return false;
      }
    }

    if (step === 3) {
      if (!formData.targetGoal.trim() || !formData.currentNet.trim()) {
        setError("Hedefini ve mevcut net aralığını paylaş.");
        return false;
      }
    }

    if (step === 4 && !formData.supportType) {
      setError("Lütfen destek tercihleri arasından seçim yap.");
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    if (step < totalSteps) setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateStep()) return;

    trackConversionEvent("lead_funnel_complete", {
      source,
      examType: formData.examType,
      classLevel: formData.classLevel,
      supportType: formData.supportType
    });

    setIsSubmitted(true);
    setFormData(initialData);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-anchor/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-white p-5 shadow-soft sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-funnel-title"
          >
            <Container className="px-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">1 dakikada ücretsiz deneme</p>
                  <h3 id="lead-funnel-title" className="mt-2 text-2xl font-bold text-ink">
                    Sana Uygun Programı Beraber Çıkaralım
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Gizli ücret yok. Formu tamamlayınca sana en uygun ders planını ve demo ders adımlarını hemen gönderelim.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ContactLink
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                      channel="phone"
                      placement="lead_funnel_header_call"
                      className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-soft px-4 py-2 text-xs font-semibold text-ink transition hover:bg-mint"
                      ariaLabel="Telefonla danışmana bağlan"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-brand" /> Form yerine telefonla bağlan
                    </ContactLink>
                    <span className="text-[11px] text-muted">Kısa bir görüşmeyle sana uygun paketi birlikte netleştirelim.</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Formu kapat"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-line p-2 text-muted/70 transition hover:bg-soft"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isSubmitted ? (
                <div className="mt-8 rounded-3xl border border-brand/35 bg-mint p-6">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-pine">
                    <CheckCircle2 className="h-4 w-4" /> Başvurun alındı
                  </p>
                  <h4 className="mt-2 text-xl font-semibold text-ink">Sana uygun yönü hazırladık.</h4>
                  <p className="mt-2 text-sm text-muted">
                    Danışman ekibimiz en geç 15 dakika içinde arayıp hedefin ve seviyene göre en doğru ders paketi önerisini paylaşacak.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="mt-5 inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
                    data-analytics-id="lead_funnel_close_after_success"
                  >
                    Kapat
                  </button>
                </div>
              ) : (
                <form className="mt-6" onSubmit={onSubmit} data-analytics-id="lead_funnel_form">
                  <div className="mb-5">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
                      <span>Adım {step} / {totalSteps}</span>
                      <span>%{Math.round(progress)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-soft">
                      <div className="h-2 rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {step === 1 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-ink">
                        Ad Soyad
                        <input
                          value={formData.fullName}
                          onChange={(event) => updateField("fullName", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="Örn: Ayşe Yılmaz"
                          autoComplete="name"
                        />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        Telefon
                        <input
                          value={formData.phone}
                          onChange={(event) => updateField("phone", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="05xx xxx xx xx"
                          autoComplete="tel"
                        />
                      </label>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-ink">
                        Sınıf / Durum
                        <select
                          value={formData.classLevel}
                          onChange={(event) => updateField("classLevel", event.target.value)}
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
                          value={formData.examType}
                          onChange={(event) => updateField("examType", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                        >
                          <option value="">Seç</option>
                          <option>LGS</option>
                          <option>TYT</option>
                          <option>AYT</option>
                          <option>YKS (TYT + AYT)</option>
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-ink">
                        Hedef
                        <input
                          value={formData.targetGoal}
                          onChange={(event) => updateField("targetGoal", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder={formData.examType.includes("AYT") ? "Örn: Tıp / Sayısal ilk 20K" : "Örn: Net +15 artış"}
                        />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        Mevcut Net / Seviye
                        <input
                          value={formData.currentNet}
                          onChange={(event) => updateField("currentNet", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="Örn: TYT 62 net"
                        />
                      </label>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-ink">Tercih ettiğin destek modeli</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {["Ücretsiz deneme", "Demo ders", "Koçluk görüşmesi"].map((option) => (
                          <button
                            type="button"
                            key={option}
                            onClick={() => updateField("supportType", option)}
                            className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                              formData.supportType === option
                                ? "border-brand bg-mint text-brand"
                                : "border-line bg-white text-muted hover:bg-soft"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      {formData.examType === "LGS" ? (
                        <label className="text-sm font-medium text-ink">
                          Veli Telefonu (Opsiyonel)
                          <input
                            value={formData.parentPhone}
                            onChange={(event) => updateField("parentPhone", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="05xx xxx xx xx"
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={step === 1}
                      className="inline-flex rounded-full border border-line-strong px-5 py-2.5 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      data-analytics-id="lead_funnel_prev"
                    >
                      Geri
                    </button>

                    {step < totalSteps ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
                        data-analytics-id="lead_funnel_next"
                      >
                        Devam Et
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="inline-flex rounded-full bg-brand px-5 py-2.5 text-xs font-semibold text-white"
                        data-analytics-id="lead_funnel_submit"
                      >
                        Ücretsiz Denemeyi Başlat
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    1 dakikadan kısa sürer. Bilgilerin sadece sana en uygun program önerisini çıkarmak için kullanılır.
                  </p>
                </form>
              )}
            </Container>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
