/**
 * Phase 2 / Session 9 — `LessonMaterialsSection`
 *
 * Mirror of `AssignmentMaterialsSection` but for Lessons. Same modes,
 * same empty-when-readonly behavior.
 */
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { AttachedMaterialsList } from "./attached-materials-list";
import { MaterialAttachmentPicker } from "./material-attachment-picker";
import type { MaterialRow } from "@/lib/panel/materials";

type Props = {
  lessonId: string;
  attached: MaterialRow[];
  edit?: {
    pickable: MaterialRow[];
    attachAction: (fd: FormData) => Promise<void>;
    detachAction: (lessonId: string, materialId: string) => Promise<void>;
  };
  studentEmptyText?: string;
};

export function LessonMaterialsSection({
  lessonId,
  attached,
  edit,
  studentEmptyText,
}: Props) {
  if (!edit && attached.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Ders materyalleri" subtitle="Bu derste işlenecek kaynaklar" />
      <CardBody>
        <div style={{ display: "grid", gap: 14 }}>
          <AttachedMaterialsList
            materials={attached}
            emptyText={
              edit
                ? "Bu derse henüz materyal eklenmemiş. Aşağıdan seçip ekleyebilirsin."
                : studentEmptyText ?? "Bu derse materyal eklenmemiş."
            }
            detach={
              edit
                ? {
                    kind: "lesson",
                    parentId: lessonId,
                    action: edit.detachAction,
                  }
                : undefined
            }
          />
          {edit ? (
            <details>
              <summary
                className="od-muted"
                style={{ fontSize: 13, cursor: "pointer", userSelect: "none" }}
              >
                + Materyal ekle ({edit.pickable.length} uygun)
              </summary>
              <div style={{ marginTop: 10 }}>
                <MaterialAttachmentPicker
                  mode="standalone"
                  materials={edit.pickable}
                  action={edit.attachAction}
                  hint="Birden çok materyal seçip tek seferde ekleyebilirsin."
                  submitLabel="Seçilenleri derse ekle"
                />
              </div>
            </details>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
