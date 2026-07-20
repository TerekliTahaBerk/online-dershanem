"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, HardDrive, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { useOfflineSync } from "@/components/panel/offline-sync-provider";

type Preference = { version: number; lowDataMode: boolean; offlineWritesEnabled: boolean };

export function NetworkPreferencesForm({ initial }: { initial: Preference }) {
  const router = useRouter();
  const offline = useOfflineSync();
  const [preference, setPreference] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/panel/network/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: preference.version, lowDataMode: preference.lowDataMode, offlineWritesEnabled: preference.offlineWritesEnabled }) });
    const body = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) return setMessage(body.error || "Tercihler kaydedilemedi.");
    document.documentElement.dataset.panelLowData = preference.lowDataMode ? "true" : "false";
    offline.applyPreferences(preference.lowDataMode, preference.offlineWritesEnabled);
    if (!preference.offlineWritesEnabled) await offline.clearDeviceQueue();
    setPreference((current) => ({ ...current, version: body.version }));
    setMessage("Veri kullanımı tercihleri kaydedildi.");
    router.refresh();
  }

  return <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
    <section className="panel-surface p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">Bağlantı ve cihaz tercihleri</h2>
      <div className="mt-5 space-y-3">
        <button type="button" aria-pressed={preference.lowDataMode} onClick={() => setPreference((current) => ({ ...current, lowDataMode: !current.lowDataMode }))} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${preference.lowDataMode ? "border-[var(--brand-olive)] bg-[var(--panel-nav-active)]" : "border-[var(--site-line)]"}`}><DatabaseZap className="mt-0.5 shrink-0" size={18} /><span><span className="block text-sm font-extrabold">Düşük veri modu</span><span className="mt-1 block text-xs leading-5 text-[var(--site-body)]">Video ve büyük dosyaları otomatik açmaz; varsa metin dökümünü öne çıkarır.</span></span><span className="ml-auto text-xs font-bold">{preference.lowDataMode ? "Açık" : "Kapalı"}</span></button>
        <button type="button" aria-pressed={preference.offlineWritesEnabled} onClick={() => setPreference((current) => ({ ...current, offlineWritesEnabled: !current.offlineWritesEnabled }))} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${preference.offlineWritesEnabled ? "border-[var(--brand-olive)] bg-[var(--panel-nav-active)]" : "border-[var(--site-line)]"}`}><HardDrive className="mt-0.5 shrink-0" size={18} /><span><span className="block text-sm font-extrabold">Güvenli çevrimdışı yazma</span><span className="mt-1 block text-xs leading-5 text-[var(--site-body)]">Ders kapanışı ve ödev durumu en fazla 24 saat bu tarayıcıda bekler. Yalnız kişisel cihazda açın.</span></span><span className="ml-auto text-xs font-bold">{preference.offlineWritesEnabled ? "Açık" : "Kapalı"}</span></button>
      </div>
      <p role="status" className="mt-4 min-h-5 text-xs font-bold text-[var(--brand-olive)]">{message}</p>
      <button type="button" disabled={busy} onClick={() => void save()} className="panel-quick-action panel-quick-action-primary mt-2">{busy ? "Kaydediliyor…" : "Tercihleri kaydet"}</button>
    </section>
    <section className="panel-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">{offline.online ? <Wifi size={18} /> : <WifiOff size={18} />} Cihaz kuyruğu</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--site-body)]">{offline.online ? "Bağlantı var." : "Bağlantı yok; izin verilen işlemler cihazda bekleyebilir."} İçerik burada gösterilmez.</p>
      <dl className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[var(--site-bg-warm)] p-4"><dt className="text-xs font-bold">Bekleyen</dt><dd className="mt-1 text-2xl font-extrabold">{offline.queuedCount}</dd></div><div className="rounded-2xl bg-[var(--site-bg-warm)] p-4"><dt className="text-xs font-bold">Kontrol isteyen</dt><dd className="mt-1 text-2xl font-extrabold">{offline.conflictCount}</dd></div></dl>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void offline.retryNow()} disabled={!offline.online || !offline.queuedCount} className="panel-quick-action"><RefreshCw size={14} /> Şimdi eşitle</button><button type="button" onClick={() => void offline.clearDeviceQueue()} disabled={!offline.queuedCount && !offline.conflictCount} className="panel-quick-action text-rose-700"><Trash2 size={14} /> Cihaz kuyruğunu sil</button></div>
      <p className="mt-4 text-xs leading-5 text-[var(--site-muted)]">Ödeme, kullanıcı yönetimi, sağlık/erişilebilirlik düzenlemesi, kanıt metni ve dosya yükleme hiçbir zaman çevrimdışı kuyruğa alınmaz.</p>
    </section>
  </div>;
}
