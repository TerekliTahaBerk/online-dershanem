"use client";

import { useState } from "react";
import { Check, Copy, Link as LinkIcon, MessageCircle } from "lucide-react";
import { whatsAppLink } from "@/lib/phone";

export function InviteLinkReveal({
  email,
  fullName,
  phone,
  inviteUrl,
  inviteMessage,
  inviteExpiresAt,
  onDone,
}: {
  email: string;
  fullName?: string | null;
  phone?: string | null;
  inviteUrl: string;
  inviteMessage: string;
  inviteExpiresAt: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState<"none" | "message" | "link">("none");
  const formattedExpiry = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(inviteExpiresAt));
  const waUrl = whatsAppLink(phone, inviteMessage);

  async function copy(text: string, type: "message" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied("none"), 2000);
    } catch {
      setCopied("none");
    }
  }

  return (
    <div className="rounded-[16px] border border-[var(--brand-olive-soft)] bg-[var(--brand-olive-tint)] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">
        Davet hazır
      </p>
      <p className="mt-2 text-[14px] leading-6 text-[var(--site-body)]">
        <strong className="text-[var(--site-ink)]">{fullName || email}</strong> için tek kullanımlık davet
        bağlantısı üretildi. Bu bağlantı <strong>{formattedExpiry}</strong> tarihine kadar geçerlidir.
      </p>

      <div className="mt-4 rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--site-muted)]">
          Davet bağlantısı
        </p>
        <p className="mt-1 break-all font-mono text-[12.5px] font-bold text-[var(--site-ink)]">{inviteUrl}</p>
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
        <button
          type="button"
          onClick={() => void copy(inviteMessage, "message")}
          className="site-btn site-btn-secondary site-btn-sm"
        >
          {copied === "message" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied === "message" ? "Mesaj kopyalandı" : "Mesajı kopyala"}
        </button>
        <button
          type="button"
          onClick={() => void copy(inviteUrl, "link")}
          className="site-btn site-btn-secondary site-btn-sm"
        >
          {copied === "link" ? <Check size={15} aria-hidden="true" /> : <LinkIcon size={15} aria-hidden="true" />}
          {copied === "link" ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"}
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
        {copied === "none" ? "" : copied === "message" ? "Mesaj panoya kopyalandı" : "Bağlantı panoya kopyalandı"}
      </p>
    </div>
  );
}
