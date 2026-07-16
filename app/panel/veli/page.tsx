import Link from "next/link";
import { BarChart3, CalendarCheck2, CreditCard, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireRole("PARENT");
  const params = await searchParams;
  const links = await prisma.parentStudent.findMany({ where: { parentId: session.userId }, include: { student: { include: { user: { select: { id: true, fullName: true, email: true } } } } }, orderBy: { student: { user: { fullName: "asc" } } } });
  if (!links.length) return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><PanelEmptyState title="Öğrenci bağlantınız hazırlanıyor." body="Yönetim ekibi çocuğunuzu hesabınıza bağladığında gelişim özeti burada görünecek." /></PanelShell>;
  // Güvenlik sınırı: URL'deki studentId hiçbir zaman doğrudan sorgulanmaz;
  // yalnızca oturumdaki veliye ait ilişkiler içinden seçilir.
  const selected = params.studentId ? links.find((item) => item.studentId === params.studentId) : links[0];
  if (!selected) notFound();
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: selected.studentId, endedAt: null }, select: { groupId: true } });
  const groupIds = enrollments.map((item) => item.groupId);
  const [latestLesson, attendance, orders] = await Promise.all([
    prisma.lesson.findFirst({ where: { groupId: { in: groupIds }, status: "COMPLETED", startsAt: { lte: new Date() } }, orderBy: { startsAt: "desc" }, include: { group: true, notes: { where: { OR: [{ studentId: null }, { studentId: selected.studentId }] } } } }),
    prisma.attendance.findMany({ where: { studentId: selected.studentId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.odOrder.findMany({ where: { userId: selected.student.user.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, packageName: true, status: true, totalCents: true, createdAt: true } }),
  ]);
  const common = latestLesson?.notes.find((note) => note.studentId === null);
  const personal = latestLesson?.notes.find((note) => note.studentId === selected.studentId);
  const attended = attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
  const name = selected.student.user.fullName || selected.student.user.email;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.07em] text-[var(--brand-olive)]"><ShieldCheck size={15} /> Size özel gelişim özeti</div><h1 className="mt-2 text-[clamp(1.8rem,4vw,2.7rem)] font-semibold tracking-[-.05em] text-[var(--site-ink)]">{name}</h1></div>{links.length > 1 ? <nav aria-label="Öğrenci seçimi" className="flex gap-2">{links.map((link) => <Link key={link.studentId} href={`/panel/veli?studentId=${link.studentId}`} className={`rounded-full px-3 py-2 text-xs font-bold ${link.studentId === selected.studentId ? "bg-[var(--brand-olive)] text-white" : "border border-[var(--site-line)] bg-white text-[var(--site-body)]"}`}>{link.student.user.fullName || link.student.user.email}</Link>)}</nav> : null}</div>
    <div className="mt-7 grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><section className="rounded-[28px] border border-[var(--site-line)] bg-white p-6 sm:p-7"><div className="flex items-center gap-2 text-[var(--brand-olive)]"><BarChart3 size={19} /><h2 className="text-sm font-bold">Son dersten gelişim</h2></div>{latestLesson ? <><p className="mt-5 text-xs font-bold uppercase tracking-[.07em] text-[var(--site-muted)]">{latestLesson.group.subject} · {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(latestLesson.startsAt)}</p><h3 className="mt-2 text-xl font-semibold tracking-[-.03em] text-[var(--site-ink)]">{common?.topic || latestLesson.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--site-body)]">{common?.note || "Öğretmen genel değerlendirmeyi henüz eklemedi."}</p>{personal?.note ? <p className="mt-4 rounded-2xl bg-[#f1edf8] p-4 text-sm leading-6 text-[#3f3463]"><strong>{name.split(" ")[0]} için:</strong> {personal.note}</p> : null}<div className="mt-5 rounded-2xl bg-[#fff9dc] p-4"><p className="text-xs font-bold uppercase tracking-[.07em] text-amber-800">Sıradaki hedef</p><p className="mt-1 text-sm font-semibold leading-6 text-amber-950">{common?.nextGoal || "Öğretmen sonraki hedefi belirliyor."}</p></div></> : <p className="mt-5 text-sm text-[var(--site-body)]">İlk ders tamamlandığında gelişim özeti burada olacak.</p>}</section>
      <div className="space-y-4"><section className="rounded-[26px] bg-[var(--brand-olive)] p-6 text-white"><CalendarCheck2 size={21} /><p className="mt-5 text-4xl font-extrabold tracking-[-.05em]">{attendance.length ? `%${Math.round((attended / attendance.length) * 100)}` : "—"}</p><p className="mt-2 text-sm text-white/70">Son {attendance.length} derste katılım</p></section><section className="rounded-[26px] border border-[var(--site-line)] bg-white p-6"><div className="flex items-center gap-2 text-[var(--brand-olive)]"><CreditCard size={19} /><h2 className="text-sm font-bold">Ödeme</h2></div>{orders.length ? <div className="mt-4 space-y-3">{orders.map((order) => <div key={order.id} className="flex items-center justify-between gap-3 text-xs"><span><strong className="block text-[var(--site-ink)]">{order.packageName}</strong><span className="text-[var(--site-muted)]">{new Intl.DateTimeFormat("tr-TR").format(order.createdAt)}</span></span><span className={`rounded-full px-2.5 py-1 font-bold ${order.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{order.status === "PAID" ? "Ödendi" : "Bekliyor"} · {(order.totalCents / 100).toLocaleString("tr-TR")} ₺</span></div>)}</div> : <p className="mt-4 text-sm text-[var(--site-body)]">Bu hesaba bağlı sipariş görünmüyor.</p>}</section></div>
    </div>
  </PanelShell>;
}
