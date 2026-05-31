"use client";

/**
 * StudentParentSection — D7 operational parent unit on student edit page.
 *
 * Replaces the prior simple parent table + ParentLinkCard with:
 *   1) Rich parent cards (account state badge, last-login/invite hint,
 *      child count, primary flag, inline relationship editor, unlink).
 *   2) Inline "Veli ata" panel with two modes:
 *        a. "Mevcut veliyi bağla" — search parents, pick one, set
 *           relationship + primary, link via upsert.
 *        b. "Yeni veli oluştur ve bağla" — full account options
 *           (none / invite / tempPassword), live duplicate detection,
 *           result shows invite URL or temp password.
 *
 * Heavy account lifecycle (rotate invite, force password change, disable)
 * is intentionally NOT exposed here — links to parent detail cockpit.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/panel/ui/badge";
import { EntitySearchCombobox, type ComboboxRow } from "@/components/panel/ui/entity-search-combobox";
import {
  PARENT_RELATIONSHIP_TYPES,
  getCanonicalRelationshipLabel,
  type ParentRelationshipType,
} from "@/lib/parents";
import { createParentWithAccountAction, lookupParentDuplicatesAction } from "@/app/panel/admin/veliler/_actions";
import type { DuplicateMatch } from "@/lib/panel/account-onboarding-shared";

// ── Types ────────────────────────────────────────────────────────────────

type AccountStateTone = "good" | "warn" | "bad" | "neutral";

type ParentRow = {
  parentId: string;
  isPrimary: boolean;
  relationship: string | null;
  relationshipType: ParentRelationshipType | null;
  parent: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    childrenCount: number;
    accountStateLabel: string;
    accountStateTone: AccountStateTone;
    lastLoginAt: Date | null;
    inviteExpiresAt: Date | null;
    hasInvite: boolean;
  };
};

type Props = {
  studentId: string;
  parents: ParentRow[];
  linkExistingAction: (fd: FormData) => Promise<unknown> | unknown;
  unlinkAction: (parentId: string) => Promise<unknown> | unknown;
};

// ── Local helpers ────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS: ReadonlyArray<{ value: ParentRelationshipType; label: string }> =
  PARENT_RELATIONSHIP_TYPES.map((v) => ({ value: v, label: getCanonicalRelationshipLabel(v) }));

/** Map onboarding tone → Badge tone (Badge expects "ok" not "good"). */
function badgeTone(t: AccountStateTone): "ok" | "warn" | "bad" | "neutral" {
  if (t === "good") return "ok";
  return t;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

function relativeDays(d: Date | null | undefined): string | null {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "bugün";
  if (days === 1) return "1 gün önce";
  if (days < 30) return `${days} gün önce`;
  return fmtDate(d);
}

function metaHint(p: ParentRow["parent"]): string | null {
  if (p.lastLoginAt) {
    const r = relativeDays(p.lastLoginAt);
    return r ? `Son giriş: ${r}` : null;
  }
  if (p.hasInvite && p.inviteExpiresAt) {
    return `Davet: ${fmtDate(p.inviteExpiresAt)} sonuna kadar`;
  }
  if (p.hasInvite) {
    return "Davet bekliyor";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Card for a single linked parent
// ─────────────────────────────────────────────────────────────────────────

function ParentCard({
  row,
  studentId,
  linkExistingAction,
  unlinkAction,
}: {
  row: ParentRow;
  studentId: string;
  linkExistingAction: Props["linkExistingAction"];
  unlinkAction: Props["unlinkAction"];
}) {
  const [editing, setEditing] = useState(false);
  const [relType, setRelType] = useState<ParentRelationshipType>(row.relationshipType ?? "OTHER");
  const [relNote, setRelNote] = useState<string>(row.relationship ?? "");
  const [isPrimary, setIsPrimary] = useState(row.isPrimary);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const p = row.parent;
  const detailHref = `/panel/admin/veliler/${p.id}/duzenle`;
  const hint = metaHint(p);
  const customRelLabel = row.relationshipType === "OTHER" && row.relationship
    ? row.relationship
    : null;
  const relDisplay = row.relationshipType
    ? customRelLabel ?? getCanonicalRelationshipLabel(row.relationshipType)
    : (row.relationship ?? "—");

  const saveRel = () => {
    setError(null);
    const fd = new FormData();
    fd.set("parentId", p.id);
    fd.set("relationshipType", relType);
    if (relType === "OTHER" && relNote.trim()) fd.set("relationship", relNote.trim());
    if (isPrimary) fd.set("isPrimary", "on");
    startTransition(async () => {
      try {
        await linkExistingAction(fd);
        setEditing(false);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const remove = () => {
    if (!confirm(`${p.fullName} bağı kaldırılacak. Devam edilsin mi?`)) return;
    startTransition(async () => {
      try {
        await unlinkAction(p.id);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div
      style={{
        border: "1px solid var(--pd-line)",
        borderRadius: 10,
        padding: 14,
        background: "var(--pd-bg)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 2 }}>
          <Link href={detailHref} className="od-link" style={{ fontWeight: 700, fontSize: 15 }}>
            {p.fullName}
          </Link>
          <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>
            {relDisplay}
            {row.isPrimary ? <> · <span style={{ color: "var(--pd-good, #10b981)" }}>Birincil iletişim</span></> : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Badge tone={badgeTone(p.accountStateTone)}>{p.accountStateLabel}</Badge>
          {p.childrenCount > 1 ? (
            <Badge tone="neutral">{p.childrenCount} çocuk</Badge>
          ) : null}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--pd-muted)", display: "grid", gap: 2 }}>
        <div>📞 {p.phone ?? <span style={{ color: "var(--pd-bad)" }}>Telefon yok</span>}</div>
        <div>✉️ {p.email ?? <span style={{ color: "var(--pd-warn, #f59e0b)" }}>Email yok</span>}</div>
        {hint ? <div>{hint}</div> : null}
      </div>

      {editing ? (
        <div style={{ display: "grid", gap: 8, padding: 10, border: "1px dashed var(--pd-line)", borderRadius: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
                  style={{ width: "100%", height: 32, padding: "0 10px", marginTop: 4,
                           border: "1px solid var(--pd-line)", borderRadius: 8,
                           background: "var(--pd-bg)", color: "var(--pd-ink)" }}
                />
              </label>
            ) : <span />}
          </div>
          <label style={{ fontSize: 12 }}>
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />{" "}
            Birincil iletişim
          </label>
          {error ? <div style={{ fontSize: 12, color: "var(--pd-bad)" }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={() => setEditing(false)} disabled={pending}>İptal</button>
            <button type="button" className="od-btn od-btn-primary od-btn-sm" onClick={saveRel} disabled={pending}>
              {pending ? "…" : "Kaydet"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link href={detailHref} className="od-btn od-btn-ghost od-btn-sm">Veli detayı →</Link>
          <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={() => setEditing(true)} disabled={pending}>
            İlişkiyi düzenle
          </button>
          <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={remove} disabled={pending} style={{ color: "var(--pd-bad)" }}>
            Bağı kaldır
          </button>
          {error ? <span style={{ fontSize: 12, color: "var(--pd-bad)", alignSelf: "center" }}>{error}</span> : null}
        </div>
      )}
      {/* hidden link to keep `studentId` in props (and silence unused-vars). */}
      <span hidden data-student={studentId} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Inline panel — link existing OR create new
// ─────────────────────────────────────────────────────────────────────────

type PanelMode = "pick" | "create";

function copyText(s: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(s);
  }
}

function ResultPanel({
  parentId,
  fullName,
  inviteUrl,
  tempPassword,
  onClose,
}: {
  parentId: string;
  fullName: string;
  inviteUrl?: string | null;
  tempPassword?: string | null;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        border: "1px solid var(--pd-line)",
        borderRadius: 10,
        background: "var(--pd-bg)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>✓ {fullName} oluşturuldu ve bağlandı</strong>
        <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={onClose}>Kapat</button>
      </div>
      {inviteUrl ? (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--pd-muted)" }}>Davet bağlantısı (tek seferlik gösterim):</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              readOnly
              value={inviteUrl}
              style={{ flex: 1, height: 32, padding: "0 10px",
                       border: "1px solid var(--pd-line)", borderRadius: 8,
                       background: "var(--pd-bg-subtle, var(--pd-bg))", color: "var(--pd-ink)" }}
            />
            <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={() => copyText(inviteUrl)}>Kopyala</button>
          </div>
        </div>
      ) : null}
      {tempPassword ? (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--pd-muted)" }}>Geçici şifre (tek seferlik gösterim):</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              readOnly
              value={tempPassword}
              style={{ flex: 1, height: 32, padding: "0 10px",
                       border: "1px solid var(--pd-line)", borderRadius: 8,
                       background: "var(--pd-bg-subtle, var(--pd-bg))", color: "var(--pd-ink)" }}
            />
            <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={() => copyText(tempPassword)}>Kopyala</button>
          </div>
        </div>
      ) : null}
      <div>
        <Link href={`/panel/admin/veliler/${parentId}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
          Veli detayına git →
        </Link>
      </div>
    </div>
  );
}

function InlinePanel({
  studentId,
  linkExistingAction,
  existingParentIds,
}: {
  studentId: string;
  linkExistingAction: Props["linkExistingAction"];
  existingParentIds: Set<string>;
}) {
  const [mode, setMode] = useState<PanelMode>("pick");

  // ─── Pick mode state
  const [picked, setPicked] = useState<ComboboxRow | null>(null);
  const [pickRel, setPickRel] = useState<ParentRelationshipType>("MOTHER");
  const [pickRelNote, setPickRelNote] = useState("");
  const [pickPrimary, setPickPrimary] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // ─── Create mode state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [accountMode, setAccountMode] = useState<"none" | "invite" | "tempPassword">("none");
  const [createRel, setCreateRel] = useState<ParentRelationshipType>("MOTHER");
  const [createRelNote, setCreateRelNote] = useState("");
  const [createPrimary, setCreatePrimary] = useState(false);

  // ─── Common UI state
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [result, setResult] = useState<{
    parentId: string;
    fullName: string;
    inviteUrl?: string | null;
    tempPassword?: string | null;
  } | null>(null);

  // ─── Live duplicate detection (debounced) for create mode
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (mode !== "create") {
      setDuplicates([]);
      return;
    }
    if (!phone && !email) {
      setDuplicates([]);
      return;
    }
    if (dupTimer.current) clearTimeout(dupTimer.current);
    dupTimer.current = setTimeout(() => {
      lookupParentDuplicatesAction({ phone: phone.trim(), email: email.trim() })
        .then((matches) => setDuplicates(matches))
        .catch(() => { /* swallow — non-critical */ });
    }, 350);
    return () => {
      if (dupTimer.current) clearTimeout(dupTimer.current);
    };
  }, [phone, email, mode]);

  const blockingDup = useMemo(
    () => duplicates.find((d) => d.entity === "Parent" && (d.field === "phoneKey" || d.field === "email")),
    [duplicates],
  );

  const accountNeedsEmail = accountMode !== "none";
  const accountEmailMissing = accountNeedsEmail && !email.trim();
  const otherMissing =
    (mode === "pick" && pickRel === "OTHER" && !pickRelNote.trim()) ||
    (mode === "create" && createRel === "OTHER" && !createRelNote.trim());

  const reset = () => {
    setPicked(null);
    setPickRel("MOTHER");
    setPickRelNote("");
    setPickPrimary(false);
    setName("");
    setPhone("");
    setEmail("");
    setAccountMode("none");
    setCreateRel("MOTHER");
    setCreateRelNote("");
    setCreatePrimary(false);
    setError(null);
    setDuplicates([]);
    setResetKey((k) => k + 1);
  };

  const submitPick = () => {
    setError(null);
    setSuccess(null);
    if (!picked) { setError("Veli seç ya da 'Yeni veli oluştur' sekmesine geç."); return; }
    if (existingParentIds.has(picked.id)) { setError("Bu veli zaten bağlı."); return; }
    if (pickRel === "OTHER" && !pickRelNote.trim()) {
      setError("Diğer için açıklama gerekli.");
      return;
    }
    const fd = new FormData();
    fd.set("parentId", picked.id);
    fd.set("relationshipType", pickRel);
    if (pickRel === "OTHER" && pickRelNote.trim()) fd.set("relationship", pickRelNote.trim());
    if (pickPrimary) fd.set("isPrimary", "on");
    const label = picked.label;
    startTransition(async () => {
      try {
        await linkExistingAction(fd);
        setSuccess(`✓ ${label} bağlandı.`);
        reset();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const submitCreate = () => {
    setError(null);
    setSuccess(null);
    if (!name.trim()) { setError("Ad Soyad gerekli."); return; }
    if (accountEmailMissing) { setError("Hesap oluşturmak için email gerekli."); return; }
    if (createRel === "OTHER" && !createRelNote.trim()) {
      setError("Diğer için açıklama gerekli.");
      return;
    }
    const fd = new FormData();
    fd.set("fullName", name.trim());
    if (phone.trim()) fd.set("phone", phone.trim());
    if (email.trim()) fd.set("email", email.trim());
    fd.set("accountMode", accountMode);
    fd.set("relationshipType", createRel);
    if (createRel === "OTHER" && createRelNote.trim()) fd.set("relationship", createRelNote.trim());
    if (createPrimary) fd.set("isPrimary", "on");
    fd.append("studentIds", studentId);
    const label = name.trim();
    startTransition(async () => {
      try {
        const res = await createParentWithAccountAction(fd);
        setResult({
          parentId: res.parentId,
          fullName: label,
          inviteUrl: res.inviteUrl ?? null,
          tempPassword: res.tempPassword ?? null,
        });
        reset();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  if (result) {
    return (
      <ResultPanel
        parentId={result.parentId}
        fullName={result.fullName}
        inviteUrl={result.inviteUrl}
        tempPassword={result.tempPassword}
        onClose={() => setResult(null)}
      />
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        border: "1px solid var(--pd-line)",
        borderRadius: 10,
        background: "var(--pd-bg-subtle, var(--pd-bg))",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--pd-line)", paddingBottom: 8 }}>
        <button
          type="button"
          className={`od-btn od-btn-sm ${mode === "pick" ? "od-btn-primary" : "od-btn-ghost"}`}
          onClick={() => { setMode("pick"); setError(null); setSuccess(null); }}
        >
          Mevcut veliyi bağla
        </button>
        <button
          type="button"
          className={`od-btn od-btn-sm ${mode === "create" ? "od-btn-primary" : "od-btn-ghost"}`}
          onClick={() => { setMode("create"); setError(null); setSuccess(null); }}
        >
          Yeni veli oluştur ve bağla
        </button>
      </div>

      {mode === "pick" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 12 }}>
            Veli ara
            <EntitySearchCombobox
              entity="parents"
              placeholder="Ad, telefon veya email…"
              resetKey={resetKey}
              onChange={(_, row) => setPicked(row)}
              onCreateNew={(q) => { setName(q); setMode("create"); }}
              createNewLabel="+ Yeni veli oluştur"
            />
          </label>
          {picked && existingParentIds.has(picked.id) ? (
            <div style={{ fontSize: 12, color: "var(--pd-warn, #f59e0b)" }}>
              ⚠ Bu veli bu öğrenciye zaten bağlı.
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ fontSize: 12 }}>
              Yakınlık
              <select
                value={pickRel}
                onChange={(e) => setPickRel(e.target.value as ParentRelationshipType)}
                className="od-select"
                style={{ width: "100%", marginTop: 4 }}
              >
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {pickRel === "OTHER" ? (
              <label style={{ fontSize: 12 }}>
                Yakınlık (özel) *
                <input
                  type="text"
                  value={pickRelNote}
                  onChange={(e) => setPickRelNote(e.target.value)}
                  placeholder="örn. Dede"
                  style={{ width: "100%", height: 32, padding: "0 10px", marginTop: 4,
                           border: "1px solid var(--pd-line)", borderRadius: 8,
                           background: "var(--pd-bg)", color: "var(--pd-ink)" }}
                />
              </label>
            ) : <span />}
          </div>
          <label style={{ fontSize: 12 }}>
            <input type="checkbox" checked={pickPrimary} onChange={(e) => setPickPrimary(e.target.checked)} />{" "}
            Birincil iletişim
          </label>
          {error ? <div style={{ fontSize: 12, color: "var(--pd-bad)" }}>{error}</div> : null}
          {success ? <div style={{ fontSize: 12, color: "var(--pd-good, #10b981)" }}>{success}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="od-btn od-btn-primary od-btn-sm"
              onClick={submitPick}
              disabled={pending || !picked || (picked && existingParentIds.has(picked.id)) || otherMissing}
            >
              {pending ? "…" : "Bağla"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>
              Ad Soyad *
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", height: 32, padding: "0 10px", marginTop: 4,
                         border: "1px solid var(--pd-line)", borderRadius: 8,
                         background: "var(--pd-bg)", color: "var(--pd-ink)" }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Telefon
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                style={{ width: "100%", height: 32, padding: "0 10px", marginTop: 4,
                         border: "1px solid var(--pd-line)", borderRadius: 8,
                         background: "var(--pd-bg)", color: "var(--pd-ink)" }}
              />
            </label>
            <label style={{ fontSize: 12 }}>
              Email{accountNeedsEmail ? " *" : ""}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", height: 32, padding: "0 10px", marginTop: 4,
                         border: `1px solid ${accountEmailMissing ? "var(--pd-bad)" : "var(--pd-line)"}`,
                         borderRadius: 8,
                         background: "var(--pd-bg)", color: "var(--pd-ink)" }}
              />
              {accountEmailMissing ? (
                <span style={{ fontSize: 11, color: "var(--pd-bad)" }}>Hesap için email gerekli.</span>
              ) : null}
            </label>
          </div>

          {/* Duplicate warning */}
          {blockingDup ? (
            <div
              style={{
                padding: 10,
                border: "1px solid var(--pd-warn, #f59e0b)",
                background: "color-mix(in srgb, var(--pd-warn, #f59e0b) 10%, transparent)",
                borderRadius: 8,
                fontSize: 12,
                display: "grid",
                gap: 6,
              }}
            >
              <strong>⚠ Aynı {blockingDup.field === "email" ? "email" : "telefon"} ile veli mevcut</strong>
              <div>
                {blockingDup.existingLabel} ·{" "}
                <Link href={`/panel/admin/veliler/${blockingDup.existingId}/duzenle`} className="od-link">
                  veliyi aç →
                </Link>
              </div>
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                onClick={() => { setMode("pick"); setError(null); }}
              >
                Mevcut veliyi seç
              </button>
            </div>
          ) : duplicates.length > 0 ? (
            <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>
              Benzer kayıtlar: {duplicates.slice(0, 3).map((d) => d.existingLabel).join(", ")}
            </div>
          ) : null}

          {/* Account mode */}
          <fieldset style={{ border: "1px solid var(--pd-line)", borderRadius: 8, padding: 10 }}>
            <legend style={{ fontSize: 12, padding: "0 6px", color: "var(--pd-muted)" }}>Hesap</legend>
            <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
              <label>
                <input type="radio" name="acc" checked={accountMode === "none"} onChange={() => setAccountMode("none")} />{" "}
                Hesap oluşturma (sadece veli kaydı)
              </label>
              <label>
                <input type="radio" name="acc" checked={accountMode === "invite"} onChange={() => setAccountMode("invite")} />{" "}
                Davet bağlantısı oluştur
              </label>
              <label>
                <input type="radio" name="acc" checked={accountMode === "tempPassword"} onChange={() => setAccountMode("tempPassword")} />{" "}
                Geçici şifre üret
              </label>
            </div>
          </fieldset>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ fontSize: 12 }}>
              Yakınlık
              <select
                value={createRel}
                onChange={(e) => setCreateRel(e.target.value as ParentRelationshipType)}
                className="od-select"
                style={{ width: "100%", marginTop: 4 }}
              >
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {createRel === "OTHER" ? (
              <label style={{ fontSize: 12 }}>
                Yakınlık (özel) *
                <input
                  type="text"
                  value={createRelNote}
                  onChange={(e) => setCreateRelNote(e.target.value)}
                  placeholder="örn. Dede"
                  style={{ width: "100%", height: 32, padding: "0 10px", marginTop: 4,
                           border: "1px solid var(--pd-line)", borderRadius: 8,
                           background: "var(--pd-bg)", color: "var(--pd-ink)" }}
                />
              </label>
            ) : <span />}
          </div>
          <label style={{ fontSize: 12 }}>
            <input type="checkbox" checked={createPrimary} onChange={(e) => setCreatePrimary(e.target.checked)} />{" "}
            Birincil iletişim
          </label>

          {error ? <div style={{ fontSize: 12, color: "var(--pd-bad)" }}>{error}</div> : null}
          {success ? <div style={{ fontSize: 12, color: "var(--pd-good, #10b981)" }}>{success}</div> : null}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={() => { setMode("pick"); setError(null); }} disabled={pending}>
              ← Mevcut veliyi seç
            </button>
            <button
              type="button"
              className="od-btn od-btn-primary od-btn-sm"
              onClick={submitCreate}
              disabled={pending || !name.trim() || accountEmailMissing || otherMissing}
            >
              {pending ? "…" : "Oluştur ve bağla"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Top-level export
// ─────────────────────────────────────────────────────────────────────────

export function StudentParentSection({
  studentId,
  parents,
  linkExistingAction,
  unlinkAction,
}: Props) {
  const [showPanel, setShowPanel] = useState(parents.length === 0);
  const existingParentIds = useMemo(() => new Set(parents.map((p) => p.parentId)), [parents]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
          Veliler
          {parents.length > 0 ? (
            <span style={{ fontWeight: 400, color: "var(--pd-muted)", marginLeft: 8 }}>· {parents.length}</span>
          ) : null}
        </h3>
        <button
          type="button"
          className={`od-btn od-btn-sm ${showPanel ? "od-btn-ghost" : "od-btn-primary"}`}
          onClick={() => setShowPanel((v) => !v)}
        >
          {showPanel ? "Kapat" : "+ Veli ata"}
        </button>
      </div>

      {parents.length === 0 ? (
        <div
          style={{
            padding: 14,
            border: "1px dashed var(--pd-line)",
            borderRadius: 10,
            color: "var(--pd-muted)",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Bu öğrenciye henüz veli bağlı değil. Mevcut bir veliyi bağlamak ya da yeni bir veli oluşturmak için
          <strong> + Veli ata</strong> butonunu kullanın.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {parents.map((row) => (
            <ParentCard
              key={row.parentId}
              row={row}
              studentId={studentId}
              linkExistingAction={linkExistingAction}
              unlinkAction={unlinkAction}
            />
          ))}
        </div>
      )}

      {showPanel ? (
        <InlinePanel
          studentId={studentId}
          linkExistingAction={linkExistingAction}
          existingParentIds={existingParentIds}
        />
      ) : null}
    </div>
  );
}
