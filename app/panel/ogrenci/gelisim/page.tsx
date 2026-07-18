import { Award, BarChart3, Flame, Target, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { StudentWeeklyGoal } from "@/components/panel/student-weekly-goal";
import { completionDayStreak } from "@/lib/student-engagement";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
  const session = await requireRole("STUDENT");
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true, targetGoal: true, weeklyGoal: true } });
  if (!profile) return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><PanelEmptyState title="Gelişim profiliniz hazırlanıyor." body="Profiliniz tamamlandığında kişisel gelişim alanı burada açılır." /></PanelShell>;
  const [progress, attendance] = await Promise.all([
    prisma.assignmentProgress.findMany({ where: { studentId: profile.id }, orderBy: { updatedAt: "desc" }, take: 60, include: { assignment: { include: { group: { select: { subject: true } } } } } }),
    prisma.attendance.findMany({ where: { studentId: profile.id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const done = progress.filter((item) => item.status === "DONE"); const attendanceGood = attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
  const completion = progress.length ? Math.round((done.length / progress.length) * 100) : 0; const participation = attendance.length ? Math.round((attendanceGood / attendance.length) * 100) : 0;
  const streak = completionDayStreak(done.map((item) => item.completedAt));
  const subjectRows = [...new Set(progress.map((item) => item.assignment.group.subject))].map((subject) => { const rows = progress.filter((item) => item.assignment.group.subject === subject); return { subject, percent: rows.length ? Math.round((rows.filter((item) => item.status === "DONE").length / rows.length) * 100) : 0 }; });
  const badges = [{ title: "İlk adım", body: "İlk çalışmayı tamamla", unlocked: done.length >= 1, icon: Target }, { title: "Ritim ustası", body: "5 çalışmayı tamamla", unlocked: done.length >= 5, icon: Flame }, { title: "Devam yıldızı", body: "%90 katılıma ulaş", unlocked: participation >= 90 && attendance.length >= 3, icon: Award }, { title: "Tamamlama şampiyonu", body: "%90 ödev oranına ulaş", unlocked: completion >= 90 && progress.length >= 3, icon: Trophy }];
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><BarChart3 size={15} /> Kendi yarışın</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">Her küçük adım görünür.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Büyük hedefin: {profile.targetGoal || "Düzenli çalışıp kendi ritmini güçlendirmek"}</p></header><div className="mt-6"><StudentWeeklyGoal initial={profile.weeklyGoal || "Bu hafta en az üç odaklı çalışma tamamlayacağım."} /></div>
    <section className="mt-7 grid gap-3 sm:grid-cols-3"><article className="panel-metric-card"><Target size={18} className="text-[var(--brand-olive)]" /><p className="mt-4 text-3xl font-extrabold text-[var(--site-ink)]">%{completion}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Ödev tamamlama</p></article><article className="panel-metric-card"><Flame size={18} className="text-orange-600" /><p className="mt-4 text-3xl font-extrabold text-[var(--site-ink)]">{streak}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Güncel tamamlama serisi</p></article><article className="panel-metric-card"><Award size={18} className="text-violet-700" /><p className="mt-4 text-3xl font-extrabold text-[var(--site-ink)]">%{participation}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Ders katılımı</p></article></section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="panel-surface p-5"><h2 className="text-sm font-extrabold text-[var(--site-ink)]">Derslere göre ilerleme</h2><div className="mt-5 space-y-4">{subjectRows.map((row) => <div key={row.subject}><div className="flex justify-between text-xs font-bold"><span>{row.subject}</span><span>%{row.percent}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--site-bg-warm)]"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-olive),#82a26d)]" style={{ width: `${row.percent}%` }} /></div></div>)}{!subjectRows.length ? <p className="text-sm text-[var(--site-muted)]">İlk ödevin tamamlandığında grafiklerin oluşacak.</p> : null}</div></section><section className="panel-surface p-5"><h2 className="text-sm font-extrabold text-[var(--site-ink)]">Rozet koleksiyonu</h2><div className="mt-4 grid grid-cols-2 gap-3">{badges.map(({ title, body, unlocked, icon: Icon }) => <article key={title} className={`rounded-2xl border p-4 ${unlocked ? "border-[#e6d27b] bg-[#fff9dc]" : "border-[var(--site-line)] bg-slate-50 opacity-55"}`}><Icon size={20} className={unlocked ? "text-amber-700" : "text-slate-400"} /><h3 className="mt-3 text-xs font-extrabold text-[var(--site-ink)]">{title}</h3><p className="mt-1 text-[10.5px] leading-4 text-[var(--site-muted)]">{unlocked ? "Kazanıldı!" : body}</p></article>)}</div></section></div>
  </PanelShell>;
}
