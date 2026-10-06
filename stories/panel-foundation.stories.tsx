import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarClock, Inbox } from "lucide-react";
import {
  Button,
  ButtonLink,
  EmptyState,
  List,
  ListRow,
  PageHeader,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
  ViewTabs,
} from "@/components/panel/ui";
import { USER_STATUS_PRESENTATION } from "@/lib/panel/status-vocabulary";

/**
 * Panel temeli (docs/panel-design-roadmap.md §5, §18.2): beyaz zemin, kartsız
 * bölümler, özellik satırları, tek durum dili ve nötr birincil eylem.
 * `.pn-scope` sarmalayıcısı kabuktaki token'ları sağlar.
 */
const meta = {
  title: "Panel/Foundation",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="site-scope pn-scope p-6" data-product="yon">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DocumentPage: Story = {
  render: () => (
    <div className="max-w-[760px]">
      <PageHeader
        eyebrow="Yön Koçluk · Öğrencilerim"
        title="Taha Berk"
        description="12. sınıf · YKS SAY · bu hafta 9/14 görev"
        actions={<Button variant="primary">Görüşmeyi kaydet</Button>}
      />
      <div className="mt-5">
        <ViewTabs
          label="Öğrenci bölümleri"
          activeId="ozet"
          tabs={[
            { id: "ozet", label: "Özet", href: "#ozet" },
            { id: "plan", label: "Plan", href: "#plan", count: 14 },
            { id: "gorusmeler", label: "Görüşmeler", href: "#gorusmeler" },
          ]}
        />
      </div>
      <Section title="Özellikler" divider={false}>
        <PropertyList>
          <PropertyRow label="Hedef">TYT Matematik 30 net · şu an 24</PropertyRow>
          <PropertyRow label="Koç">Zeynep A.</PropertyRow>
          <PropertyRow label="Hesap durumu">
            <StatusBadge presentation={USER_STATUS_PRESENTATION.ACTIVE} />
          </PropertyRow>
        </PropertyList>
      </Section>
      <Section title="Bugün" description="Plan görevleri ve görüşmeler" actions={<ButtonLink href="#plan" size="sm">Planı aç</ButtonLink>}>
        <List label="Bugünün görevleri">
          <ListRow title="Matematik — Türev · 40 soru" meta="45 dk" status={<StatusBadge label="Yüksek öncelik" tone="warning" />} />
          <ListRow title="Paragraf · 30 soru" meta="30 dk" status={<StatusBadge label="Tamamlandı" tone="success" />} />
          <ListRow title="Koç görüşmesi" description="Perşembe 19:00" action={<Button size="sm">Katıl</Button>} />
        </List>
      </Section>
    </div>
  ),
};

export const StatusTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge label="Taslak" tone="neutral" />
      <StatusBadge label="Planlandı" tone="info" />
      <StatusBadge label="Yayınlandı" tone="success" />
      <StatusBadge label="Dikkat" tone="warning" />
      <StatusBadge label="Gecikti" tone="critical" />
      <StatusBadge label="Canlı" tone="critical" live />
    </div>
  ),
};

export const EmptyStates: Story = {
  render: () => (
    <div className="max-w-[640px] space-y-3">
      <EmptyState
        icon={CalendarClock}
        title="Henüz planlanmış bir Deneme Ligi sınavın yok."
        body="Yeni deneme açıldığında burada görünecek."
      />
      <EmptyState
        icon={Inbox}
        title="Bu hafta yayınlanmayı bekleyen sınav yok."
        action={<Button variant="secondary" size="sm">Tüm denemeler</Button>}
      />
    </div>
  ),
};
