import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { NotificationInbox } from "@/components/panel/notification-inbox";
import { NotificationPreferences } from "@/components/panel/notification-preferences";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await requireActiveUser();
  const canChoosePreferences = session.role === "PARENT" || session.role === "STUDENT";
  const [notifications, preferences] = await Promise.all([
    prisma.notification.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 80 }),
    canChoosePreferences ? prisma.notificationPreference.findUnique({ where: { userId: session.userId } }) : null,
  ]);
  const initial = preferences || { inAppEnabled: true, emailEnabled: false, whatsappEnabled: false, lessonSummary: true, absence: true, assignment: true, payment: true };

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
      <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><Bell size={15} /> Bildirim merkezi</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">Önemli gelişmeler tek yerde.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Ders, çalışma ve operasyon hareketlerini kaçırmadan takip edin.</p></header>
      <div className={`mt-7 grid gap-5 ${canChoosePreferences ? "xl:grid-cols-[1.2fr_.8fr]" : ""}`}>
        <NotificationInbox initialItems={notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, body: item.body, href: item.href, read: Boolean(item.readAt), dateLabel: new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(item.createdAt) }))} />
        {canChoosePreferences ? <NotificationPreferences initial={initial} unread={0} /> : null}
      </div>
    </PanelShell>
  );
}
