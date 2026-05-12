import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { PanelIconName } from "@/components/panel/ui/icon";

type Props = {
  title: string;
  subtitle?: string;
  icon?: PanelIconName;
  description?: string;
};

export function ScaffoldPage({ title, subtitle, icon = "folder", description }: Props) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <EmptyState
          icon={icon}
          title="Bu sayfa kısa süre içinde hazır olacak"
          description={description ?? "Veritabanı senkron sayfa şu an inşa ediliyor. Sidebar üzerinden diğer modüllere erişebilirsin."}
        />
      </Card>
    </>
  );
}
