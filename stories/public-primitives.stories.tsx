import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PublicAccordion } from "@/components/public/accordion";
import {
  PublicBadge,
  PublicButton,
  PublicCard,
  SectionIntro,
} from "@/components/public/primitives";

const meta = {
  title: "Public/Primitives",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <div className="site-scope flex flex-wrap items-center gap-3 p-4">
      <PublicButton href="/paketler">Paketleri incele</PublicButton>
      <PublicButton href="/iletisim" variant="secondary">
        Bize ulaşın
      </PublicButton>
      <PublicButton href="/sss" variant="quiet" size="sm">
        Sık sorulanlar
      </PublicButton>
    </div>
  ),
};

export const CardWithIntro: Story = {
  render: () => (
    <div className="site-scope max-w-xl space-y-4 p-4">
      <SectionIntro
        eyebrow="LGS 2027"
        title="Haftalık ritimle hazırlan"
        body="Canlı ders, ödev ve deneme tek planda."
      />
      <PublicCard>
        <PublicBadge>Yeni dönem</PublicBadge>
        <h3 className="mt-3 text-lg font-bold">Online Dershanem</h3>
        <p className="mt-1 text-sm">Matematik odaklı canlı ders paketi.</p>
      </PublicCard>
    </div>
  ),
};

export const Accordion: Story = {
  render: () => (
    <div className="site-scope max-w-xl p-4">
      <PublicAccordion
        items={[
          { title: "Dersler canlı mı?", content: <p>Evet, her ders canlı yapılır ve kaydı saklanır.</p> },
          { title: "Veli raporu nasıl gelir?", content: <p>Haftalık özet veli paneline düşer.</p> },
        ]}
      />
    </div>
  ),
};
