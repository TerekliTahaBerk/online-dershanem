import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "ODK · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOdkDashboard() {
  await requireOdkPanel("admin");
  return (
    <>
      <PageHeader
        title="OnlineDenemeKulübü"
        subtitle="TYT · AYT · LGS dijital deneme platformu yönetim paneli"
      />

      <Card>
        <CardHeader
          title="Yapım aşamasında"
          subtitle="ODK admin modülleri kademeli olarak devreye alınıyor."
        />
        <CardBody>
          <div className="od-stack">
            <p className="od-muted" style={{ marginBottom: 12 }}>
              Bu fazda <Badge tone="ok">Foundation</Badge> hazır: ürün switcher,
              tag bazlı erişim, sidebar ODK grubu, route iskeletleri. Bir
              sonraki fazda admin denemesi oluşturma + PDF + JSON yükleme akışı
              eklenecek.
            </p>
            <EmptyState
              icon="target"
              title="Faz 2: Deneme yönetimi"
              description="Wizard ile yeni deneme: genel bilgiler → PDF → cevap anahtarı + kazanım JSON → erişim & yayın."
            />
          </div>
        </CardBody>
      </Card>
    </>
  );
}
