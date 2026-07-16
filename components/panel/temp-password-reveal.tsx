"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { whatsAppLink } from "@/lib/phone";

/**
 * Geçici parolayı BİR KEZ gösterir.
 *
 * Bu, admin'in gerçek iş akışının tam ortası: hesabı açar, parolayı kişiye
 * WhatsApp'tan yollar. O yüzden kopyalama ve hazır WhatsApp mesajı burada —
 * admin'in parolayı elle yazması hem yavaş hem hataya açık.
 *
 * Sunucu bu parolayı bir daha üretemez (yalnızca hash'i saklanıyor). Kapatmadan
 * önce iletildiğinden emin olunmalı; metin bunu açıkça söylüyor.
 */
export function TempPasswordReveal({
  email,
  fullName,
  tempPassword,
  phone,
  onDone,
}: {
  email: string;
  fullName?: string | null;
  tempPassword: string;
  phone?: string | null;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const message = [
    `Merhaba${fullName ? ` ${fullName}` : ""},`,
    "",
    "Online Dershanem panel hesabınız hazır.",
    "",
    `Giriş: ${typeof window !== "undefined" ? window.location.origin : ""}/giris`,
    `E-posta: ${email}`,
    `Geçici parola: ${tempPassword}`,
    "",
    "İlk girişte kendi parolanızı belirlemeniz istenecek.",
  ].join("\n");

  // Numarayı elle biçimlendirme: "0537..." wa.me'de geçersizdir, 90'a çevrilmeli.
  const waUrl = whatsAppLink(phone, message);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-[16px] border border-[var(--brand-olive-soft)] bg-[var(--brand-olive-tint)] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">
        Hesap açıldı
      </p>
      <p className="mt-2 text-[14px] leading-6 text-[var(--site-body)]">
        <strong className="text-[var(--site-ink)]">{email}</strong> için geçici parola oluşturuldu.
        Bu parola yalnızca şimdi görünür — sayfayı kapattığınızda bir daha gösterilemez.
      </p>

      <div className="mt-4 rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--site-muted)]">
          Geçici parola
        </p>
        <p className="mt-1 font-mono text-[22px] font-bold tracking-[.08em] text-[var(--site-ink)]">
          {tempPassword}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="site-btn site-btn-primary site-btn-sm"
        >
          <MessageCircle size={15} aria-hidden="true" />
          WhatsApp&apos;tan gönder
        </a>
        <button type="button" onClick={copyAll} className="site-btn site-btn-secondary site-btn-sm">
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? "Kopyalandı" : "Mesajı kopyala"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto text-[13px] font-semibold text-[var(--site-body)] underline underline-offset-2 hover:text-[var(--site-ink)]"
        >
          İlettim, kapat
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? "Mesaj panoya kopyalandı" : ""}
      </p>
    </div>
  );
}
