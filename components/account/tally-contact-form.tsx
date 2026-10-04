"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PRODUCT_SELECTOR_PATH } from "@/lib/auth/roles";
import { TALLY_EMBED_ORIGIN, isTallySubmittedMessage } from "@/lib/integrations/tally-events";

/**
 * Tally gömme kodunun React karşılığı (bkz. Tally → Share → Embed code).
 *
 * Gömme kodundaki tam ekran iframe düzeni birebir uygulanır. `embed.js`
 * BİLEREK yüklenmez: yalnız iframe yüksekliğini ayarlar, tam ekran düzende
 * gereksizdir ve CSP'ye üçüncü taraf script açmak istemiyoruz.
 * `formEventsForwarding=1` sayesinde form gönderilince iframe üst pencereye
 * `Tally.FormSubmitted` mesajı yollar. Kaynağı `https://tally.so` olmayan
 * mesajlar yok sayılır.
 */
export function TallyContactForm({ src, alreadySubmitted }: { src: string; alreadySubmitted: boolean }) {
  const [busy, setBusy] = useState<"submitted" | "skipped" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(false);

  async function finish(action: "submitted" | "skipped") {
    if (sent.current) return;
    sent.current = true;
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/account/contact-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json().catch(() => ({}))) as { redirect?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "İşlem tamamlanamadı.");
      window.location.assign(data.redirect ?? PRODUCT_SELECTOR_PATH);
    } catch (caught) {
      sent.current = false;
      setBusy(null);
      setError(caught instanceof Error ? caught.message : "Bağlantı kurulamadı.");
    }
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== TALLY_EMBED_ORIGIN) return;
      if (isTallySubmittedMessage(event.data)) void finish("submitted");
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="site-scope flex min-h-dvh flex-col bg-dc-canvas">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dc-line bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Image src="/design/od-logo.png" alt="" width={1254} height={1254} sizes="36px" className="h-9 w-9 rounded-[10px] object-cover" />
          <div>
            <h1 className="text-[15px] font-extrabold text-dc-ink">Sana ulaşabilmemiz için birkaç soru</h1>
            <p className="text-[12.5px] text-dc-ink-muted">
              {alreadySubmitted ? "Formu daha önce doldurdun; istersen güncelleyebilirsin." : "Yaklaşık 2 dakika sürer. İstersen sonra da doldurabilirsin."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void finish("skipped")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DDE4E0] bg-white px-4 py-2.5 text-[14px] font-semibold text-dc-ink disabled:opacity-60"
        >
          {busy === "skipped" ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {alreadySubmitted ? "Panele dön" : "Sonra dolduracağım"}
        </button>
      </header>

      {error ? (
        <p role="alert" className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800 sm:mx-6">
          {error}
        </p>
      ) : null}
      {busy === "submitted" ? (
        <p role="status" className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-800 sm:mx-6">
          Teşekkürler! Panel seçimine yönlendiriliyorsun…
        </p>
      ) : null}

      <div className="relative flex-1">
        <iframe
          src={src}
          title="Öğrenci Analiz ve Kayıt Formu"
          width="100%"
          height="100%"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </main>
  );
}
