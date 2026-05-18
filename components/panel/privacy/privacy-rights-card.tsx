"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { useToast } from "@/components/ui/toast";

/**
 * KVKK / Veri Sahibi Hakları kartı.
 *
 * - Veri ihracı: GET /api/v1/me/data-export (5/gün rate-limit)
 * - Hesap silme: /panel/{role}/profilim/hesap-sil (Round R-D+ ile gerçek akışa bağlandı)
 *
 * Tüm rollerde (öğrenci/öğretmen/veli/admin) profil sayfalarına monte edilebilir.
 */
export function PrivacyRightsCard() {
  const pathname = usePathname() ?? "";
  // Beklenen path: /panel/{segment}/...
  const segMatch = /^\/panel\/(ogrenci|ogretmen|veli|admin)(?:\/|$)/.exec(pathname);
  const segment = segMatch?.[1] ?? "ogrenci";
  const deleteHref = `/panel/${segment}/profilim/hesap-sil`;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

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
        toast.error(msg);
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
      toast.success("Veri dosyan indiriliyor", { title: "İhraç tamam" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata.";
      setError(msg);
      toast.error(msg);
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
            <Link
              href={deleteHref}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              🗑️ Hesabımı sil
            </Link>
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
