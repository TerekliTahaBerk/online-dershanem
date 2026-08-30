import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Activity } from "lucide-react";
import {
  PanelActionRow,
  PanelAttentionCard,
  PanelCard,
  PanelEmpty,
  PanelMetric,
  PanelPageHeader,
  PanelProgress,
  PanelStatusBadge,
} from "@/components/panel/ui";

const meta = {
  title: "Panel/Primitives",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <div className="max-w-[980px] space-y-5">
      <PanelPageHeader
        eyebrow="Panel primitives"
        title="Konsolide görsel dil"
        description="Aynı kavramlar tek primitive setiyle çizilir."
        icon={Activity}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <PanelMetric label="Aktif öğrenci" value="12" tone="success" icon={Activity} />
        <PanelMetric label="Bekleyen işlem" value="4" tone="warning" icon={Activity} />
        <PanelMetric label="Toplam net" value="58.25" tone="info" icon={Activity} />
      </div>

      <PanelCard>
        <h2 className="text-sm font-bold text-dc-ink">Durum etiketleri</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <PanelStatusBadge label="Nötr" tone="neutral" />
          <PanelStatusBadge label="Bilgi" tone="info" />
          <PanelStatusBadge label="Başarılı" tone="success" />
          <PanelStatusBadge label="Uyarı" tone="warning" />
          <PanelStatusBadge label="Canlı" tone="danger" pulse />
        </div>
      </PanelCard>

      <PanelAttentionCard
        title="Bağlantı gecikmesi algılandı"
        body="Öğrenciyle doğrudan iletişim kurup sınav ekranını yenilemesini isteyin."
        tone="warning"
      />

      <PanelCard>
        <h2 className="text-sm font-bold text-dc-ink">Aksiyon standardı</h2>
        <PanelActionRow
          className="mt-3"
          primaryAction={<button className="panel-primary-button">Birincil aksiyon</button>}
          secondaryAction={<button className="panel-secondary-button">İkincil aksiyon</button>}
        />
      </PanelCard>

      <PanelCard>
        <h2 className="text-sm font-bold text-dc-ink">İlerleme</h2>
        <PanelProgress className="mt-3" label="Haftalık plan" value={64} />
      </PanelCard>

      <PanelEmpty
        className="mt-0 border-dashed"
        title="Henüz içerik yok."
        body="Yeni veri oluştuğunda bu alan otomatik güncellenir."
      />
    </div>
  ),
};
