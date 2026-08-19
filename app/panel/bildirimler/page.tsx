import Link from "next/link";
import { Bell } from "lucide-react";
import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { NotificationInbox } from "@/components/panel/notification-inbox";
import { NotificationPreferences } from "@/components/panel/notification-preferences";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const types: Array<{ value: "ALL" | NotificationType; label: string }> = [
  { value: "ALL", label: "Tümü" }, { value: "LESSON_SUMMARY", label: "Ders" }, { value: "ASSIGNMENT", label: "Ödev" }, { value: "ABSENCE", label: "Devamsızlık" }, { value: "PAYMENT", label: "Ödeme" }, { value: "SYSTEM", label: "Sistem" },
];

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string; status?: string }> }) {
  const session = await requireActiveUser();
  const params = await searchParams;
  const selectedType = types.some((item) => item.value === params.type) ? params.type as "ALL" | NotificationType : "ALL";
  const selectedStatus = params.status === "unread" ? "unread" : "all";
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const canChoosePreferences = session.role === "PARENT" || session.role === "STUDENT";
  const where: Prisma.NotificationWhereInput = { userId: session.userId, ...(selectedType !== "ALL" ? { type: selectedType } : {}), ...(selectedStatus === "unread" ? { readAt: null } : {}) };
  const [notifications, total, unreadTotal, preferences] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.userId, readAt: null } }),
    canChoosePreferences ? prisma.notificationPreference.findUnique({ where: { userId: session.userId } }) : null,
  ]);
  const initial = preferences || { inAppEnabled: true, emailEnabled: false, whatsappEnabled: false, lessonSummary: true, weeklyDigest: true, absence: true, assignment: true, payment: true };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (next: { page?: number; type?: string; status?: string }) => { const query = new URLSearchParams(); const type = next.type ?? selectedType; const status = next.status ?? selectedStatus; const nextPage = next.page ?? 1; if (type !== "ALL") query.set("type", type); if (status !== "all") query.set("status", status); if (nextPage > 1) query.set("page", String(nextPage)); const text = query.toString(); return `/panel/bildirimler${text ? `?${text}` : ""}`; };

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><Bell size={15} /> Bildirim merkezi</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[var(--site-ink)]">Önemli gelişmeler tek yerde.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Ders, çalışma ve operasyon hareketlerini kaçırmadan takip edin.</p></header>
      <div className="panel-nav-scroll mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Bildirim türü filtresi">{types.map((item) => <Link key={item.value} href={href({ type: item.value })} aria-current={selectedType === item.value ? "page" : undefined} className={`min-w-fit rounded-full px-3 py-2 text-xs font-bold ${selectedType === item.value ? "bg-[var(--brand-olive)] text-white" : "border border-[var(--site-line)] bg-white text-[var(--site-body)]"}`}>{item.label}</Link>)}</div>
      <div className="mt-2 flex gap-2"><Link href={href({ status: "all" })} aria-current={selectedStatus === "all" ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${selectedStatus === "all" ? "bg-[var(--site-ink)] text-white" : "border border-[var(--site-line)] bg-white"}`}>Tüm durumlar</Link><Link href={href({ status: "unread" })} aria-current={selectedStatus === "unread" ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${selectedStatus === "unread" ? "bg-[var(--site-ink)] text-white" : "border border-[var(--site-line)] bg-white"}`}>Okunmamış ({unreadTotal})</Link></div>
      <div className={`mt-7 grid gap-5 ${canChoosePreferences ? "xl:grid-cols-[1.2fr_.8fr]" : ""}`}>
        <div><NotificationInbox key={`${selectedType}-${selectedStatus}-${page}-${unreadTotal}`} total={total} initialUnread={unreadTotal} initialItems={notifications.map((item) => ({ id: item.id, type: item.type, title: item.title, body: item.body, href: item.href, read: Boolean(item.readAt), dateLabel: new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(item.createdAt) }))} />{totalPages > 1 ? <nav aria-label="Bildirim sayfaları" className="mt-3 flex items-center justify-between gap-3"><Link href={href({ page: Math.max(1, page - 1) })} aria-disabled={page <= 1} className={`panel-quick-action ${page <= 1 ? "pointer-events-none opacity-45" : ""}`}>← Önceki</Link><span className="text-xs font-bold text-[var(--site-muted)]">{page}/{totalPages}</span><Link href={href({ page: Math.min(totalPages, page + 1) })} aria-disabled={page >= totalPages} className={`panel-quick-action ${page >= totalPages ? "pointer-events-none opacity-45" : ""}`}>Sonraki →</Link></nav> : null}</div>
        {canChoosePreferences ? <NotificationPreferences initial={initial} unread={0} /> : null}
      </div>
    </PanelShell>
  );
}
