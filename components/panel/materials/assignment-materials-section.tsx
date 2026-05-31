/**
 * Phase 2 / Session 9 — `AssignmentMaterialsSection`
 *
 * Card that shows the materials attached to one assignment AND, for
 * the owning teacher, a picker to attach more. Pure server component.
 *
 * Two modes:
 *
 *  - **Teacher** (`canEdit: true`): list with detach buttons + picker.
 *  - **Student / read-only** (`canEdit: false`): list only.
 *
 * Empty + no-edit → renders nothing (so student detail pages don't
 * carry an empty card noise).
 */
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { AttachedMaterialsList } from "./attached-materials-list";
import { MaterialAttachmentPicker } from "./material-attachment-picker";
import type { MaterialRow } from "@/lib/panel/materials";

type Props = {
  assignmentId: string;
  attached: MaterialRow[];
  /** Teacher mode: pickable materials + actions. */
  edit?: {
    pickable: MaterialRow[];
    attachAction: (fd: FormData) => Promise<void>;
    detachAction: (assignmentId: string, materialId: string) => Promise<void>;
  };
  /** Override empty wording for student. */
  studentEmptyText?: string;
};

export function AssignmentMaterialsSection({
  assignmentId,
  attached,
  edit,
  studentEmptyText,
}: Props) {
  // Student / read-only: hide the card entirely if nothing is attached.
  if (!edit && attached.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Çalışma materyalleri" subtitle="Bu ödevle bağlantılı kaynaklar" />
      <CardBody>
        <div style={{ display: "grid", gap: 14 }}>
          <AttachedMaterialsList
            materials={attached}
            emptyText={
              edit
                ? "Bu ödeve henüz materyal eklenmemiş. Aşağıdan seçip ekleyebilirsin."
                : studentEmptyText ?? "Bu ödeve materyal eklenmemiş."
            }
            detach={
              edit
                ? {
                    kind: "assignment",
                    parentId: assignmentId,
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
                  submitLabel="Seçilenleri ödeve ekle"
                />
              </div>
            </details>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
