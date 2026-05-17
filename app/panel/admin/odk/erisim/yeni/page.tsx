import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { createAccessTagAction } from "../_actions";

export const metadata: Metadata = {
  title: "Yeni Erişim Tagı · ODK Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewAccessTagPage() {
  await requirePanelRole("admin");
  return (
    <>
      <PageHeader
        title="Yeni Erişim Tagı"
        subtitle="OD veya ODK için yeni bir erişim katmanı tanımlayın"
        right={
          <Link href="/panel/admin/odk/erisim" className="od-btn od-btn-ghost">
            ← Erişim listesine dön
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={createAccessTagAction} style={{ display: "grid", gap: 16, maxWidth: 560 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Servis *</span>
              <select name="service" defaultValue="ODK" required className="od-select">
                <option value="OD">OD — OnlineDershanem</option>
                <option value="ODK">ODK — OnlineDenemeKulübü</option>
              </select>
              <span className="od-muted" style={{ fontSize: 11 }}>
                Bu tagı taşıyan kullanıcılar ilgili ürün paneline erişebilir.
              </span>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Başlık *</span>
              <input
                name="title"
                required
                maxLength={120}
                placeholder="Örn. ODK Premium 2026"
                className="od-input"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Anahtar (key)</span>
              <input
                name="key"
                maxLength={64}
                placeholder="Boş bırakılırsa başlıktan otomatik oluşturulur (örn. odk-premium-2026)"
                className="od-input od-mono"
              />
              <span className="od-muted" style={{ fontSize: 11 }}>
                Yalnızca küçük harf, rakam ve tire. Benzersiz olmalı.
              </span>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Açıklama</span>
              <textarea
                name="description"
                maxLength={1000}
                rows={3}
                placeholder="Bu tag hangi pakete/kampanyaya bağlı? Notlar buraya."
                className="od-input"
                style={{ fontFamily: "inherit" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="isActive" defaultChecked />
              <span style={{ fontSize: 13 }}>Aktif olarak oluştur</span>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Link href="/panel/admin/odk/erisim" className="od-btn od-btn-ghost">
                İptal
              </Link>
              <button type="submit" className="od-btn od-btn-primary">
                Tagı oluştur
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
