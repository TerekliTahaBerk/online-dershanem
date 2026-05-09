"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  LineChart,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

type OnboardingFlowProps = {
  firstName: string | null;
};

type Question =
  | {
      key: keyof Answers;
      kind: "single";
      title: string;
      hint?: string;
      options: { value: string; label: string }[];
      required?: boolean;
    }
  | {
      key: keyof Answers;
      kind: "text";
      title: string;
      hint?: string;
      placeholder: string;
      required?: boolean;
    };

type Answers = {
  classLevel: string;
  examType: string;
  city: string;
  schoolName: string;
  targetSchool: string;
  weeklyStudyHours: string;
  needType: string;
  source: string;
};

const QUESTIONS: Question[] = [
  {
    key: "classLevel",
    kind: "single",
    title: "Hangi sınıftasın?",
    hint: "Sana uygun içerik ve plan hazırlayabilmemiz için.",
    required: true,
    options: [
      { value: "8", label: "8. sınıf (LGS)" },
      { value: "9", label: "9. sınıf" },
      { value: "10", label: "10. sınıf" },
      { value: "11", label: "11. sınıf" },
      { value: "12", label: "12. sınıf" },
      { value: "mezun", label: "Mezun" },
    ],
  },
  {
    key: "examType",
    kind: "single",
    title: "Hangi sınava hazırlanıyorsun?",
    hint: "Birden fazla seçenek varsa ana hedefini seç.",
    required: true,
    options: [
      { value: "LGS", label: "LGS" },
      { value: "TYT", label: "TYT" },
      { value: "AYT-Sayısal", label: "AYT — Sayısal" },
      { value: "AYT-Eşit Ağırlık", label: "AYT — Eşit Ağırlık" },
      { value: "AYT-Sözel", label: "AYT — Sözel" },
      { value: "Dil", label: "YDT (Dil)" },
    ],
  },
  {
    key: "city",
    kind: "text",
    title: "Hangi şehirdesin?",
    hint: "Lokal etkinlikler ve kampüs ziyaretleri için.",
    placeholder: "Örn. İstanbul",
  },
  {
    key: "schoolName",
    kind: "text",
    title: "Okulun?",
    hint: "Devam ettiğin liseyi yazabilirsin.",
    placeholder: "Örn. Galatasaray Lisesi",
  },
  {
    key: "targetSchool",
    kind: "text",
    title: "Hedef üniversiten / bölümün?",
    hint: "Henüz netleşmediyse boş bırakabilirsin.",
    placeholder: "Örn. Boğaziçi Üniversitesi — Bilgisayar Müh.",
  },
  {
    key: "weeklyStudyHours",
    kind: "single",
    title: "Haftada ortalama kaç saat çalışıyorsun?",
    options: [
      { value: "0-5", label: "0–5 saat" },
      { value: "6-10", label: "6–10 saat" },
      { value: "11-20", label: "11–20 saat" },
      { value: "21-30", label: "21–30 saat" },
      { value: "30+", label: "30+ saat" },
    ],
  },
  {
    key: "needType",
    kind: "single",
    title: "Sana en çok ne lazım?",
    hint: "İlk önceliğini seç.",
    options: [
      { value: "Konu Anlatımı", label: "Konu anlatımı" },
      { value: "Soru Çözümü", label: "Soru çözümü" },
      { value: "Birebir Özel Ders", label: "Birebir özel ders" },
      { value: "Deneme + Analiz", label: "Deneme + analiz" },
      { value: "Çalışma Programı", label: "Çalışma programı" },
    ],
  },
  {
    key: "source",
    kind: "single",
    title: "Bizi nereden duydun?",
    options: [
      { value: "Google", label: "Google" },
      { value: "Instagram", label: "Instagram" },
      { value: "TikTok", label: "TikTok" },
      { value: "YouTube", label: "YouTube" },
      { value: "Arkadaş Tavsiyesi", label: "Arkadaş tavsiyesi" },
      { value: "Öğretmen Tavsiyesi", label: "Öğretmen tavsiyesi" },
      { value: "Diğer", label: "Diğer" },
    ],
  },
];

type IntroSlide = {
  icon: typeof Sparkles;
  title: string;
  description: string;
};

const INTRO_SLIDES: IntroSlide[] = [
  {
    icon: Sparkles,
    title: "Online Dershanem'e hoş geldin.",
    description:
      "Sana özel hazırlanmış küçük gruplar, canlı dersler ve haftalık takiple sınava hazırlan.",
  },
  {
    icon: BookOpenText,
    title: "Konu, soru ve denemeler tek yerde.",
    description:
      "Her konu için video anlatım, soru bankası ve deneme analizi paneline işlenir.",
  },
  {
    icon: CalendarClock,
    title: "Haftalık planın hep elinin altında.",
    description:
      "Dersler, ödevler ve denemeler takvimine düşer; günü kaçırmazsın.",
  },
  {
    icon: LineChart,
    title: "İlerleyişini gerçek zamanlı gör.",
    description:
      "Net gelişimin, eksik konuların ve güçlü yönlerin grafiklerle netleşir.",
  },
];

const TOTAL_STEPS = INTRO_SLIDES.length + QUESTIONS.length;

export function OnboardingFlow({ firstName }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    classLevel: "",
    examType: "",
    city: "",
    schoolName: "",
    targetSchool: "",
    weeklyStudyHours: "",
    needType: "",
    source: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIntro = step < INTRO_SLIDES.length;
  const questionIndex = step - INTRO_SLIDES.length;
  const currentQuestion = isIntro ? null : QUESTIONS[questionIndex];
  const isLastStep = step === TOTAL_STEPS - 1;

  const canProceed = useMemo(() => {
    if (!currentQuestion) return true;
    if (!currentQuestion.required) return true;
    return Boolean(answers[currentQuestion.key]?.trim());
  }, [currentQuestion, answers]);

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const goNext = async () => {
    setError(null);
    if (!canProceed) {
      setError("Bu soru zorunlu, lütfen bir seçim yap.");
      return;
    }
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }

    // Submit
    setSubmitting(true);
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classLevel: answers.classLevel,
        examType: answers.examType,
        city: answers.city || null,
        schoolName: answers.schoolName || null,
        targetSchool: answers.targetSchool || null,
        weeklyStudyHours: answers.weeklyStudyHours || null,
        needType: answers.needType || null,
        source: answers.source || null,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Kaydedilemedi, tekrar dene.");
      return;
    }
    router.push("/panel");
  };

  const updateAnswer = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#0E0E10] text-white">
      {/* Top spacer / breathing room */}
      <div className="h-10" />

      {/* Centered content */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8">
        {isIntro ? (
          <IntroSlideView
            slide={INTRO_SLIDES[step]}
            firstName={step === 0 ? firstName : null}
          />
        ) : currentQuestion ? (
          <QuestionView
            question={currentQuestion}
            value={answers[currentQuestion.key]}
            onChange={(v) => updateAnswer(currentQuestion.key, v)}
          />
        ) : null}

        {error ? (
          <p className="mt-6 rounded-lg bg-[#3A1F22] px-3 py-2 text-[13px] font-medium text-[#F5A8A8]">
            {error}
          </p>
        ) : null}
      </div>

      {/* Footer: nav + dots */}
      <footer className="sticky bottom-0 border-t border-[#1B1B1E] bg-[#0E0E10]/90 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || submitting}
            aria-label="Geri"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B1B1E] text-white transition hover:bg-[#26262A] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <ProgressDots total={TOTAL_STEPS} current={step} />

          {isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={submitting || !canProceed}
              className="inline-flex items-center justify-center rounded-xl bg-[#22A06B] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(34,160,107,0.55)] transition hover:bg-[#1E8C5C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Kaydediliyor…" : "Başla"}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={submitting || (!isIntro && !canProceed)}
              aria-label="İleri"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#22A06B] text-white shadow-[0_8px_24px_-12px_rgba(34,160,107,0.55)] transition hover:bg-[#1E8C5C] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

/* ─── Sub-views ──────────────────────────────────────────────────────── */

function IntroSlideView({
  slide,
  firstName,
}: {
  slide: IntroSlide;
  firstName: string | null;
}) {
  const Icon = slide.icon;
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/logo.png"
        alt="Online Dershanem"
        width={72}
        height={72}
        priority
        className="h-14 w-14 object-contain opacity-95"
      />
      <h1 className="mt-7 max-w-xl font-serif text-[32px] font-semibold leading-tight tracking-tight text-white sm:text-[38px]">
        {firstName ? slide.title.replace(/^Online/, `${firstName}, Online`) : slide.title}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#9A9AA0]">
        {slide.description}
      </p>
      <div className="mt-12 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1B1B1E] text-[#22A06B]">
        <Icon className="h-9 w-9" />
      </div>
    </div>
  );
}

function QuestionView({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-full max-w-2xl">
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#15321F] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7BD8A6]">
          <ClipboardList className="h-3 w-3" />
          Hızlı tanışma
        </span>
        <h1 className="mt-4 font-serif text-[28px] font-semibold leading-tight tracking-tight text-white sm:text-[34px]">
          {question.title}
        </h1>
        {question.hint ? (
          <p className="mt-2 text-[14px] leading-6 text-[#9A9AA0]">{question.hint}</p>
        ) : null}
      </header>

      {question.kind === "single" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`group flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[14.5px] font-medium transition ${
                  selected
                    ? "border-transparent bg-[#22A06B] text-white shadow-[0_8px_24px_-14px_rgba(34,160,107,0.6)]"
                    : "border-[#26262A] bg-[#1B1B1E] text-white hover:border-[#3A3A40] hover:bg-[#202024]"
                }`}
              >
                <span>{opt.label}</span>
                <RadioMark selected={selected} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto max-w-xl">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full rounded-xl border border-transparent bg-[#1B1B1E] px-4 py-4 text-[15px] text-white placeholder:text-[#7A7A80] outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]"
            autoFocus
          />
          <p className="mt-3 text-center text-[12px] text-[#7A7A80]">
            İstemiyorsan boş bırakıp ilerleyebilirsin.
          </p>
        </div>
      )}
    </div>
  );
}

function RadioMark({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white">
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="inline-block h-5 w-5 rounded-full border border-[#3A3A40] transition group-hover:border-[#5A5A60]" />
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const reached = i <= current;
        return (
          <span
            key={i}
            className={`h-[3px] w-6 rounded-full transition ${
              reached ? "bg-[#22A06B]" : "bg-[#26262A]"
            }`}
          />
        );
      })}
    </div>
  );
}

/* Suppress unused-import warnings in case we extend slides later. */
void GraduationCap;
void Target;
