"use client";

/**
 * ParentLinkCard — smart parent linking flow for the student edit page.
 *
 * Replaces the previous "<select> of every parent in DB" UX with:
 *   1) A search-as-you-type combobox over /api/panel/lookup/parents.
 *   2) When the typed query has no match, a "+ Yeni veli oluştur" footer
 *      switches the form into a *create-and-link* mode that pre-fills the
 *      parent's name from the query.
 *   3) Phase 1.5: structured `relationshipType` selector (Anne / Baba / Vasi
 *      / Abla-Abi / Diğer + freeform note when "Diğer"). The server action
 *      stores both the enum and the free-text note.
 *   4) Single submit hits either `linkParentToStudentAction` (existing) or
 *      `createParentAndLinkAction` (new) based on mode.
 *
 * Server actions are passed in as props so this component remains in
 * components/ and the page-bound `bind(null, studentId)` happens server-side.
 */

import { useMemo, useState, useTransition } from "react";
import { EntitySearchCombobox, type ComboboxRow } from "@/components/panel/ui/entity-search-combobox";
import {
  PARENT_RELATIONSHIP_TYPES,
  getCanonicalRelationshipLabel,
  type ParentRelationshipType,
} from "@/lib/parents";

const RELATIONSHIP_OPTIONS: ReadonlyArray<{ value: ParentRelationshipType; label: string }> =
  PARENT_RELATIONSHIP_TYPES.map((v) => ({ value: v, label: getCanonicalRelationshipLabel(v) }));

type Mode = "pick" | "create";

type Props = {
  /** Server actions (already bound to the studentId via .bind on the page). */
  linkAction: (formData: FormData) => Promise<unknown> | unknown;
  createAndLinkAction: (formData: FormData) => Promise<unknown> | unknown;
};

export function ParentLinkCard({ linkAction, createAndLinkAction }: Props) {
  const [mode, setMode] = useState<Mode>("pick");
  const [picked, setPicked] = useState<ComboboxRow | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [relType, setRelType] = useState<ParentRelationshipType>("MOTHER");
  const [relNote, setRelNote] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  /**
   * Phase 1.5 contract:
   *   - relationshipType  → enum (always sent)
   *   - relationship      → free text; only sent when OTHER and a custom
   *                         note was typed
   */
  const customRelationshipText = useMemo(() => {
    if (relType !== "OTHER") return null;
    return relNote.trim() || null;
  }, [relType, relNote]);

  const reset = () => {
    setMode("pick");
    setPicked(null);
    setDraftName("");
    setDraftPhone("");
    setDraftEmail("");
    setRelType("MOTHER");
    setRelNote("");
    setIsPrimary(false);
    setResetKey((k) => k + 1);
  };

  const submit = () => {
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    fd.set("relationshipType", relType);
    if (customRelationshipText) fd.set("relationship", customRelationshipText);
    if (isPrimary) fd.set("isPrimary", "on");

    if (mode === "pick") {
      if (!picked) { setError("Veli seç ya da + Yeni veli oluştur'a tıkla."); return; }
      fd.set("parentId", picked.id);
      startTransition(async () => {
        try {
          await linkAction(fd);
          setSuccess(`✓ ${picked.label} bağlandı.`);
          reset();
        } catch (e) { setError((e as Error).message); }
      });
    } else {
      if (!draftName.trim()) { setError("Veli adı zorunlu."); return; }
      fd.set("fullName", draftName.trim());
      if (draftPhone) fd.set("phone", draftPhone.trim());
      if (draftEmail) fd.set("email", draftEmail.trim());
      startTransition(async () => {
        try {
          await createAndLinkAction(fd);
          setSuccess(`✓ ${draftName.trim()} oluşturuldu ve bağlandı.`);
          reset();
        } catch (e) { setError((e as Error).message); }
      });
    }
  };

  return (
    <div
      className="od-grid g-3"
      style={{ gap: 12, alignItems: "end", marginTop: 12, padding: 12, border: "1px solid var(--pd-line)", borderRadius: 10, background: "var(--pd-bg-subtle, var(--pd-bg))" }}
    >
      <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--pd-ink-3, var(--pd-muted))", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
        {mode === "pick" ? "Veli ata" : "+ Yeni veli oluştur ve bağla"}
      </div>

      {mode === "pick" ? (
        <div style={{ gridColumn: "1 / span 2" }}>
          <label style={{ fontSize: 12, color: "var(--pd-muted)", display: "block", marginBottom: 4 }}>
            Veli ara
          </label>
          <EntitySearchCombobox
            entity="parents"
            placeholder="Ad, telefon veya email…"
            resetKey={resetKey}
            onChange={(_, row) => setPicked(row)}
            onCreateNew={(q) => {
              setDraftName(q);
              setMode("create");
            }}
            createNewLabel="+ Yeni veli oluştur"
          />
          <div style={{ fontSize: 11, color: "var(--pd-muted)", marginTop: 4 }}>
            Eşleşen veli yoksa, açılan listede &quot;+ Yeni veli oluştur&quot;a tıkla.
          </div>
        </div>
      ) : (
        <>
          <label style={{ fontSize: 12, gridColumn: "1 / span 2" }}>
            Ad Soyad *
            <input
              type="text"
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
              style={{ width: "100%", height: 34, padding: "0 10px", marginTop: 4,
                       border: "1px solid var(--pd-line)", borderRadius: 8,
                       background: "var(--pd-bg)", color: "var(--pd-ink)" }}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            Telefon
            <input
              type="tel"
              value={draftPhone}
              onChange={(e) => setDraftPhone(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              style={{ width: "100%", height: 34, padding: "0 10px", marginTop: 4,
                       border: "1px solid var(--pd-line)", borderRadius: 8,
                       background: "var(--pd-bg)", color: "var(--pd-ink)" }}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            Email
            <input
              type="email"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              style={{ width: "100%", height: 34, padding: "0 10px", marginTop: 4,
                       border: "1px solid var(--pd-line)", borderRadius: 8,
                       background: "var(--pd-bg)", color: "var(--pd-ink)" }}
            />
          </label>
        </>
      )}

      <label style={{ fontSize: 12 }}>
        Yakınlık
        <select
          value={relType}
          onChange={(e) => setRelType(e.target.value as ParentRelationshipType)}
          className="od-select"
          style={{ width: "100%", marginTop: 4 }}
        >
          {RELATIONSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      {relType === "OTHER" ? (
        <label style={{ fontSize: 12 }}>
          Yakınlık (özel)
          <input
            type="text"
            value={relNote}
            onChange={(e) => setRelNote(e.target.value)}
            placeholder="örn. Dede"
            style={{ width: "100%", height: 34, padding: "0 10px", marginTop: 4,
                     border: "1px solid var(--pd-line)", borderRadius: 8,
                     background: "var(--pd-bg)", color: "var(--pd-ink)" }}
          />
        </label>
      ) : null}

      <label style={{ fontSize: 12, alignSelf: "center" }}>
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
        />{" "}
        Birincil iletişim
      </label>

      {error ? (
        <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--pd-bad)" }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--pd-good)" }}>
          {success}
        </div>
      ) : null}

      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {mode === "create" ? (
          <button
            type="button"
            className="od-btn od-btn-ghost od-btn-sm"
            onClick={() => setMode("pick")}
            disabled={pending}
          >
            ← Mevcut veliyi seç
          </button>
        ) : null}
        <button
          type="button"
          className="od-btn od-btn-primary od-btn-sm"
          onClick={submit}
          disabled={pending}
        >
          {pending ? "…" : mode === "pick" ? "Bağla" : "Oluştur ve bağla"}
        </button>
      </div>
    </div>
  );
}
