"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Mail, MessageCircle } from "lucide-react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type Prefs = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  lessonSummary: boolean;
  weeklyDigest: boolean;
  absence: boolean;
  assignment: boolean;
  payment: boolean;
  quietStartMinute: number | null;
  quietEndMinute: number | null;
  dailyDigest: boolean;
  dailyDigestMinute: number | null;
};

export function NotificationPreferences({
  initial,
  unread: initialUnread,
}: {
  initial: Prefs;
  unread: number;
}) {
  const router = useRouter();
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [prefs, setPrefs] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState<"save" | "read" | null>(null);
  const [message, setMessage] = useState("");
  const toggle = (key: Exclude<keyof Prefs, "quietStartMinute" | "quietEndMinute" | "dailyDigestMinute">) => {
    if (!busy) setPrefs((current) => ({ ...current, [key]: !current[key] }));
  };
  async function markAllRead() {
    if (busy) return;
    setBusy("read");
    const response = await fetch("/api/panel/notifications/read", {
      method: "POST",
    });
    if (response.ok) {
      setUnread(0);
      router.refresh();
    } else setMessage("Bildirimler güncellenemedi.");
    setBusy(null);
  }
  async function save() {
    if (busy) return;
    setBusy("save");
    setMessage("");
    const response = await fetch("/api/panel/notifications/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setMessage(response.ok ? "Tercihler kaydedildi." : "Kaydedilemedi.");
    setBusy(null);
    if (response.ok) router.refresh();
  }
  return (
    <section className="panel-surface p-5">
      <h2 className="text-sm font-extrabold text-[var(--site-ink)]">
        Bildirim tercihleri
      </h2>
      <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">
        Panel içi ve e-posta bildirimleri kullanıma hazırdır. WhatsApp izni
        saklanır; kurumsal WhatsApp sağlayıcısı bağlandığında aynı tercihler
        kullanılacaktır.
      </p>
      <div className="mt-4 space-y-2">
        {(
          [
            { key: "inAppEnabled", label: "Panel içi", icon: Bell },
            { key: "emailEnabled", label: "E-posta", icon: Mail },
            {
              key: "whatsappEnabled",
              label: "WhatsApp izni",
              icon: MessageCircle,
            },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            disabled={!ready || busy !== null}
            aria-pressed={prefs[key]}
            onClick={() => toggle(key)}
            className={`flex w-full items-center justify-between rounded-2xl border p-3 text-xs font-bold ${prefs[key] ? "border-[var(--brand-olive)] bg-[var(--brand-olive-soft)]" : "border-[var(--site-line)]"}`}
          >
            <span className="flex items-center gap-2">
              <Icon size={15} />
              {label}
            </span>
            {prefs[key] ? <Check size={15} /> : null}
          </button>
        ))}
      </div>
      <fieldset className="mt-4 space-y-3 border-t border-[var(--site-line)] pt-4" disabled={!ready || busy !== null}>
        <legend className="text-xs font-bold">Sessiz saatler · İstanbul saati</legend>
        <p className="text-xs leading-5 text-[var(--site-muted)]">Ders ve koçluk hatırlatmaları bu saatler bittikten sonra iletilir. Bu tercih yeni hatırlatmalarda kullanılır; hesap ve ödeme e-postaları kendi akışını izler.</p>
        <div className="grid grid-cols-2 gap-3">
          {([{ key: "quietStartMinute", label: "Başlangıç saati" }, { key: "quietEndMinute", label: "Bitiş saati" }] as const).map(({ key, label }) => (
            <label key={key} className="text-xs font-bold">{label}<input type="time" className="mt-1 block w-full rounded-lg border p-2" value={toTime(prefs[key])} onChange={(event) => setPrefs((current) => ({ ...current, [key]: toMinute(event.target.value) }))} /></label>
          ))}
        </div>
        <button type="button" className="text-xs underline" onClick={() => setPrefs((current) => ({ ...current, quietStartMinute: null, quietEndMinute: null }))}>Sessiz saatleri kaldır</button>
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={prefs.dailyDigest} onChange={() => toggle("dailyDigest")} />Günde tek özet al</label>
        {prefs.dailyDigest && <label className="block text-xs font-bold">Günlük özet saati<input type="time" required className="mt-1 block w-full rounded-lg border p-2" value={toTime(prefs.dailyDigestMinute)} onChange={(event) => setPrefs((current) => ({ ...current, dailyDigestMinute: toMinute(event.target.value) }))} /></label>}
      </fieldset>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(
          [
            { key: "lessonSummary", label: "Ders özeti" },
            { key: "weeklyDigest", label: "Haftalık sakin özet" },
            { key: "absence", label: "Devamsızlık" },
            { key: "assignment", label: "Ödev" },
            { key: "payment", label: "Ödeme" },
          ] as const
        ).map(({ key, label }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--site-bg-warm)] p-3 text-[11px] font-bold"
          >
            <input
              type="checkbox"
              disabled={!ready || busy !== null}
              checked={prefs[key]}
              onChange={() => toggle(key)}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p
          aria-live="polite"
          className="text-xs font-bold text-[var(--brand-olive)]"
        >
          {message}
        </p>
        <div className="flex gap-2">
          {unread ? (
            <button
              type="button"
              disabled={!ready || busy !== null}
              onClick={() => void markAllRead()}
              className="panel-quick-action"
            >
              {busy === "read"
                ? "Güncelleniyor"
                : `${unread} bildirimi okundu yap`}
            </button>
          ) : null}
          <button
            type="button"
            disabled={!ready || busy !== null}
            onClick={() => void save()}
            className="panel-quick-action panel-quick-action-primary"
          >
            {busy === "save" ? "Kaydediliyor" : "Kaydet"}
          </button>
        </div>
      </div>
    </section>
  );
}

function toTime(minute: number | null) { return minute === null ? "" : `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`; }
function toMinute(value: string) { if (!value) return null; const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
