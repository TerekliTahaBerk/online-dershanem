"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Captions, Move, Text, AlignJustify, FileText } from "lucide-react";
import { applyAccessibilityViewPreference } from "@/components/panel/accessibility-preference-applier";

type Preference = { version: number; reducedMotion: boolean; highContrast: boolean; textScale: "DEFAULT" | "LARGE"; comfortableSpacing: boolean; captionsPreferred: boolean; transcriptPreferred: boolean };
const choices = [
  { key: "reducedMotion", title: "Hareketi azalt", body: "Animasyon ve geçişleri en aza indirir.", icon: Move },
  { key: "highContrast", title: "Yüksek kontrast", body: "Metin ve sınırları daha belirgin yapar.", icon: Eye },
  { key: "largeText", title: "Büyük metin", body: "Panel metinlerini yaklaşık %12,5 büyütür.", icon: Text },
  { key: "comfortableSpacing", title: "Rahat satır aralığı", body: "Metin bloklarında okuma aralığını artırır.", icon: AlignJustify },
  { key: "captionsPreferred", title: "Altyazılı medya", body: "Öğretmenin uygun medya hazırlarken bu ihtiyacı görür.", icon: Captions },
  { key: "transcriptPreferred", title: "Metin dökümü", body: "Video ve ses içeriğinde metin alternatifini tercih eder.", icon: FileText },
] as const;

export function AccessibilityPreferencesForm({ initial }: { initial: Preference }) {
  const router = useRouter(); const [preference, setPreference] = useState(initial); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  function enabled(key: (typeof choices)[number]["key"]) { return key === "largeText" ? preference.textScale === "LARGE" : preference[key]; }
  function toggle(key: (typeof choices)[number]["key"]) { setPreference((current) => key === "largeText" ? { ...current, textScale: current.textScale === "LARGE" ? "DEFAULT" : "LARGE" } : { ...current, [key]: !current[key] }); }
  async function save() { setBusy(true); setMessage(""); const response = await fetch("/api/panel/accessibility/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: preference.version, reducedMotion: preference.reducedMotion, highContrast: preference.highContrast, textScale: preference.textScale, comfortableSpacing: preference.comfortableSpacing, captionsPreferred: preference.captionsPreferred, transcriptPreferred: preference.transcriptPreferred }) }); const data = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) return setMessage(data.error || "Tercihler kaydedilemedi."); applyAccessibilityViewPreference(preference); setPreference((current) => ({ ...current, version: data.version })); setMessage("Tercihler kaydedildi ve panele uygulandı."); router.refresh(); }
  return <section className="panel-surface p-5"><h2 className="text-lg font-extrabold">Benim panel tercihlerim</h2><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">Bunlar tanı veya sağlık kaydı değildir. İstediğiniz zaman açıp kapatabilirsiniz.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{choices.map((choice) => { const Icon = choice.icon; const active = enabled(choice.key); return <button type="button" key={choice.key} aria-pressed={active} onClick={() => toggle(choice.key)} className={`min-h-24 rounded-2xl border p-4 text-left ${active ? "border-[var(--brand-olive)] bg-[var(--panel-nav-active)]" : "border-[var(--site-line)] bg-white"}`}><span className="flex items-center gap-2 text-sm font-extrabold"><Icon size={17} aria-hidden="true" />{choice.title}<span className="ml-auto text-xs">{active ? "Açık" : "Kapalı"}</span></span><span className="mt-2 block text-xs leading-5 text-[var(--site-body)]">{choice.body}</span></button>; })}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm font-bold text-[var(--brand-olive)]">{message}</p><button type="button" disabled={busy} onClick={save} className="panel-quick-action panel-quick-action-primary">{busy ? "Kaydediliyor…" : "Tercihleri kaydet"}</button></div></section>;
}
