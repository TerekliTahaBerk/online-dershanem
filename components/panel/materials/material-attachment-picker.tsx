/**
 * Phase 2 / Session 9 — `MaterialAttachmentPicker`
 *
 * Server-rendered multi-select that lists materials a teacher can
 * attach to a homework / lesson, then submits via a tiny inline form.
 *
 * Two usage modes:
 *
 *  1) **Attach-existing-form mode** — pass `name` to render a checkbox
 *     group that becomes a `materialIds[]` field for the parent form.
 *     No action of its own. Used in homework/lesson CREATE pages.
 *
 *  2) **Standalone form mode** — pass `attachAction` (a server action
 *     bound to the parent id) to render a picker with its own submit
 *     button. Used on detail pages where the parent already exists.
 *
 * If `materials.length === 0`, renders an empty hint instead.
 */
import Link from "next/link";
import {
  getMaterialOpenUrl,
  getMaterialTypeGlyph,
  getMaterialTypeLabel,
  type MaterialRow,
} from "@/lib/panel/materials";

type CommonProps = {
  materials: MaterialRow[];
  /** Helper text under the title. */
  hint?: string;
  /** Empty-list message — defaults to a sensible Turkish wording. */
  emptyText?: string;
};

type AttachFormMode = CommonProps & {
  mode: "form-field";
  /** The name used in the parent form (e.g. "materialIds"). */
  name: string;
};

type StandaloneMode = CommonProps & {
  mode: "standalone";
  /** Server action — receives FormData with `materialIds[]`. */
  action: (fd: FormData) => Promise<void>;
  /** Optional submit label override. */
  submitLabel?: string;
};

type Props = AttachFormMode | StandaloneMode;

export function MaterialAttachmentPicker(props: Props) {
  const { materials, hint, emptyText } = props;

  if (!materials.length) {
    return (
      <p className="od-muted" style={{ fontSize: 13, margin: 0 }}>
        {emptyText ??
          "Eklenebilecek materyal bulunamadı. Önce Kütüphane → Yeni materyal ile bir kayıt oluşturun."}
      </p>
    );
  }

  const checkboxes = (name: string) => (
    <ul
      className="od-list"
      style={{ display: "grid", gap: 6, maxHeight: 280, overflow: "auto" }}
    >
      {materials.map((m) => {
        const openUrl = getMaterialOpenUrl(m);
        return (
          <li
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              border: "1px solid var(--od-border, #e5e7eb)",
              borderRadius: 8,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: 1,
                minWidth: 0,
                cursor: "pointer",
              }}
            >
              <input type="checkbox" name={name} value={m.id} />
              <span aria-hidden>{getMaterialTypeGlyph(m.type)}</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {m.title}
              </span>
              <span className="od-muted" style={{ fontSize: 12 }}>
                {getMaterialTypeLabel(m.type)}
                {m.subject ? ` · ${m.subject}` : ""}
              </span>
            </label>
            {openUrl ? (
              <Link
                href={openUrl}
                target={openUrl.startsWith("http") ? "_blank" : undefined}
                rel={openUrl.startsWith("http") ? "noreferrer noopener" : undefined}
                className="od-btn od-btn-ghost od-btn-sm"
              >
                Önizle
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  if (props.mode === "form-field") {
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {hint ? (
          <p className="od-muted" style={{ fontSize: 12, margin: 0 }}>
            {hint}
          </p>
        ) : null}
        {checkboxes(props.name)}
      </div>
    );
  }

  // standalone
  return (
    <form action={props.action} style={{ display: "grid", gap: 8 }}>
      {hint ? (
        <p className="od-muted" style={{ fontSize: 12, margin: 0 }}>
          {hint}
        </p>
      ) : null}
      {checkboxes("materialIds")}
      <div>
        <button type="submit" className="od-btn od-btn-primary od-btn-sm">
          {props.submitLabel ?? "Seçilenleri ekle"}
        </button>
      </div>
    </form>
  );
}
