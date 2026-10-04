"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, GraduationCap, Loader2, Plus, Trash2, Users } from "lucide-react";
import { authInputClass, authSubmitClass } from "@/components/auth/auth-card";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import {
  ACCOUNT_TYPE_OPTIONS,
  CLASS_LEVEL_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_TIME_OPTIONS,
  EXAM_TYPE_OPTIONS,
  FIELD_TRACK_OPTIONS,
  HEARD_FROM_OPTIONS,
  PRODUCT_INTEREST_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  RELATIONSHIP_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
  examNeedsFieldTrack,
  type AccountType,
  type InterestProduct,
} from "@/lib/account/dictionaries";
import {
  MAX_CHILDREN_PER_SIGNUP,
  childSchema,
  consentStepSchema,
  firstIssueMessage,
  guardianSchema,
  interestStepSchema,
  personalStepSchema,
  studentEducationSchema,
} from "@/lib/auth/register-schema";

/**
 * Çok adımlı kayıt formu (Öğrenci / Veli).
 *
 * Her adım `lib/auth/register-schema.ts` içindeki parça şemayla client'ta
 * doğrulanır; bu yalnızca kullanıcıyı boşuna bekletmemek içindir. KARAR
 * SUNUCUNUNDUR — API aynı şemanın birleşimini yeniden parse eder.
 */

type Child = {
  fullName: string;
  classLevel: string;
  schoolName: string;
  examType: string;
  fieldTrack: string;
  birthYear: string;
  email: string;
  phone: string;
};

const emptyChild = (): Child => ({
  fullName: "",
  classLevel: "",
  schoolName: "",
  examType: "",
  fieldTrack: "",
  birthYear: "",
  email: "",
  phone: "",
});

const STEP_TITLES = ["Hesap türü", "Kişisel bilgiler", "Eğitim bilgileri", "İlgi ve iletişim", "Onaylar"] as const;

const labelClass = "text-[12.5px] font-semibold text-dc-ink";
const hintClass = "text-[12px] text-dc-ink-faint";
const selectClass = authInputClass;

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

function toggle<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function RegisterForm() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [accountType, setAccountType] = useState<AccountType | null>(null);

  // Adım 2 — kişisel
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [relationship, setRelationship] = useState("");

  // Adım 3 — öğrenci
  const [birthDate, setBirthDate] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [examType, setExamType] = useState("");
  const [fieldTrack, setFieldTrack] = useState("");
  const [targetRank, setTargetRank] = useState("");
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [weeklyStudyHours, setWeeklyStudyHours] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");

  // Adım 3 — veli
  const [children, setChildren] = useState<Child[]>([emptyChild()]);

  // Adım 4 — ilgi
  const [interestedProducts, setInterestedProducts] = useState<InterestProduct[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState("WANTS_TO_PURCHASE");
  const [existingOrderRef, setExistingOrderRef] = useState("");
  const [preferredChannel, setPreferredChannel] = useState("PHONE");
  const [preferredContactTime, setPreferredContactTime] = useState("ANY");
  const [heardFrom, setHeardFrom] = useState("");
  const [note, setNote] = useState("");

  // Adım 5 — onaylar
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => setReady(true), []);

  const isParent = accountType === "PARENT";

  function personalPayload() {
    return { fullName, email, phone, password, city, district };
  }
  function studentPayload() {
    return {
      birthDate,
      classLevel,
      schoolName,
      schoolType: schoolType || null,
      examType,
      fieldTrack: examNeedsFieldTrack(examType) ? fieldTrack || null : null,
      targetRank,
      weakSubjects,
      weeklyStudyHours,
      guardianName,
      guardianPhone,
      guardianEmail,
    };
  }
  function childrenPayload() {
    return children.map((child) => ({
      ...child,
      fieldTrack: examNeedsFieldTrack(child.examType) ? child.fieldTrack || null : null,
    }));
  }
  function interestPayload() {
    return {
      interestedProducts,
      purchaseStatus,
      existingOrderRef,
      preferredChannel,
      preferredContactTime,
      heardFrom: heardFrom || null,
      note,
    };
  }

  /** Mevcut adımı doğrular; hata varsa mesajı döner. */
  function validateStep(current: number): string | null {
    if (current === 0) return accountType ? null : "Devam etmek için hesap türünü seçin.";
    if (current === 1) {
      const parsed = personalStepSchema.safeParse(personalPayload());
      if (!parsed.success) return firstIssueMessage(parsed.error, "Ad soyad, e-posta, telefon, il ve ilçe alanlarını eksiksiz doldurun.");
      if (password.length < PASSWORD_MIN_LENGTH) return `Parola en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`;
      if (password !== passwordAgain) return "Parolalar birbiriyle aynı değil.";
      if (isParent && !relationship) return "Öğrenciye yakınlığınızı seçin.";
      return null;
    }
    if (current === 2) {
      if (isParent) {
        for (const [index, child] of childrenPayload().entries()) {
          const parsed = childSchema.safeParse(child);
          if (!parsed.success) return `${index + 1}. çocuk: ${firstIssueMessage(parsed.error, "ad soyad, sınıf ve hedef sınav zorunlu.")}`;
        }
        return null;
      }
      const education = studentEducationSchema.safeParse(studentPayload());
      if (!education.success) return firstIssueMessage(education.error, "Sınıf ve hedef sınav alanlarını seçin.");
      const guardian = guardianSchema.safeParse(studentPayload());
      if (!guardian.success) return firstIssueMessage(guardian.error, "Veli bilgilerini kontrol edin.");
      return null;
    }
    if (current === 3) {
      const parsed = interestStepSchema.safeParse(interestPayload());
      return parsed.success ? null : firstIssueMessage(parsed.error, "İlgilendiğiniz en az bir ürünü seçin.");
    }
    const parsed = consentStepSchema.safeParse({ kvkkConsent, termsConsent, marketingConsent });
    return parsed.success ? null : firstIssueMessage(parsed.error);
  }

  function next() {
    const problem = validateStep(step);
    setError(problem);
    if (!problem) setStep((value) => Math.min(value + 1, STEP_TITLES.length - 1));
  }

  function back() {
    setError(null);
    setStep((value) => Math.max(value - 1, 0));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < STEP_TITLES.length - 1) {
      next();
      return;
    }
    for (let index = 0; index < STEP_TITLES.length; index += 1) {
      const problem = validateStep(index);
      if (problem) {
        setStep(index);
        setError(problem);
        return;
      }
    }

    setError(null);
    setPending(true);
    const body = {
      accountType,
      ...personalPayload(),
      ...interestPayload(),
      kvkkConsent,
      termsConsent,
      marketingConsent,
      ...(isParent ? { relationship, children: childrenPayload() } : studentPayload()),
    };
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { redirect?: string; error?: string };

      if (!response.ok || !data.redirect) {
        setError(data.error ?? "Kayıt tamamlanamadı. Lütfen tekrar deneyin.");
        setPending(false);
        return;
      }

      // Oturum çerezi ilk panel isteğinde kesin ulaşsın diye tam sayfa geçişi.
      window.location.replace(data.redirect);
    } catch {
      setError("Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.");
      setPending(false);
    }
  }

  function updateChild(index: number, patch: Partial<Child>) {
    setChildren((list) => list.map((child, i) => (i === index ? { ...child, ...patch } : child)));
  }

  const isLast = step === STEP_TITLES.length - 1;
  const stepTitle = step === 2 && isParent ? "Çocuk bilgileri" : STEP_TITLES[step];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <div className="flex items-center justify-between text-[12.5px] font-semibold text-dc-ink-muted">
          <span>
            Adım {step + 1} / {STEP_TITLES.length}
          </span>
          <span>{stepTitle}</span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-dc-line"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEP_TITLES.length}
          aria-valuenow={step + 1}
          aria-label="Kayıt adımı"
        >
          <div
            className="h-full rounded-full bg-dc-brand-strong transition-[width]"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>
      </div>

      <fieldset disabled={pending} className="flex flex-col gap-4">
        <legend className="sr-only">{stepTitle}</legend>

        {step === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ACCOUNT_TYPE_OPTIONS.map((option) => {
              const selected = accountType === option.value;
              const Icon = option.value === "PARENT" ? Users : GraduationCap;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setAccountType(option.value);
                    setError(null);
                  }}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
                    selected ? "border-dc-brand-strong bg-white ring-2 ring-dc-brand-strong" : "border-[#DDE4E0] bg-white hover:border-dc-brand-strong"
                  }`}
                >
                  <Icon size={22} aria-hidden="true" className="text-dc-brand-strong" />
                  <span className="text-[15px] font-bold text-dc-ink">{option.label}</span>
                  <span className="text-[12.5px] leading-[1.5] text-dc-ink-muted">
                    {option.value === "PARENT"
                      ? "Çocuğunuz için paket alabilir, gelişimini takip edersiniz. Çocuğunuzun hesabını biz açarız."
                      : "Kendi hesabınla paket alabilir, derslerini ve denemelerini takip edersin."}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === 1 ? (
          <>
            <Field id="fullName" label="Ad soyad">
              <input id="fullName" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={authInputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label="E-posta">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authInputClass}
                />
              </Field>
              <Field id="phone" label="Cep telefonu" hint="Size bu numaradan ulaşacağız.">
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="5xx xxx xx xx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={authInputClass}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="new-password" label="Parola" hint={`En az ${PASSWORD_MIN_LENGTH} karakter.`}>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={authInputClass}
                />
              </Field>
              <Field id="password-again" label="Parola (tekrar)">
                <input
                  id="password-again"
                  type="password"
                  autoComplete="new-password"
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                  className={authInputClass}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" label="İl">
                <input id="city" type="text" autoComplete="address-level1" value={city} onChange={(e) => setCity(e.target.value)} className={authInputClass} />
              </Field>
              <Field id="district" label="İlçe">
                <input
                  id="district"
                  type="text"
                  autoComplete="address-level2"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={authInputClass}
                />
              </Field>
            </div>
            {isParent ? (
              <Field id="relationship" label="Öğrenciye yakınlığınız">
                <select id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} className={selectClass}>
                  <option value="">Seçin</option>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </>
        ) : null}

        {step === 2 && !isParent ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="classLevel" label="Sınıf">
                <select id="classLevel" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className={selectClass}>
                  <option value="">Seçin</option>
                  {CLASS_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="examType" label="Hedef sınav">
                <select id="examType" value={examType} onChange={(e) => setExamType(e.target.value)} className={selectClass}>
                  <option value="">Seçin</option>
                  {EXAM_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {examNeedsFieldTrack(examType) ? (
              <Field id="fieldTrack" label="Alan">
                <select id="fieldTrack" value={fieldTrack} onChange={(e) => setFieldTrack(e.target.value)} className={selectClass}>
                  <option value="">Seçin (isteğe bağlı)</option>
                  {FIELD_TRACK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="schoolName" label="Okul adı" hint="İsteğe bağlı">
                <input id="schoolName" type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className={authInputClass} />
              </Field>
              <Field id="schoolType" label="Okul türü" hint="İsteğe bağlı">
                <select id="schoolType" value={schoolType} onChange={(e) => setSchoolType(e.target.value)} className={selectClass}>
                  <option value="">Seçin</option>
                  {SCHOOL_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="birthDate" label="Doğum tarihi" hint="İsteğe bağlı">
                <input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={authInputClass} />
              </Field>
              <Field id="targetRank" label="Hedef sıralama" hint="İsteğe bağlı">
                <input
                  id="targetRank"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={targetRank}
                  onChange={(e) => setTargetRank(e.target.value)}
                  className={authInputClass}
                />
              </Field>
              <Field id="weeklyStudyHours" label="Haftalık çalışma (saat)" hint="İsteğe bağlı">
                <input
                  id="weeklyStudyHours"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={weeklyStudyHours}
                  onChange={(e) => setWeeklyStudyHours(e.target.value)}
                  className={authInputClass}
                />
              </Field>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className={labelClass}>Zorlandığın dersler (isteğe bağlı)</legend>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_OPTIONS.map((option) => {
                  const selected = weakSubjects.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setWeakSubjects((list) => toggle(list, option.value))}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                        selected ? "border-dc-brand-strong bg-dc-brand-strong text-white" : "border-[#DDE4E0] bg-white text-dc-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="rounded-xl border border-dc-line bg-white p-4">
              <p className="text-[13.5px] font-bold text-dc-ink">Veli bilgisi</p>
              <p className="mt-1 text-[12.5px] text-dc-ink-muted">
                İsteğe bağlı. Velinin de paneli takip edebilmesi için hesabını biz bağlarız.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field id="guardianName" label="Ad soyad">
                  <input id="guardianName" type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className={authInputClass} />
                </Field>
                <Field id="guardianPhone" label="Telefon">
                  <input
                    id="guardianPhone"
                    type="tel"
                    inputMode="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className={authInputClass}
                  />
                </Field>
                <Field id="guardianEmail" label="E-posta">
                  <input
                    id="guardianEmail"
                    type="email"
                    inputMode="email"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                    className={authInputClass}
                  />
                </Field>
              </div>
            </div>
          </>
        ) : null}

        {step === 2 && isParent ? (
          <>
            <p className="text-[13px] leading-[1.6] text-dc-ink-muted">
              Çocuğunuzun öğrenci hesabını, sizinle iletişime geçtikten sonra biz açar ve hesabınıza bağlarız.
            </p>
            {children.map((child, index) => (
              <div key={index} className="rounded-xl border border-dc-line bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-bold text-dc-ink">{index + 1}. çocuk</p>
                  {children.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setChildren((list) => list.filter((_, i) => i !== index))}
                      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose-700"
                    >
                      <Trash2 size={14} aria-hidden="true" /> Kaldır
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-col gap-4">
                  <Field id={`child-${index}-name`} label="Ad soyad">
                    <input
                      id={`child-${index}-name`}
                      type="text"
                      value={child.fullName}
                      onChange={(e) => updateChild(index, { fullName: e.target.value })}
                      className={authInputClass}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`child-${index}-class`} label="Sınıf">
                      <select
                        id={`child-${index}-class`}
                        value={child.classLevel}
                        onChange={(e) => updateChild(index, { classLevel: e.target.value })}
                        className={selectClass}
                      >
                        <option value="">Seçin</option>
                        {CLASS_LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field id={`child-${index}-exam`} label="Hedef sınav">
                      <select
                        id={`child-${index}-exam`}
                        value={child.examType}
                        onChange={(e) => updateChild(index, { examType: e.target.value })}
                        className={selectClass}
                      >
                        <option value="">Seçin</option>
                        {EXAM_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {examNeedsFieldTrack(child.examType) ? (
                    <Field id={`child-${index}-field`} label="Alan">
                      <select
                        id={`child-${index}-field`}
                        value={child.fieldTrack}
                        onChange={(e) => updateChild(index, { fieldTrack: e.target.value })}
                        className={selectClass}
                      >
                        <option value="">Seçin (isteğe bağlı)</option>
                        {FIELD_TRACK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`child-${index}-school`} label="Okul" hint="İsteğe bağlı">
                      <input
                        id={`child-${index}-school`}
                        type="text"
                        value={child.schoolName}
                        onChange={(e) => updateChild(index, { schoolName: e.target.value })}
                        className={authInputClass}
                      />
                    </Field>
                    <Field id={`child-${index}-birth`} label="Doğum yılı" hint="İsteğe bağlı">
                      <input
                        id={`child-${index}-birth`}
                        type="number"
                        inputMode="numeric"
                        value={child.birthYear}
                        onChange={(e) => updateChild(index, { birthYear: e.target.value })}
                        className={authInputClass}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`child-${index}-email`} label="Çocuğun e-postası" hint="Varsa; hesabı bu adresle açarız.">
                      <input
                        id={`child-${index}-email`}
                        type="email"
                        inputMode="email"
                        value={child.email}
                        onChange={(e) => updateChild(index, { email: e.target.value })}
                        className={authInputClass}
                      />
                    </Field>
                    <Field id={`child-${index}-phone`} label="Çocuğun telefonu" hint="İsteğe bağlı">
                      <input
                        id={`child-${index}-phone`}
                        type="tel"
                        inputMode="tel"
                        value={child.phone}
                        onChange={(e) => updateChild(index, { phone: e.target.value })}
                        className={authInputClass}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
            {children.length < MAX_CHILDREN_PER_SIGNUP ? (
              <button
                type="button"
                onClick={() => setChildren((list) => [...list, emptyChild()])}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-dc-brand-strong p-3 text-[14px] font-semibold text-dc-brand-strong"
              >
                <Plus size={16} aria-hidden="true" /> Başka çocuk ekle
              </button>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className={labelClass}>İlgilendiğiniz ürünler</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PRODUCT_INTEREST_OPTIONS.map((option) => {
                  const selected = interestedProducts.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setInterestedProducts((list) => toggle(list, option.value))}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                        selected ? "border-dc-brand-strong bg-white ring-2 ring-dc-brand-strong" : "border-[#DDE4E0] bg-white"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-dc-ink">
                        {selected ? <Check size={14} aria-hidden="true" className="text-dc-brand-strong" /> : null}
                        {option.label}
                      </span>
                      <span className="text-[12px] text-dc-ink-muted">{option.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className={labelClass}>Satın alım durumu</legend>
              {PURCHASE_STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2.5 text-[14px] text-dc-ink">
                  <input
                    type="radio"
                    name="purchaseStatus"
                    value={option.value}
                    checked={purchaseStatus === option.value}
                    onChange={() => setPurchaseStatus(option.value)}
                    className="h-4 w-4 accent-[var(--dc-brand-strong,#1f7a55)]"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            {purchaseStatus === "ALREADY_PURCHASED" ? (
              <Field id="existingOrderRef" label="Sipariş numarası ya da ödemede kullandığınız e-posta" hint="Sizi hızlıca eşleştirmemiz için.">
                <input
                  id="existingOrderRef"
                  type="text"
                  value={existingOrderRef}
                  onChange={(e) => setExistingOrderRef(e.target.value)}
                  className={authInputClass}
                />
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="preferredChannel" label="Size nasıl ulaşalım?">
                <select id="preferredChannel" value={preferredChannel} onChange={(e) => setPreferredChannel(e.target.value)} className={selectClass}>
                  {CONTACT_CHANNEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="preferredContactTime" label="Uygun saat">
                <select
                  id="preferredContactTime"
                  value={preferredContactTime}
                  onChange={(e) => setPreferredContactTime(e.target.value)}
                  className={selectClass}
                >
                  {CONTACT_TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field id="heardFrom" label="Bizi nereden duydunuz?" hint="İsteğe bağlı">
              <select id="heardFrom" value={heardFrom} onChange={(e) => setHeardFrom(e.target.value)} className={selectClass}>
                <option value="">Seçin</option>
                {HEARD_FROM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="note" label="Eklemek istedikleriniz" hint="İsteğe bağlı, en fazla 500 karakter.">
              <textarea id="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={authInputClass} />
            </Field>
          </>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dc-line bg-white p-4 text-[13.5px] leading-[1.6] text-dc-ink">
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={kvkkConsent} onChange={(e) => setKvkkConsent(e.target.checked)} className="mt-1 h-4 w-4" />
              <span>
                <Link href="/kvkk" target="_blank" className="font-semibold text-dc-brand-strong underline">
                  KVKK aydınlatma metnini
                </Link>{" "}
                okudum, kişisel verilerimin hesabımın açılması ve benimle iletişime geçilmesi amacıyla işlenmesini kabul ediyorum.
                <span className="text-rose-700"> *</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={termsConsent} onChange={(e) => setTermsConsent(e.target.checked)} className="mt-1 h-4 w-4" />
              <span>
                <Link href="/gizlilik" target="_blank" className="font-semibold text-dc-brand-strong underline">
                  Gizlilik politikası ve kullanım koşullarını
                </Link>{" "}
                kabul ediyorum.<span className="text-rose-700"> *</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} className="mt-1 h-4 w-4" />
              <span>Kampanya ve duyurular için ticari elektronik ileti almak istiyorum. (İsteğe bağlı)</span>
            </label>
            <p className="text-[12px] text-dc-ink-faint">Kayıt olmak ürün erişimi başlatmaz; erişim paket satın alımı sonrası açılır.</p>
          </div>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            disabled={pending}
            className="mt-4 w-1/3 rounded-xl border border-[#DDE4E0] bg-white p-[15px] text-[15px] font-semibold text-dc-ink disabled:opacity-60"
          >
            Geri
          </button>
        ) : null}
        <button type="submit" disabled={!ready || pending} aria-busy={!ready || pending} className={authSubmitClass}>
          {pending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Kayıt yapılıyor
            </span>
          ) : isLast ? (
            "Kayıt Ol"
          ) : (
            "Devam et"
          )}
        </button>
      </div>
    </form>
  );
}
