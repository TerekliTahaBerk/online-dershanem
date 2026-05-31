import { EmptyState } from "@/components/panel/ui/empty-state";
import { MaterialCard } from "./material-card";
import type { MaterialRow } from "@/lib/panel/materials";

type Props = {
  materials: MaterialRow[];
  /** Teacher tarafı: id verildiğinde her item için düzenle linki üretir */
  editHrefBuilder?: (id: string) => string;
  hideContext?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function MaterialsList({
  materials,
  editHrefBuilder,
  hideContext,
  emptyTitle = "Henüz materyal yok",
  emptyDescription,
  emptyAction,
}: Props) {
  if (materials.length === 0) {
    return (
      <EmptyState
        icon="folder"
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return (
    <div className="od-material-grid">
      {materials.map((m) => (
        <MaterialCard
          key={m.id}
          material={m}
          hideContext={hideContext}
          editHref={editHrefBuilder ? editHrefBuilder(m.id) : undefined}
        />
      ))}
    </div>
  );
}
