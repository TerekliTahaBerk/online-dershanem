import { BookOpenCheck, CalendarClock, PartyPopper, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { LiveCountdown } from "@/components/panel/live-countdown";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requireRole("STUDENT");
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><PanelEmptyState title="Profiliniz hazırlanıyor." body="Yönetim ekibi öğrenci profilinizi tamamladığında dersleriniz burada görünecek." /></PanelShell>;
  const enrollmentIds = await prisma.enrollment.findMany({ where: { studentId: profile.id, endedAt: null }, select: { groupId: true } });
  const groupIds = enrollmentIds.map((item) => item.groupId);
  const [nextLesson, latestLesson, attendance] = await Promise.all([
    prisma.lesson.findFirst({ where: { groupId: { in: groupIds }, startsAt: { gte: new Date() }, status: "PLANNED" }, orderBy: { startsAt: "asc" }, include: { group: true, teacher: { select: { fullName: true } } } }),
    prisma.lesson.findFirst({ where: { groupId: { in: groupIds }, status: "COMPLETED" }, orderBy: { startsAt: "desc" }, include: { group: true, notes: { where: { OR: [{ studentId: null }, { studentId: profile.id }] } } } }),
    prisma.attendance.findMany({ where: { studentId: profile.id }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const common = latestLesson?.notes.find((note) => note.studentId === null);
  const personal = latestLesson?.notes.find((note) => note.studentId === profile.id);
  const present = attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
    <div className="mb-6"><p className="text-sm font-semibold text-[var(--brand-olive)]">Merhaba {session.fullName?.split(" ")[0] || "şampiyon"} 👋</p><h1 className="mt-1 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-[-.05em] text-[var(--site-ink)]">Bu hafta bir adım daha ileri.</h1></div>
    <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <section className="relative overflow-hidden rounded-[30px] bg-[var(--brand-olive)] p-6 text-white shadow-[0_25px_70px_-35px_rgba(58,74,44,.75)] sm:p-8"><div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#f4d86a]/25" /><span className="flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold"><CalendarClock size={15} /> Sıradaki ders</span>{nextLesson ? <><h2 className="mt-7 text-2xl font-semibold tracking-[-.035em]">{nextLesson.title}</h2><p className="mt-2 text-sm text-white/75">{nextLesson.group.name} · {nextLesson.teacher.fullName || "Öğretmenin"}</p><div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.08em] text-white/75">Başlamasına</p><p className="mt-1 text-2xl font-bold"><LiveCountdown target={nextLesson.startsAt.toISOString()} /></p></div><time className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-[var(--brand-olive)]">{new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(nextLesson.startsAt)}</time></div></> : <><h2 className="mt-7 text-2xl font-semibold">Takvimin şimdilik rahat.</h2><p className="mt-2 text-sm text-white/75">Yeni dersin planlandığında burada belirecek.</p></>}</section>
      <section className="rounded-[30px] border border-[var(--site-line)] bg-[#fff9dc] p-6 sm:p-7"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-amber-700"><Target size={20} /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.08em] text-amber-800">Bu haftanın yönü</p><h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-amber-950">{common?.nextGoal || "Ritmini koru, küçük adımları tamamla."}</h2><p className="mt-4 text-sm leading-6 text-amber-900/75">{common?.note || "Ders notun eklendiğinde öğretmeninin sana özel yönü burada olacak."}</p></section>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><section className="rounded-[24px] border border-[var(--site-line)] bg-white p-5"><div className="flex items-center gap-2 text-[var(--brand-olive)]"><BookOpenCheck size={18} /><h2 className="text-sm font-bold">Çalışma kartı</h2></div><p className="mt-4 text-base font-semibold text-[var(--site-ink)]">{common?.homework || "Henüz yeni çalışma verilmedi."}</p><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">{personal?.note ? `Sana özel: ${personal.note}` : "Öğretmenin yalnızca farklı bir nokta olduğunda sana özel not ekler."}</p></section><section className="rounded-[24px] border border-[var(--site-line)] bg-white p-5"><div className="flex items-center gap-2 text-violet-700"><PartyPopper size={18} /><h2 className="text-sm font-bold">Devam serisi</h2></div><p className="mt-4 text-3xl font-extrabold tracking-[-.04em] text-[var(--site-ink)]">{attendance.length ? `%${Math.round((present / attendance.length) * 100)}` : "—"}</p><p className="mt-1 text-sm text-[var(--site-body)]">Son {attendance.length || 0} dersteki katılımın. Her gelişin seriyi büyütür.</p></section></div>
  </PanelShell>;
}
