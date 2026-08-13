"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Mail, MessageCircle } from "lucide-react";

type Prefs = { inAppEnabled: boolean; emailEnabled: boolean; whatsappEnabled: boolean; lessonSummary: boolean; weeklyDigest: boolean; absence: boolean; assignment: boolean; payment: boolean };

export function NotificationPreferences({ initial, unread: initialUnread }: { initial: Prefs; unread: number }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState<"save" | "read" | null>(null);
  const [message, setMessage] = useState("");
  const toggle = (key: keyof Prefs) => { if (!busy) setPrefs((current) => ({ ...current, [key]: !current[key] })); };
  async function markAllRead() { if (busy) return; setBusy("read"); const response = await fetch("/api/panel/notifications/read", { method: "POST" }); if (response.ok) { setUnread(0); router.refresh(); } else setMessage("Bildirimler güncellenemedi."); setBusy(null); }
  async function save() { if (busy) return; setBusy("save"); setMessage(""); const response = await fetch("/api/panel/notifications/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(prefs) }); setMessage(response.ok ? "Tercihler kaydedildi." : "Kaydedilemedi."); setBusy(null); if (response.ok) router.refresh(); }
  return <section className="panel-surface p-5"><h2 className="text-sm font-extrabold text-[var(--site-ink)]">Bildirim tercihleri</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Panel içi ve e-posta bildirimleri kullanıma hazırdır. WhatsApp izni saklanır; kurumsal WhatsApp sağlayıcısı bağlandığında aynı tercihler kullanılacaktır.</p><div className="mt-4 space-y-2">{([{ key: "inAppEnabled", label: "Panel içi", icon: Bell }, { key: "emailEnabled", label: "E-posta", icon: Mail }, { key: "whatsappEnabled", label: "WhatsApp izni", icon: MessageCircle }] as const).map(({ key, label, icon: Icon }) => <button key={key} type="button" disabled={busy !== null} aria-pressed={prefs[key]} onClick={() => toggle(key)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-xs font-bold ${prefs[key] ? "border-[var(--brand-olive)] bg-[var(--brand-olive-soft)]" : "border-[var(--site-line)]"}`}><span className="flex items-center gap-2"><Icon size={15} />{label}</span>{prefs[key] ? <Check size={15} /> : null}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-2">{([{ key: "lessonSummary", label: "Ders özeti" }, { key: "weeklyDigest", label: "Haftalık sakin özet" }, { key: "absence", label: "Devamsızlık" }, { key: "assignment", label: "Ödev" }, { key: "payment", label: "Ödeme" }] as const).map(({ key, label }) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--site-bg-warm)] p-3 text-[11px] font-bold"><input type="checkbox" disabled={busy !== null} checked={prefs[key]} onChange={() => toggle(key)} />{label}</label>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p aria-live="polite" className="text-xs font-bold text-[var(--brand-olive)]">{message}</p><div className="flex gap-2">{unread ? <button type="button" disabled={busy !== null} onClick={() => void markAllRead()} className="panel-quick-action">{busy === "read" ? "Güncelleniyor" : `${unread} bildirimi okundu yap`}</button> : null}<button type="button" disabled={busy !== null} onClick={() => void save()} className="panel-quick-action panel-quick-action-primary">{busy === "save" ? "Kaydediliyor" : "Kaydet"}</button></div></div></section>;
}
