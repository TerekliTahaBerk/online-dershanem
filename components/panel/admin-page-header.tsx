import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/panel/ui";

/**
 * YÖNETİM SAYFA BAŞLIĞI — ortak `PageHeader` ölçeğini kullanır
 * (docs/panel-design-roadmap.md §5.3). Yönetim ekranlarına özgü tek fark
 * sağdaki sayaç rozetidir; ikonlu bağlam satırı ortak başlıkta çizilir.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  icon,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      icon={icon}
      title={title}
      description={description}
      actions={
        meta ? (
          <span className="w-fit rounded-md border border-dc-line bg-white px-2.5 py-1 text-[12px] font-medium text-dc-ink-muted">
            {meta}
          </span>
        ) : undefined
      }
    />
  );
}
