import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { PanelEmptyState } from "@/components/panel/empty-state";
import {
  PanelFilterLink,
  PanelProgress,
  PanelStatCard,
  PanelTaskRow,
} from "@/components/panel/ui";
import { ToastProvider, useToast } from "@/components/ui/toast";

const meta = {
  title: "Panel/Feedback",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyState: Story = {
  render: () => (
    <PanelEmptyState
      title="Bu hafta ödevin yok"
      body="Öğretmenin yeni bir ödev yayınladığında burada göreceksin."
      action={
        <Link className="rounded-[10px] bg-dc-brand-strong px-4 py-2.5 text-sm font-bold text-white" href="/panel/ogrenci/takvim">
          Takvime git
        </Link>
      }
    />
  ),
};

export const TasksAndProgress: Story = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <nav aria-label="Ödev filtresi" className="flex gap-2">
        <PanelFilterLink href="?durum=yaklasan" active>
          Yaklaşan
        </PanelFilterLink>
        <PanelFilterLink href="?durum=tamamlanan" active={false}>
          Tamamlanan
        </PanelFilterLink>
      </nav>
      <ul className="rounded-[14px] border border-dc-line bg-white">
        <PanelTaskRow title="Kareköklü ifadeler testi" meta="Matematik" right="Bugün" rightTone="warn" />
        <PanelTaskRow title="Üslü sayılar özeti" meta="Matematik" right="Tamamlandı" done last />
      </ul>
      <PanelStatCard title="Haftalık hedef" value="6 / 8 saat" note="İki saat kaldı." progressPct={75} />
      <PanelProgress label="Ünite ilerlemesi" value={3} max={5} text="5 kazanımdan 3'ü tamam" />
    </div>
  ),
};

function ToastTrigger() {
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="rounded-[10px] bg-dc-brand-strong px-4 py-2.5 text-sm font-bold text-white"
        onClick={() => toast.success("Tercihler kaydedildi.")}
      >
        Başarılı bildirim
      </button>
      <button
        type="button"
        className="rounded-[10px] border border-dc-line bg-white px-4 py-2.5 text-sm font-bold text-dc-ink"
        onClick={() => toast.error("Kaydedilemedi, tekrar deneyin.")}
      >
        Hata bildirimi
      </button>
    </div>
  );
}

export const Toasts: Story = {
  render: () => (
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>
  ),
};
