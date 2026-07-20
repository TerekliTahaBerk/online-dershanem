import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock3 } from "lucide-react";
import { requireProductRole } from "@/lib/auth/guards";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkPanelNav } from "@/components/odk/odk-panel-nav";

export const dynamic = "force-dynamic";
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function OdkStudentExamsPage() {
  const session = await requireProductRole("ODK", "STUDENT");
  const exams = await listStudentExams(session.userId);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" nav={<OdkPanelNav role={session.role} />}>
    <header><p className="text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]">Denemelerim</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[var(--site-ink)]">Sıradaki matematik denemene hazırlan.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-body)]">Başlama saatini, Meet katılımını ve devam eden sınavlarını buradan yönetebilirsin.</p></header>
    <section className="mt-8 space-y-3">{exams.length === 0 ? <div className="rounded-3xl border border-dashed border-[var(--site-border)] bg-white p-8 text-center text-sm text-[var(--site-muted)]">Henüz yayınlanmış bir denemen yok.</div> : exams.map((exam) => { const attempt = exam.attempts[0]; const live = exam.startsAt && exam.endsAt && exam.serverNow >= exam.startsAt && exam.serverNow < exam.endsAt; const complete = attempt && attempt.status !== "IN_PROGRESS"; return <Link key={exam.id} href={`/panel/odk/ogrenci/denemeler/${exam.id}`} className="flex flex-col gap-4 rounded-3xl border border-[var(--site-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${complete ? "bg-emerald-50 text-emerald-700" : live ? "bg-red-50 text-red-700" : "bg-[var(--panel-nav-active)] text-[var(--brand-olive)]"}`}>{complete ? <CheckCircle2 size={20} /> : live ? <Clock3 size={20} /> : <CalendarClock size={20} />}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold text-[var(--site-ink)]">{exam.title}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{exam.family}</span></div><p className="mt-1 text-sm text-[var(--site-body)]">{exam.startsAt ? dateFormatter.format(exam.startsAt) : "Saat bekleniyor"} · {exam.currentVersion?.durationMinutes || "—"} dakika</p></div></div>
      <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-extrabold ${complete ? "bg-emerald-50 text-emerald-700" : attempt?.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700" : live ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{complete ? "Teslim edildi" : attempt?.status === "IN_PROGRESS" ? "Devam ediyor" : live ? "Giriş açık" : "Planlandı"}</span>
    </Link>; })}</section>
  </PanelShell>;
}
