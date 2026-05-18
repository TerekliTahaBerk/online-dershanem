"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";

/**
 * KVKK / Veri Sahibi Hakları kartı.
 *
 * - Veri ihracı: GET /api/v1/me/data-export (5/gün rate-limit)
 * - Hesap silme talebi: `mailto:` ile destek e-postasına yönlendirir
 *   (otomatik akış R-X — Account deletion request — sonraki round'da gelecek)
 *
 * Tüm rollerde (öğrenci/öğretmen/veli/admin) profil sayfalarına monte edilebilir.
 */
export function PrivacyRightsCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/data-export", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        let msg = "Veri ihracı başarısız oldu.";
        if (res.status === 429) msg = "Günlük 5 ihraç hakkınızı doldurdunuz. Yarın tekrar deneyin.";
        else if (res.status === 401) msg = "Oturumunuz sona ermiş.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {/* ignore */}
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dispo = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(dispo);
      a.download = m?.[1] ?? `kvkk-veri-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Gizlilik ve veri haklarınız" subtitle="KVKK 11. madde" />
      <CardBody>
        <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
          <p className="od-muted" style={{ margin: 0, lineHeight: 1.6 }}>
            6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin
            makine-okunabilir bir kopyasını indirebilir, silinmesini talep edebilirsiniz.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="od-btn od-btn-primary od-btn-sm"
              onClick={downloadExport}
              disabled={loading}
            >
              {loading ? "Hazırlanıyor…" : "📥 Verilerimi indir (JSON)"}
            </button>
            <a
              href="mailto:destek@onlinedershanem.com?subject=Hesap%20silme%20talebi&body=Merhaba%2C%0A%0AKVKK%2011.%20madde%20kapsam%C4%B1nda%20hesab%C4%B1m%C4%B1n%20ve%20ki%C5%9Fisel%20verilerimin%20silinmesini%20talep%20ediyorum.%0A%0ATe%C5%9Fekk%C3%BCrler."
              className="od-btn od-btn-ghost od-btn-sm"
            >
              ✉️ Hesap silme talebi
            </a>
            <a
              href="/kvkk"
              className="od-btn od-btn-ghost od-btn-sm"
              target="_blank"
              rel="noreferrer"
            >
              📄 KVKK aydınlatma metni
            </a>
          </div>

          {error ? (
            <div
              role="alert"
              style={{
                fontSize: 12,
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "6px 10px",
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          ) : null}

          <p className="od-muted" style={{ margin: 0, fontSize: 11 }}>
            İndirme: oturumunuza ait kullanıcı bilgileri, varsa öğrenci/öğretmen/veli profili,
            ödev gönderimleri, yoklama, paket geçmişi, deneme sonuçları ve bildirimleriniz dahildir.
            Günlük 5 ihraç limiti uygulanır.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
