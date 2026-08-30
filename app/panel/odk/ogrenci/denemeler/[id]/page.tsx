import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, FileText, Video } from "lucide-react";
import { requireProductRole } from "@/lib/auth/guards";
import { attemptStartError } from "@/lib/odk/attempt-domain";
import { getStudentExam } from "@/lib/odk/student-exam-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentExamStart } from "@/components/odk/student-exam-start";

export const dynamic = "force-dynamic";
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function OdkStudentExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireProductRole("ODK", "STUDENT");
  const { id } = await params;
  const data = await getStudentExam(id, session.userId);
  if (!data) notFound();
  const { exam, attempt, startDecision, resultAvailable } = data;
  const version = exam.currentVersion;
  if (!version) notFound();
  const activeAttempt = attempt?.status === "IN_PROGRESS";
  const completed = attempt && attempt.status !== "IN_PROGRESS";
  const submittedAwaitingResult = completed && !resultAvailable;
  const startWindowCopy =
    exam.startsAt && exam.endsAt
      ? `${dateFormatter.format(exam.startsAt)} · ${dateFormatter.format(exam.endsAt)}`
      : exam.startsAt
        ? `${dateFormatter.format(exam.startsAt)}`
        : "Başlama saati bekleniyor";

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
    <Link href="/panel/odk/ogrenci/denemeler" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--site-body)]"><ArrowLeft size={15} /> Denemeler</Link>
    <header className="mt-6"><p className="text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]">Online Deneme Kulübüm</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[var(--site-ink)]">{exam.title}</h1><p className="mt-3 text-sm text-[var(--site-body)]">{startWindowCopy}</p></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-3">{[{ icon: Clock3, label: "Süre", value: `${version.durationMinutes} dakika` }, { icon: FileText, label: "Soru", value: `${version.sections.reduce((sum, section) => sum + section.questions.length, 0)} matematik sorusu` }, { icon: Video, label: "Gözetim", value: exam.meetRequired ? "Meet zorunlu" : "Meet gerekmiyor" }].map(({ icon: Icon, label, value }) => <article key={label} className="panel-metric-card"><Icon size={18} className="text-[var(--brand-olive)]" /><p className="mt-3 font-extrabold text-[var(--site-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--site-muted)]">{label}</p></article>)}</section>
    <section className="mt-6 max-w-2xl">{completed ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><h2 className="font-extrabold text-emerald-900">{submittedAwaitingResult ? "Denemen tamamlandı." : "Denemen teslim edildi."}</h2><p className="mt-2 text-sm leading-6 text-emerald-800">{resultAvailable ? "Sonucun ve kazanım analizin açıklandı." : "Sonucun açıklandığında burada görebileceksin."}</p>{resultAvailable ? <Link href={`/panel/odk/ogrenci/denemeler/${exam.id}/sonuc`} className="mt-4 inline-flex rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-extrabold text-white">Sonucunu Gör</Link> : <p className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700">Sonuç bekleniyor</p>}</div> : <StudentExamStart examId={exam.id} meetRequired={exam.meetRequired} meetUrl={exam.meetUrl} canStart={startDecision.ok} startError={startDecision.ok ? null : attemptStartError[startDecision.code]} activeAttempt={activeAttempt} />}</section>
  </PanelShell>;
}
