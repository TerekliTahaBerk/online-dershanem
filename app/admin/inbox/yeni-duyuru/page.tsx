"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Megaphone } from "lucide-react";
import { sendBroadcast, type BroadcastResult } from "./actions";

export default function YeniDuyuruPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BroadcastResult | null>(null);

  function onSubmit(fd: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await sendBroadcast(fd);
      setResult(r);
      if (r.ok) {
        setTimeout(() => router.push("/admin/inbox"), 1200);
      }
    });
  }

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/admin/inbox" className="pd-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> Bildirimler
          </Link>
          <h1 className="pd-page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={20} /> Yeni Duyuru
          </h1>
          <p className="pd-page-subtitle">Seçtiğiniz kitleye toplu bildirim gönderin.</p>
        </div>
      </div>

      <form action={onSubmit} className="pd-card" style={{ padding: 20, display: "grid", gap: 14, maxWidth: 720 }}>
        <label className="pd-field">
          <span className="pd-field-label">Hedef kitle *</span>
          <select name="audience" required className="pd-input" defaultValue="ALL_STUDENTS">
            <option value="ALL_STUDENTS">Tüm öğrenciler</option>
            <option value="ALL_TEACHERS">Tüm öğretmenler</option>
            <option value="ALL_PARENTS">Tüm veliler</option>
            <option value="ALL_USERS">Tüm kullanıcılar</option>
          </select>
        </label>

        <label className="pd-field">
          <span className="pd-field-label">Öncelik</span>
          <select name="priority" className="pd-input" defaultValue="NORMAL">
            <option value="LOW">Düşük</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Yüksek</option>
            <option value="URGENT">Acil</option>
          </select>
        </label>

        <label className="pd-field">
          <span className="pd-field-label">Başlık *</span>
          <input
            type="text"
            name="title"
            required
            maxLength={160}
            className="pd-input"
            placeholder="Örn: Pazartesi dersleri saat değişikliği"
          />
        </label>

        <label className="pd-field">
          <span className="pd-field-label">İçerik *</span>
          <textarea
            name="body"
            required
            maxLength={2000}
            rows={6}
            className="pd-input"
            placeholder="Duyuru içeriği..."
          />
        </label>

        <label className="pd-field">
          <span className="pd-field-label">Bağlantı (opsiyonel)</span>
          <input
            type="text"
            name="href"
            className="pd-input"
            placeholder="/panel/dersler"
          />
        </label>

        {result && !result.ok && (
          <div style={{ color: "#ef4444", fontSize: 13 }}>{result.error}</div>
        )}
        {result && result.ok && (
          <div style={{ color: "#10b981", fontSize: 13 }}>
            Duyuru {result.recipients} alıcıya gönderildi. Yönlendiriliyor...
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Link href="/admin/inbox" className="pd-btn-ghost">İptal</Link>
          <button type="submit" disabled={isPending} className="pd-btn-accent">
            <Send size={14} /> {isPending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}
