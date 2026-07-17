"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarCheck2, Check, ClipboardCheck, CreditCard, Loader2, UserX } from "lucide-react";

type Item = {
  id: string;
  type: "LESSON_SUMMARY" | "ABSENCE" | "ASSIGNMENT" | "PAYMENT" | "SYSTEM";
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  dateLabel: string;
};

const icons = { LESSON_SUMMARY: CalendarCheck2, ABSENCE: UserX, ASSIGNMENT: ClipboardCheck, PAYMENT: CreditCard, SYSTEM: Bell };

export function NotificationInbox({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const unread = items.filter((item) => !item.read).length;

  async function markRead(id?: string) {
    setBusy(id || "all");
    const response = await fetch("/api/panel/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    if (response.ok) setItems((current) => current.map((item) => !id || item.id === id ? { ...item, read: true } : item));
    setBusy(null);
    router.refresh();
    return response.ok;
  }

  async function open(item: Item) {
    if (!item.read) await markRead(item.id);
    if (item.href) router.push(item.href);
  }

  return (
    <section className="panel-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--site-line)] p-5">
        <div><h2 className="text-sm font-extrabold text-[var(--site-ink)]">Son bildirimler</h2><p className="mt-1 text-xs text-[var(--site-muted)]">{unread ? `${unread} okunmamış gelişme` : "Hepsini gördünüz"}</p></div>
        {unread ? <button type="button" disabled={busy !== null} onClick={() => void markRead()} className="panel-quick-action">{busy === "all" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Tümünü okundu yap</button> : null}
      </div>
      <div className="divide-y divide-[var(--site-line)]">
        {items.map((item) => {
          const Icon = icons[item.type];
          return (
            <article key={item.id} className={`relative flex items-start gap-2 p-5 transition ${item.href ? "hover:bg-[var(--site-bg-warm)]" : ""} ${item.read ? "opacity-75" : "bg-[#fbfcf8]"}`}>
              {!item.read ? <span className="absolute left-2 top-7 h-2 w-2 rounded-full bg-rose-500" aria-label="Okunmamış" /> : null}
              <button type="button" onClick={() => void open(item)} className="flex min-w-0 flex-1 gap-3 text-left" aria-label={item.href ? `${item.title} bildirimini aç` : item.read ? item.title : `${item.title} bildirimini okundu yap`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${item.read ? "bg-slate-100 text-slate-500" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}><Icon size={17} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-xs text-[var(--site-ink)]">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--site-body)]">{item.body}</span><time className="mt-1 block text-[10px] text-[var(--site-muted)]">{item.dateLabel}</time></span>
              </button>
              {!item.read ? <button type="button" disabled={busy !== null} onClick={(event) => { event.stopPropagation(); void markRead(item.id); }} className="self-start rounded-lg px-2 py-1 text-[10px] font-bold text-[var(--brand-olive)] hover:bg-white" aria-label={`${item.title} bildirimini okundu yap`}>{busy === item.id ? <Loader2 size={13} className="animate-spin" /> : "Okundu"}</button> : null}
            </article>
          );
        })}
        {!items.length ? <div className="p-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><Bell size={20} /></span><p className="mt-4 text-sm font-bold text-[var(--site-ink)]">Şimdilik yeni bildirim yok</p><p className="mt-1 text-xs text-[var(--site-muted)]">Ders, ödev ve önemli sistem gelişmeleri burada görünecek.</p></div> : null}
      </div>
    </section>
  );
}
