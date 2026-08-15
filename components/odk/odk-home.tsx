import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { Activity, ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, LineChart, Rocket, ShieldCheck, UsersRound } from "lucide-react";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/panel-page-header";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { prisma } from "@/lib/prisma";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import { getOdkAudienceStudentReport, listOdkReportStudents } from "@/lib/odk/reporting-server";
import { getOdkPilotReadiness } from "@/lib/odk/pilot-readiness-server";
import { examStatusPresentation } from "@/lib/odk/presentation";

const COPY = {
  ADMIN: { eyebrow: "ODK yönetimi", title: "Deneme gününü güvenle yönetin.", body: "Hazırlık, canlı operasyon, puanlama ve pilot kapıları tek çalışma alanında." },
  TEACHER: { eyebrow: "ODK öğretmen", title: "Denemeden öğrenme kararına geçin.", body: "Sorumlu olduğunuz öğrencilerin açıklanmış sonuçlarını ve tekrar eden gelişim alanlarını izleyin." },
  STUDENT: { eyebrow: "ODK öğrenci", title: "Sıradaki matematik denemene hazırlan.", body: "Başlama saatin, devam eden oturumun ve açıklanan sonuçların burada." },
  PARENT: { eyebrow: "ODK veli", title: "Gelişimi sakin ve anlaşılır biçimde izleyin.", body: "Bağlı öğrencinizin açıklanmış sonuçlarını yalnız kendi önceki denemeleriyle karşılaştırın." },
} as const;

const dateTime = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

function MetricCard({ icon: Icon, label, value, tone = "mint" }: { icon: typeof CalendarClock; label: string; value: string | number; tone?: "mint" | "sky" | "yellow" | "lavender" }) {
  return <article className="panel-metric-card"><span className={`panel-metric-icon panel-tone-${tone}`}><Icon size={18} aria-hidden="true" /></span><p className="mt-4 text-2xl font-black tracking-[-.03em] text-[var(--site-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--site-muted)]">{label}</p></article>;
}

function PrimaryCard({ eyebrow, title, copy, href, action, badge }: { eyebrow: string; title: string; copy: string; href: string; action: string; badge?: React.ReactNode }) {
  return <section className="panel-surface mt-7 p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.09em] text-[var(--brand-olive)]">{eyebrow}</p>{badge}</div><h2 className="mt-2 text-xl font-semibold tracking-[-.035em] text-[var(--site-ink)]">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--site-body)]">{copy}</p></div><Link href={href} className="panel-quick-action panel-quick-action-primary shrink-0">{action}<ArrowRight size={14} aria-hidden="true" /></Link></div></section>;
}

async function AdminHome() {
  const now = new Date();
  const [nextExam, preparationCount, activeAttempts, awaitingScore, pilotRun] = await Promise.all([
    prisma.odkExam.findFirst({ where: { status: { in: ["SCHEDULED", "LIVE"] } }, orderBy: [{ startsAt: "asc" }], select: { id: true, title: true, status: true, startsAt: true, family: true } }),
    prisma.odkExam.count({ where: { status: { in: ["DRAFT", "READY"] } } }),
    prisma.odkExamAttempt.count({ where: { status: "IN_PROGRESS", deadlineAt: { gt: now } } }),
    prisma.odkExam.count({ where: { OR: [{ status: "ENDED" }, { status: { in: ["SCHEDULED", "LIVE"] }, endsAt: { lte: now } }] } }),
    prisma.odkPilotRun.findFirst({ where: { status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } }, orderBy: { updatedAt: "desc" }, select: { status: true, startedAt: true, members: { select: { role: true, userId: true } } } }),
  ]);
  const readiness = await getOdkPilotReadiness(pilotRun?.members || [{ role: "ADMIN" }], pilotRun?.startedAt);
  const blocked = readiness.checks.filter((check) => check.status === "BLOCK").length;
  const status = nextExam ? examStatusPresentation[nextExam.status] : null;
  return <><PrimaryCard eyebrow="Sıradaki operasyon" title={nextExam?.title || "İlk matematik denemesini hazırlayın"} copy={nextExam ? `${nextExam.family} · ${nextExam.startsAt ? dateTime.format(nextExam.startsAt) : "Saat bekleniyor"}` : "Soru kitapçığı, cevap anahtarı ve kazanım eşlemesini tamamlayarak başlayın."} href={nextExam ? `/panel/odk/yonetim/sinavlar/${nextExam.id}` : "/panel/odk/yonetim/sinavlar"} action={nextExam ? "Denemeyi aç" : "Deneme oluştur"} badge={status ? <OdkStatusBadge label={status.label} tone={status.tone} pulse={nextExam?.status === "LIVE"} /> : undefined} /><section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={ClipboardCheck} label="Hazırlanan deneme" value={preparationCount} tone="sky" /><MetricCard icon={Activity} label="Aktif öğrenci" value={activeAttempts} tone="mint" /><MetricCard icon={CheckCircle2} label="Puanlama bekleyen" value={awaitingScore} tone="yellow" /><MetricCard icon={Rocket} label="Bloke yayın kapısı" value={blocked} tone="lavender" /></section></>;
}

async function StudentHome({ userId }: { userId: string }) {
  const exams = await listStudentExams(userId);
  const now = new Date();
  const active = exams.find((exam) => exam.attempts[0]?.status === "IN_PROGRESS");
  const upcoming = exams.filter((exam) => exam.endsAt && exam.endsAt > now).sort((a, b) => (a.startsAt?.getTime() || 0) - (b.startsAt?.getTime() || 0));
  const next = active || upcoming[0] || null;
  const completed = exams.filter((exam) => exam.attempts[0] && exam.attempts[0].status !== "IN_PROGRESS").length;
  const released = exams.filter((exam) => exam.status === "RELEASED" && exam.attempts[0]?.status !== "IN_PROGRESS").length;
  const live = Boolean(next?.startsAt && next?.endsAt && now >= next.startsAt && now < next.endsAt);
  const status = next ? examStatusPresentation[next.status] : null;
  return <><PrimaryCard eyebrow={active ? "Devam eden deneme" : "Sıradaki deneme"} title={next?.title || "Yeni deneme henüz planlanmadı"} copy={next ? `${next.family} · ${next.startsAt ? dateTime.format(next.startsAt) : "Saat bekleniyor"} · ${next.currentVersion?.durationMinutes || "—"} dakika` : "Yeni bir matematik denemesi planlandığında burada göreceksin."} href={next ? `/panel/odk/ogrenci/denemeler/${next.id}` : "/panel/odk/ogrenci/denemeler"} action={active ? "Denemeye devam et" : next ? "Denemeyi incele" : "Denemelerimi aç"} badge={status ? <OdkStatusBadge label={active ? "Devam ediyor" : live ? "Giriş açık" : status.label} tone={active || live ? "warning" : status.tone} pulse={live} /> : undefined} /><section className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard icon={CalendarClock} label="Yaklaşan deneme" value={upcoming.length} tone="sky" /><MetricCard icon={CheckCircle2} label="Tamamlanan" value={completed} tone="mint" /><MetricCard icon={LineChart} label="Açıklanan sonuç" value={released} tone="lavender" /></section></>;
}

async function TeacherHome({ userId }: { userId: string }) {
  const students = await listOdkReportStudents({ userId, role: "TEACHER" });
  const studentIds = students.map((student) => student.userId);
  const [releasedResults, attentionAreas, latest] = studentIds.length ? await Promise.all([
    prisma.odkExamAttempt.count({ where: { studentUserId: { in: studentIds }, exam: { status: "RELEASED" }, score: { isNot: null } } }),
    prisma.odkAttemptOutcomeScore.count({ where: { accuracyRate: { lt: 50 }, score: { attempt: { studentUserId: { in: studentIds }, exam: { status: "RELEASED" } } } } }),
    prisma.odkExamAttempt.findFirst({ where: { studentUserId: { in: studentIds }, exam: { status: "RELEASED" }, score: { isNot: null } }, orderBy: { exam: { resultsReleasedAt: "desc" } }, select: { student: { select: { fullName: true, email: true } }, exam: { select: { title: true } }, score: { select: { totalNet: true } } } }),
  ]) : [0, 0, null];
  return <><PrimaryCard eyebrow="Son açıklanan sonuç" title={latest ? `${latest.student.fullName || latest.student.email} · ${latest.exam.title}` : "İncelenecek sonuç henüz yok"} copy={latest ? `${Number(latest.score?.totalNet || 0).toFixed(2)} net. Sonucu öğrencinin önceki kanıtlarıyla birlikte yorumlayın.` : "Admin sonuçları açıkladığında sorumlu olduğunuz öğrencilerin raporları burada görünür."} href="/panel/odk/ogretmen/raporlar" action="Raporları incele" /><section className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard icon={UsersRound} label="Sorumlu öğrenci" value={students.length} tone="sky" /><MetricCard icon={CheckCircle2} label="Açıklanan sonuç" value={releasedResults} tone="mint" /><MetricCard icon={LineChart} label="Yeni kanıt gerektiren alan" value={attentionAreas} tone="yellow" /></section></>;
}

async function ParentHome({ userId }: { userId: string }) {
  const students = await listOdkReportStudents({ userId, role: "PARENT" });
  const report = students[0] ? await getOdkAudienceStudentReport({ userId, role: "PARENT" }, students[0].userId) : null;
  const latest = report?.exams.at(-1) || null;
  const attention = report?.trends.filter((trend) => trend.latestAccuracy < 50).length || 0;
  return <><PrimaryCard eyebrow="Son açıklanan sonuç" title={latest ? `${report?.student.name} · ${latest.title}` : students.length ? "Açıklanmış sonuç henüz yok" : "Bağlı öğrenci bulunmuyor"} copy={latest ? `${latest.totalNet.toFixed(2)} net · ${latest.correctCount} doğru · ${latest.wrongCount} yanlış · ${latest.blankCount} boş` : "Sonuçlar yalnız admin kontrol edip açıkladıktan sonra burada görünür."} href="/panel/odk/veli/raporlar" action="Gelişim raporunu aç" /><section className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard icon={UsersRound} label="Bağlı öğrenci" value={students.length} tone="sky" /><MetricCard icon={CheckCircle2} label="Açıklanan deneme" value={report?.exams.length || 0} tone="mint" /><MetricCard icon={LineChart} label="Gelişim alanı" value={attention} tone="yellow" /></section></>;
}

export async function OdkHome({ session }: { session: SessionUser }) {
  const copy = COPY[session.role];
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK"><PanelPageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.body} icon={session.role === "ADMIN" ? ShieldCheck : session.role === "STUDENT" ? CalendarClock : LineChart} />{session.role === "ADMIN" ? <AdminHome /> : session.role === "STUDENT" ? <StudentHome userId={session.userId} /> : session.role === "TEACHER" ? <TeacherHome userId={session.userId} /> : <ParentHome userId={session.userId} />}</PanelShell>;
}
