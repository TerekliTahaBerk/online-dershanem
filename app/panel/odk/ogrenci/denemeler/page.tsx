import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock3, FileText } from "lucide-react";
import { requireProductRole } from "@/lib/auth/guards";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import { PanelShell } from "@/components/panel/panel-shell";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

type ExamItem = Awaited<ReturnType<typeof listStudentExams>>[number];

type ExamBucket = "ACTIVE" | "AVAILABLE" | "UPCOMING" | "RESULT" | "CLOSED";

function getBucket(exam: ExamItem): ExamBucket {
  const attempt = exam.attempts[0];
  if (attempt?.status === "IN_PROGRESS") return "ACTIVE";
  if (attempt && attempt.status !== "VOID") return "RESULT";
  if (exam.startDecision.ok) return "AVAILABLE";
  if (exam.startDecision.code === "NOT_STARTED") return "UPCOMING";
  return "CLOSED";
}

function examMeta(exam: ExamItem): string {
  const parts: string[] = [];
  if (exam.startsAt) parts.push(`Açılış: ${dateFormatter.format(exam.startsAt)}`);
  if (exam.endsAt) parts.push(`Kapanış: ${dateFormatter.format(exam.endsAt)}`);
  if (exam.currentVersion?.durationMinutes) {
    parts.push(`Süre: ${exam.currentVersion.durationMinutes} dakika`);
  }
  return parts.join(" · ");
}

function statusInfo(exam: ExamItem): {
  label: string;
  tone: string;
  actionLabel: string;
  href: string;
  icon: typeof CalendarClock;
} {
  const attempt = exam.attempts[0];
  if (attempt?.status === "IN_PROGRESS") {
    return {
      label: "Devam ediyor",
      tone: "bg-amber-50 text-amber-700",
      actionLabel: "Denemeye Devam Et",
      href: `/panel/odk/ogrenci/denemeler/${exam.id}/coz`,
      icon: Clock3,
    };
  }
  if (attempt && attempt.status !== "VOID") {
    if (exam.resultAvailable) {
      return {
        label: "Sonuç açıklandı",
        tone: "bg-emerald-50 text-emerald-700",
        actionLabel: "Sonucunu Gör",
        href: `/panel/odk/ogrenci/denemeler/${exam.id}/sonuc`,
        icon: CheckCircle2,
      };
    }
    return {
      label: "Sonuç bekleniyor",
      tone: "bg-slate-100 text-slate-700",
      actionLabel: "Detayı Gör",
      href: `/panel/odk/ogrenci/denemeler/${exam.id}`,
      icon: FileText,
    };
  }
  if (exam.startDecision.ok) {
    return {
      label: "Başlayabilirsin",
      tone: "bg-red-50 text-red-700",
      actionLabel: "Denemeyi Başlat",
      href: `/panel/odk/ogrenci/denemeler/${exam.id}`,
      icon: CalendarClock,
    };
  }
  if (exam.startDecision.code === "NOT_STARTED") {
    return {
      label: "Henüz başlamadı",
      tone: "bg-sky-50 text-sky-700",
      actionLabel: "Detayı Gör",
      href: `/panel/odk/ogrenci/denemeler/${exam.id}`,
      icon: CalendarClock,
    };
  }
  return {
    label: "Süre kapandı",
    tone: "bg-slate-100 text-slate-700",
    actionLabel: "Detayı Gör",
    href: `/panel/odk/ogrenci/denemeler/${exam.id}`,
    icon: Clock3,
  };
}

function ExamSection({
  title,
  exams,
}: {
  title: string;
  exams: ExamItem[];
}) {
  if (!exams.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-[var(--site-muted)]">
        {title}
      </h2>
      <div className="mt-3 space-y-3">
        {exams.map((exam) => {
          const info = statusInfo(exam);
          const Icon = info.icon;
          return (
            <Link
              key={exam.id}
              href={info.href}
              className="flex flex-col gap-4 rounded-3xl border border-[var(--site-line)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-4">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${info.tone}`}
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-extrabold text-[var(--site-ink)]">{exam.title}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                      {exam.family}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--site-body)]">{examMeta(exam)}</p>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
                <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-extrabold ${info.tone}`}>
                  {info.label}
                </span>
                <span className="text-xs font-bold text-[var(--brand-olive)]">{info.actionLabel}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default async function OdkStudentExamsPage() {
  const session = await requireProductRole("ODK", "STUDENT");
  const exams = await listStudentExams(session.userId);
  const activeExams = exams.filter((exam) => getBucket(exam) === "ACTIVE");
  const availableExams = exams.filter((exam) => getBucket(exam) === "AVAILABLE");
  const upcomingExams = exams.filter((exam) => getBucket(exam) === "UPCOMING");
  const resultExams = exams.filter((exam) => ["RESULT", "CLOSED"].includes(getBucket(exam)));

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]">
          Online Deneme Kulübüm
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[var(--site-ink)]">
          Denemeler
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-body)]">
          Devam eden denemeni, başlayabileceğin denemeleri, yaklaşan sınavlarını ve açıklanan
          sonuçlarını buradan yönetebilirsin.
        </p>
      </header>

      {exams.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-[var(--site-line)] bg-white p-8 text-center text-sm text-[var(--site-muted)]">
          Henüz yayınlanmış bir denemen yok.
        </section>
      ) : (
        <>
          <ExamSection title="Devam eden" exams={activeExams} />
          <ExamSection title="Başlayabileceğin denemeler" exams={availableExams} />
          <ExamSection title="Yaklaşan denemeler" exams={upcomingExams} />
          <ExamSection title="Sonuçlar" exams={resultExams} />
        </>
      )}
    </PanelShell>
  );
}
