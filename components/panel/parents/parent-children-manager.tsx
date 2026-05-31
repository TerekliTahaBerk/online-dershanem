"use client";

/**
 * Phase 3 / Session 3 — D3: Parent children manager (client).
 *
 * Operational widget for the parent detail page:
 *   - Lists linked students with relationship + primary flag
 *   - Inline relationship editor (per row)
 *   - Unlink button (per row)
 *   - "Link another student" form using EntitySearchCombobox
 *
 * Server actions:
 *   - linkChildAction(parentId, fd)
 *   - unlinkChildAction(parentId, studentId)
 *   - updateRelationshipAction(parentId, studentId, fd)
 */

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/panel/ui/badge";
import {
  EntitySearchCombobox,
  type ComboboxRow,
} from "@/components/panel/ui/entity-search-combobox";
import {
  linkChildAction,
  unlinkChildAction,
  updateRelationshipAction,
} from "@/app/panel/admin/veliler/_actions";
import {
  PARENT_RELATIONSHIP_TYPES,
  getCanonicalRelationshipLabel,
  getParentRelationshipLabel,
  type ParentRelationshipType,
} from "@/lib/parents";
import { useToast } from "@/components/ui/toast";

const RELATIONSHIP_OPTIONS: ReadonlyArray<{ value: ParentRelationshipType; label: string }> =
  PARENT_RELATIONSHIP_TYPES.map((v) => ({ value: v, label: getCanonicalRelationshipLabel(v) }));

export type ChildRow = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  relationshipType: ParentRelationshipType | null;
  relationship: string | null;
  isPrimary: boolean;
};

type Props = {
  parentId: string;
  items: ChildRow[];
};

export function ParentChildrenManager({ parentId, items }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [picked, setPicked] = useState<ComboboxRow | null>(null);
  const [addRelType, setAddRelType] = useState<ParentRelationshipType>("MOTHER");
  const [addRelNote, setAddRelNote] = useState("");
  const [addIsPrimary, setAddIsPrimary] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const linkedIds = new Set(items.map((c) => c.studentId));

  const submitLink = () => {
    if (!picked) {
      toast.error("Önce bir öğrenci seçin.");
      return;
    }
    if (linkedIds.has(picked.id)) {
      toast.error("Bu öğrenci zaten bağlı.");
      return;
    }
    if (addRelType === "OTHER" && !addRelNote.trim()) {
      toast.error("'Diğer' için serbest yakınlık metni girin.");
      return;
    }
    const fd = new FormData();
    fd.set("studentId", picked.id);
    fd.set("relationshipType", addRelType);
    if (addRelType === "OTHER") fd.set("relationship", addRelNote.trim());
    if (addIsPrimary) fd.set("isPrimary", "on");
    startTransition(async () => {
      try {
        await linkChildAction(parentId, fd);
        toast.success(`${picked.label} bağlandı.`);
        setPicked(null);
        setAddRelNote("");
        setAddIsPrimary(false);
        setAddRelType("MOTHER");
        setResetKey((k) => k + 1);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bağlanamadı");
      }
    });
  };

  const submitUnlink = (row: ChildRow) => {
    if (!window.confirm(`${row.fullName} bağı kaldırılacak. Onaylıyor musunuz?`)) return;
    startTransition(async () => {
      try {
        await unlinkChildAction(parentId, row.studentId);
        toast.success(`${row.fullName} bağı kaldırıldı.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Bağ kaldırılamadı");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* List */}
      {items.length === 0 ? (
        <div
          style={{
            padding: 12,
            border: "1px dashed var(--pd-line)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--od-muted)",
          }}
        >
          Henüz bağlı öğrenci yok. Aşağıdaki formdan ekleyebilirsiniz.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {items.map((c) =>
            editingId === c.studentId ? (
              <ChildRowEdit
                key={c.studentId}
                parentId={parentId}
                row={c}
                pending={pending}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  toast.success(`${c.fullName}: yakınlık güncellendi.`);
                }}
                onError={(msg) => toast.error(msg)}
                startTransition={startTransition}
              />
            ) : (
              <ChildRowView
                key={c.studentId}
                row={c}
                pending={pending}
                onEdit={() => setEditingId(c.studentId)}
                onUnlink={() => submitUnlink(c)}
              />
            ),
          )}
        </ul>
      )}

      {/* Add form */}
      <div
        style={{
          padding: 12,
          border: "1px solid var(--pd-line)",
          borderRadius: 8,
          background: "var(--pd-bg-subtle, var(--pd-bg))",
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            color: "var(--od-muted)",
            fontWeight: 600,
          }}
        >
          + Yeni öğrenci bağla
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <EntitySearchCombobox
            entity="students"
            placeholder="İsim / telefon ile ara…"
            onChange={(_id, row) => setPicked(row)}
            resetKey={resetKey}
          />
          <div className="od-grid g-3" style={{ gap: 8, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
              <span style={{ color: "var(--od-muted)" }}>Yakınlık</span>
              <select
                className="od-select"
                value={addRelType}
                onChange={(e) => setAddRelType(e.target.value as ParentRelationshipType)}
              >
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {addRelType === "OTHER" ? (
              <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                <span style={{ color: "var(--od-muted)" }}>Serbest yakınlık *</span>
                <input
                  className="od-input"
                  value={addRelNote}
                  onChange={(e) => setAddRelNote(e.target.value)}
                  placeholder="Dede / Hala"
                  style={{
                    padding: "8px 10px",
                    border: "1px solid var(--pd-line)",
                    borderRadius: 8,
                  }}
                />
              </label>
            ) : (
              <div />
            )}
            <label
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                paddingBottom: 6,
              }}
            >
              <input
                type="checkbox"
                checked={addIsPrimary}
                onChange={(e) => setAddIsPrimary(e.target.checked)}
              />
              Birincil iletişim
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="od-btn od-btn-primary od-btn-sm"
              disabled={pending || !picked}
              onClick={submitLink}
            >
              Bağla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Row subcomponents ──────────────────────────────────────────────────

function ChildRowView({
  row,
  pending,
  onEdit,
  onUnlink,
}: {
  row: ChildRow;
  pending: boolean;
  onEdit: () => void;
  onUnlink: () => void;
}) {
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        border: "1px solid var(--pd-line)",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Link
            href={`/panel/admin/ogrenciler/${row.studentId}/duzenle`}
            style={{ fontWeight: 600, color: "var(--od-text)" }}
          >
            {row.fullName}
          </Link>
          {row.classLevel ? (
            <span style={{ color: "var(--od-muted)" }}>· {row.classLevel}. sınıf</span>
          ) : null}
          {row.isPrimary ? <Badge tone="accent">Birincil</Badge> : null}
        </div>
        <div style={{ color: "var(--od-muted)", fontSize: 12 }}>
          Yakınlık: {getParentRelationshipLabel(row.relationshipType, row.relationship)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          className="od-btn od-btn-ghost od-btn-sm"
          disabled={pending}
          onClick={onEdit}
        >
          Düzenle
        </button>
        <button
          type="button"
          className="od-btn od-btn-ghost od-btn-sm"
          style={{ color: "var(--pd-bad)" }}
          disabled={pending}
          onClick={onUnlink}
        >
          Bağı kaldır
        </button>
      </div>
    </li>
  );
}

function ChildRowEdit({
  parentId,
  row,
  pending,
  onCancel,
  onSaved,
  onError,
  startTransition,
}: {
  parentId: string;
  row: ChildRow;
  pending: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [relType, setRelType] = useState<ParentRelationshipType>(
    row.relationshipType ?? "OTHER",
  );
  const [relNote, setRelNote] = useState(row.relationship ?? "");
  const [isPrimary, setIsPrimary] = useState(row.isPrimary);

  const save = () => {
    if (relType === "OTHER" && !relNote.trim()) {
      onError("'Diğer' için serbest yakınlık metni girin.");
      return;
    }
    const fd = new FormData();
    fd.set("relationshipType", relType);
    if (relType === "OTHER") fd.set("relationship", relNote.trim());
    if (isPrimary) fd.set("isPrimary", "on");
    startTransition(async () => {
      try {
        await updateRelationshipAction(parentId, row.studentId, fd);
        onSaved();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Güncellenemedi");
      }
    });
  };

  return (
    <li
      style={{
        display: "grid",
        gap: 10,
        padding: "10px 12px",
        border: "1px solid var(--pd-accent, #3b82f6)",
        borderRadius: 8,
        background: "var(--pd-bg-subtle, var(--pd-bg))",
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>{row.fullName}</strong>
        <span style={{ color: "var(--od-muted)", fontSize: 12 }}>· yakınlık düzenleniyor</span>
      </div>
      <div className="od-grid g-3" style={{ gap: 8, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--od-muted)" }}>Yakınlık</span>
          <select
            className="od-select"
            value={relType}
            onChange={(e) => setRelType(e.target.value as ParentRelationshipType)}
          >
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {relType === "OTHER" ? (
          <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
            <span style={{ color: "var(--od-muted)" }}>Serbest metin *</span>
            <input
              value={relNote}
              onChange={(e) => setRelNote(e.target.value)}
              placeholder="Dede"
              style={{
                padding: "8px 10px",
                border: "1px solid var(--pd-line)",
                borderRadius: 8,
              }}
            />
          </label>
        ) : (
          <div />
        )}
        <label
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontSize: 13,
            paddingBottom: 6,
          }}
        >
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          Birincil iletişim
        </label>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button
          type="button"
          className="od-btn od-btn-ghost od-btn-sm"
          disabled={pending}
          onClick={onCancel}
        >
          Vazgeç
        </button>
        <button
          type="button"
          className="od-btn od-btn-primary od-btn-sm"
          disabled={pending}
          onClick={save}
        >
          Kaydet
        </button>
      </div>
    </li>
  );
}
