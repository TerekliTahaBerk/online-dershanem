"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, PhoneCall, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ContactLink } from "@/components/ui/contact-link";
import { submitPurchaseSubmission } from "@/lib/form-submission";
import { contact } from "@/lib/content";
import { trackConversionEvent } from "@/lib/tracking";

type PurchaseFormData = {
  studentFullName: string;
  studentPhone: string;
  studentEmail: string;
  schoolName: string;
  city: string;
  district: string;
  classLevel: string;
  department: string;
  examType: string;
  targetRanking: string;
  currentLevel: string;
  currentNet: string;
  weakLessons: string;
  strongLessons: string;
  needType: string;
  studyStatus: string;
  weeklyStudyHours: string;
  parentFullName: string;
  parentPhone: string;
  parentEmail: string;
  notes: string;
  kvkkConsent: boolean;
  paymentConsent: boolean;
};

type PurchaseOpenDetail = {
  source?: string;
  packageName?: string;
  paymentLink?: string;
};

const initialFormData: PurchaseFormData = {
  studentFullName: "",
  studentPhone: "",
  studentEmail: "",
  schoolName: "",
  city: "",
  district: "",
  classLevel: "",
  department: "",
  examType: "",
  targetRanking: "",
  currentLevel: "",
  currentNet: "",
  weakLessons: "",
  strongLessons: "",
  needType: "",
  studyStatus: "",
  weeklyStudyHours: "",
  parentFullName: "",
  parentPhone: "",
  parentEmail: "",
  notes: "",
  kvkkConsent: false,
  paymentConsent: false
};

const totalSteps = 4;

export function PurchaseIntentForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [source, setSource] = useState("unknown");
  const [packageName, setPackageName] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [formData, setFormData] = useState<PurchaseFormData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => (step / totalSteps) * 100, [step]);

  useEffect(() => {
    const openHandler = (event: Event) => {
      const customEvent = event as CustomEvent<PurchaseOpenDetail>;
      const nextSource = customEvent.detail?.source ?? "unknown";
      const nextPackageName = customEvent.detail?.packageName ?? "Belirtilmedi";
      const nextPaymentLink = customEvent.detail?.paymentLink ?? "";

      setSource(nextSource);
      setPackageName(nextPackageName);
      setPaymentLink(nextPaymentLink);
      setIsOpen(true);
      setIsSubmitted(false);
      setError(null);
      setStep(1);
      setFormData(initialFormData);
      trackConversionEvent("purchase_funnel_open", {
        source: nextSource,
        packageName: nextPackageName
      });
    };

    window.addEventListener("open-purchase-funnel", openHandler as EventListener);
    return () => window.removeEventListener("open-purchase-funnel", openHandler as EventListener);
  }, []);

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
    trackConversionEvent("purchase_funnel_step", {
      step,
      source,
      packageName
    });
  }, [isOpen, isSubmitted, packageName, source, step]);

  const updateField = <K extends keyof PurchaseFormData>(key: K, value: PurchaseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.studentFullName.trim() || !formData.studentPhone.trim() || !formData.studentEmail.trim()) {
        setError("Öğrenci adı, telefon ve e-posta alanlarını doldur.");
        return false;
      }
    }

    if (step === 2) {
      if (!formData.schoolName.trim() || !formData.classLevel || !formData.city.trim() || !formData.district.trim() || !formData.examType) {
        setError("Okul, sınıf, şehir, ilçe ve sınav bilgilerini tamamla.");
        return false;
      }
    }

    if (step === 3) {
      if (
        !formData.targetRanking.trim() ||
        !formData.currentLevel.trim() ||
        !formData.currentNet.trim() ||
        !formData.weakLessons.trim() ||
        !formData.needType.trim() ||
        !formData.studyStatus.trim() ||
        !formData.weeklyStudyHours.trim()
      ) {
        setError("Seviye ve hedef analiz alanlarını tamamla.");
        return false;
      }
    }

    if (step === 4) {
      if (!formData.paymentConsent || !formData.kvkkConsent) {
        setError("Devam etmek için ödeme ve KVKK onaylarını vermelisin.");
        return false;
      }
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    const submittedAt = new Date().toISOString();
    const noteParts = [formData.notes.trim(), `Paket: ${packageName}`, `Kanal: ${source}`].filter(Boolean);

    try {
      await submitPurchaseSubmission({
        submittedAt,
        studentFullName: formData.studentFullName,
        studentPhone: formData.studentPhone,
        studentEmail: formData.studentEmail,
        schoolName: formData.schoolName,
        city: formData.city,
        district: formData.district,
        classLevel: formData.classLevel,
        department: formData.department,
        examType: formData.examType,
        targetRanking: formData.targetRanking,
        currentLevel: formData.currentLevel,
        currentNet: formData.currentNet,
        weakLessons: formData.weakLessons,
        strongLessons: formData.strongLessons,
        needType: formData.needType,
        studyStatus: formData.studyStatus,
        weeklyStudyHours: formData.weeklyStudyHours,
        parentFullName: formData.parentFullName,
        parentPhone: formData.parentPhone,
        parentEmail: formData.parentEmail,
        packageName,
        paymentLink,
        notes: noteParts.join(" | "),
        source,
        kvkkConsent: formData.kvkkConsent,
        paymentConsent: formData.paymentConsent
      });
    } catch {
      setError("Gönderim sırasında bir sorun oluştu. Lütfen tekrar dene veya telefonla bize ulaş.");
      setIsSubmitting(false);
      return;
    }

    trackConversionEvent("purchase_funnel_complete", {
      source,
      packageName,
      classLevel: formData.classLevel,
      examType: formData.examType
    });

    setIsSubmitted(true);
    setIsSubmitting(false);
    setFormData(initialFormData);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-anchor/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-white p-5 shadow-soft sm:max-h-[88vh] sm:max-w-3xl sm:rounded-3xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-funnel-title"
          >
            <Container className="px-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Satın alma öncesi öğrenci analizi</p>
                  <h3 id="purchase-funnel-title" className="mt-2 text-2xl font-bold text-ink">
                    {packageName} Paketi İçin Kısa Ön Bilgi Formu
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Öğrencinin seviyesine göre doğru gruba yerleşim için ödeme öncesi detayları topluyoruz.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ContactLink
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                      channel="phone"
                      placement="purchase_funnel_header_call"
                      className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-soft px-4 py-2 text-xs font-semibold text-ink transition hover:bg-mint"
                      ariaLabel="Telefonla danışmana bağlan"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-brand" /> Telefonla devam et
                    </ContactLink>
                    <span className="text-[11px] text-muted">Formu doldurmadan da danışmanla yönlendirme alabilirsin.</span>
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
                    <CheckCircle2 className="h-4 w-4" /> Bilgiler kaydedildi
                  </p>
                  <h4 className="mt-2 text-xl font-semibold text-ink">Ödeme adımına geçebilirsin.</h4>
                  <p className="mt-2 text-sm text-muted">
                    Form yanıtın Satın Alım sayfasına kaydedildi. Şimdi paket ödeme linkine geçip işlemi tamamlayabilirsin.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {paymentLink ? (
                      <a
                        href={paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
                        data-analytics-id="purchase_funnel_go_payment"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Ödeme Linkine Git
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex rounded-full border border-line-strong px-5 py-2.5 text-xs font-semibold text-ink"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              ) : (
                <form className="mt-6" onSubmit={onSubmit} data-analytics-id="purchase_funnel_form">
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
                        Öğrenci Ad Soyad
                        <input
                          value={formData.studentFullName}
                          onChange={(event) => updateField("studentFullName", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="Örn: Ahmet Yılmaz"
                          autoComplete="name"
                        />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        Öğrenci Telefon
                        <input
                          value={formData.studentPhone}
                          onChange={(event) => updateField("studentPhone", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="05xx xxx xx xx"
                          autoComplete="tel"
                        />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        Öğrenci E-posta
                        <input
                          value={formData.studentEmail}
                          onChange={(event) => updateField("studentEmail", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="ogrenci@mail.com"
                          autoComplete="email"
                        />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        Veli Ad Soyad (Opsiyonel)
                        <input
                          value={formData.parentFullName}
                          onChange={(event) => updateField("parentFullName", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="Örn: Mehmet Yılmaz"
                        />
                      </label>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-ink">
                        Okul
                        <input
                          value={formData.schoolName}
                          onChange={(event) => updateField("schoolName", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="Örn: Atatürk Anadolu Lisesi"
                        />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        Şehir
                        <input
                          value={formData.city}
                          onChange={(event) => updateField("city", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="Örn: İstanbul"
                        />
                      </label>
                      <label className="text-sm font-medium text-ink">
                        İlçe
                        <input
                          value={formData.district}
                          onChange={(event) => updateField("district", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          placeholder="Örn: Kadıköy"
                        />
                      </label>
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
                        Bölüm (Opsiyonel)
                        <select
                          value={formData.department}
                          onChange={(event) => updateField("department", event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                        >
                          <option value="">Seç</option>
                          <option>Sayısal</option>
                          <option>Eşit Ağırlık</option>
                          <option>Sözel</option>
                          <option>Dil</option>
                          <option>Belirlenmedi</option>
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
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-ink">
                          Hedef Sıralama / Hedef Okul
                          <input
                            value={formData.targetRanking}
                            onChange={(event) => updateField("targetRanking", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="Örn: İlk 20K / Fen Lisesi"
                          />
                        </label>
                        <label className="text-sm font-medium text-ink">
                          Son Deneme Neti / Puanı
                          <input
                            value={formData.currentNet}
                            onChange={(event) => updateField("currentNet", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="Örn: TYT 58 net"
                          />
                        </label>
                        <label className="text-sm font-medium text-ink sm:col-span-2">
                          Mevcut Seviye Durumu
                          <textarea
                            value={formData.currentLevel}
                            onChange={(event) => updateField("currentLevel", event.target.value)}
                            className="mt-1.5 min-h-20 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="Konu eksikleri, soru çözüm disiplini, deneme durumu vb."
                          />
                        </label>
                        <label className="text-sm font-medium text-ink sm:col-span-2">
                          Zayıf Dersler
                          <input
                            value={formData.weakLessons}
                            onChange={(event) => updateField("weakLessons", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="Örn: Matematik, Fizik"
                          />
                        </label>
                        <label className="text-sm font-medium text-ink sm:col-span-2">
                          Güçlü Dersler (Opsiyonel)
                          <input
                            value={formData.strongLessons}
                            onChange={(event) => updateField("strongLessons", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="Örn: Türkçe, Biyoloji"
                          />
                        </label>
                        <label className="text-sm font-medium text-ink">
                          İhtiyaç Türü
                          <select
                            value={formData.needType}
                            onChange={(event) => updateField("needType", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          >
                            <option value="">Seç</option>
                            <option>Tek ders takviyesi</option>
                            <option>Çoklu ders planı</option>
                            <option>Koçluk + ders</option>
                            <option>Sıfırdan başlangıç</option>
                          </select>
                        </label>
                        <label className="text-sm font-medium text-ink">
                          Çalışma Durumu
                          <select
                            value={formData.studyStatus}
                            onChange={(event) => updateField("studyStatus", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                          >
                            <option value="">Seç</option>
                            <option>Düzenli</option>
                            <option>Düzensiz</option>
                            <option>Yeni başlıyor</option>
                          </select>
                        </label>
                        <label className="text-sm font-medium text-ink sm:col-span-2">
                          Haftalık Çalışma Süresi
                          <input
                            value={formData.weeklyStudyHours}
                            onChange={(event) => updateField("weeklyStudyHours", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="Örn: 10-12 saat"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-line bg-soft p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Seçilen paket</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{packageName}</p>
                        <p className="mt-2 text-xs text-muted">Form tamamlanınca ödeme linkine yönlendirme butonu açılır.</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-ink">
                          Veli Telefon (Opsiyonel)
                          <input
                            value={formData.parentPhone}
                            onChange={(event) => updateField("parentPhone", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="05xx xxx xx xx"
                          />
                        </label>
                        <label className="text-sm font-medium text-ink">
                          Veli E-posta (Opsiyonel)
                          <input
                            value={formData.parentEmail}
                            onChange={(event) => updateField("parentEmail", event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="veli@mail.com"
                            autoComplete="email"
                          />
                        </label>
                        <label className="text-sm font-medium text-ink sm:col-span-2">
                          Ek Not (Opsiyonel)
                          <textarea
                            value={formData.notes}
                            onChange={(event) => updateField("notes", event.target.value)}
                            className="mt-1.5 min-h-20 w-full rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                            placeholder="Özel durum, ulaşım saatleri, beklentiler..."
                          />
                        </label>
                      </div>

                      <label className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={formData.paymentConsent}
                          onChange={(event) => updateField("paymentConsent", event.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-brand"
                        />
                        <span>Girilen bilgilerin doğru olduğunu, form sonrası ödeme adımına geçeceğimi kabul ediyorum.</span>
                      </label>

                      <label className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={formData.kvkkConsent}
                          onChange={(event) => updateField("kvkkConsent", event.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-brand"
                        />
                        <span>
                          <Link href="/kvkk/" target="_blank" className="font-semibold text-brand underline">
                            KVKK Aydınlatma Metni
                          </Link>{" "}
                          ve kişisel veri işleme bilgilendirmesini okudum, onaylıyorum.
                        </span>
                      </label>
                    </div>
                  ) : null}

                  {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={step === 1 || isSubmitting}
                      className="inline-flex rounded-full border border-line-strong px-5 py-2.5 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Geri
                    </button>

                    {step < totalSteps ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={isSubmitting}
                        className="inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
                      >
                        Devam Et
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex rounded-full bg-brand px-5 py-2.5 text-xs font-semibold text-white"
                      >
                        {isSubmitting ? "Kaydediliyor..." : "Bilgileri Kaydet ve Ödemeye Geç"}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </Container>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
