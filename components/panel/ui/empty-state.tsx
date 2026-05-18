import { PanelIcon, type PanelIconName } from "@/components/panel/ui/icon";

type Props = {
  icon?: PanelIconName;
  title: string;
  description?: string;
  /** Opsiyonel CTA (button/link element) — bağlam-uygun aksiyon ekler */
  action?: React.ReactNode;
};

export function EmptyState({ icon = "folder", title, description, action }: Props) {
  return (
    <div className="od-empty">
      <div className="od-empty-ico"><PanelIcon name={icon} size={20} /></div>
      <div className="od-empty-title">{title}</div>
      {description ? <div className="od-empty-desc">{description}</div> : null}
      {action ? <div className="od-empty-action" style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}
