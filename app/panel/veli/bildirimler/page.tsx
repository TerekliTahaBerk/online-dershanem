import Link from "next/link";
import { Bell, CalendarCheck2, ClipboardCheck, CreditCard, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { NotificationPreferences } from "@/components/panel/notification-preferences";

export const dynamic = "force-dynamic";

export default async function ParentNotificationsPage() {
  const session = await requireRole("PARENT");
  const [notifications, preferences] = await Promise.all([prisma.notification.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 60 }), prisma.notificationPreference.findUnique({ where: { userId: session.userId } })]);
  const initial = preferences || { inAppEnabled: true, emailEnabled: false, whatsappEnabled: false, lessonSummary: true, absence: true, assignment: true, payment: true };
  const icon = { LESSON_SUMMARY: CalendarCheck2, ABSENCE: UserX, ASSIGNMENT: ClipboardCheck, PAYMENT: CreditCard, SYSTEM: Bell };
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><Bell size={15} /> Bildirim merkezi</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">Önemli gelişmeler tek yerde.</h1></header><div className="mt-7 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><section className="panel-surface overflow-hidden"><div className="border-b border-[var(--site-line)] p-5"><h2 className="text-sm font-extrabold text-[var(--site-ink)]">Son bildirimler</h2></div><div className="divide-y divide-[var(--site-line)]">{notifications.map((notification) => { const Icon = icon[notification.type]; const content = <><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${notification.readAt ? "bg-slate-100 text-slate-500" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}><Icon size={17} /></span><span><strong className="block text-xs text-[var(--site-ink)]">{notification.title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--site-body)]">{notification.body}</span><time className="mt-1 block text-[10px] text-[var(--site-muted)]">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(notification.createdAt)}</time></span></>; return notification.href ? <Link key={notification.id} href={notification.href} className="flex gap-3 p-5 transition hover:bg-[var(--site-bg-warm)]">{content}</Link> : <article key={notification.id} className="flex gap-3 p-5">{content}</article>; })}{!notifications.length ? <p className="p-10 text-center text-sm text-[var(--site-muted)]">Henüz bildirim yok. Yeni ders özeti ve ödevler burada görünecek.</p> : null}</div></section><NotificationPreferences initial={initial} unread={notifications.filter((item) => !item.readAt).length} /></div></PanelShell>;
}
