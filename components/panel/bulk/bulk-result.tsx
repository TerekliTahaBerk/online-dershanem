"use client";

/**
 * Phase 3 / Session 8 — D9: Bulk operation result panel.
 *
 * Renders the standard {attempted, succeeded, skipped, failed, errors,
 * warnings} shape returned by `lib/panel/bulk-operations.ts`. v2 design
 * system — uses `Badge` tones and `od-card` classes only; no inline shadcn.
 */

import { Badge } from "@/components/panel/ui/badge";
import type { BulkOperationResult } from "@/lib/panel/bulk-operations";

type Props = {
  result: BulkOperationResult | null;
  /** Optional dismiss handler — when omitted, the panel stays. */
  onDismiss?: () => void;
};

export function BulkOperationResultPanel({ result, onDismiss }: Props) {
  if (!result || result.attempted === 0) return null;

  const headlineTone =
    result.failed > 0 ? "bad" : result.skipped > 0 ? "warn" : "ok";
  const headline =
    result.failed > 0
      ? `${result.failed} işlem başarısız`
      : result.skipped > 0
      ? `${result.succeeded}/${result.attempted} tamamlandı (${result.skipped} atlandı)`
      : `${result.succeeded}/${result.attempted} işlem tamamlandı`;

  // invites payload: surface URL list once so admin can copy out-of-band
  const invites = (result.data?.invites as Array<{ url: string }> | undefined) ?? [];

  return (
    <div
      className="od-card"
      role="status"
      aria-live="polite"
      style={{ marginTop: 16 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderBottom: "1px solid var(--od-border, #e5e7eb)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge tone={headlineTone}>{headline}</Badge>
          <span className="od-muted" style={{ fontSize: 12 }}>
            <code className="od-mono">{result.op}</code>
          </span>
        </div>
        {onDismiss ? (
          <button
            type="button"
            className="od-btn od-btn-ghost od-btn-sm"
            onClick={onDismiss}
            aria-label="Kapat"
          >
            Kapat
          </button>
        ) : null}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          padding: 14,
        }}
      >
        <Stat label="Denenen" value={result.attempted} tone="neutral" />
        <Stat label="Başarılı" value={result.succeeded} tone="ok" />
        <Stat label="Atlandı" value={result.skipped} tone="warn" />
        <Stat label="Hatalı" value={result.failed} tone={result.failed > 0 ? "bad" : "neutral"} />
      </div>

      {invites.length > 0 ? (
        <details style={{ padding: "0 14px 12px" }}>
          <summary style={{ cursor: "pointer", fontSize: 13 }}>
            Davet linklerini göster ({invites.length})
          </summary>
          <textarea
            readOnly
            className="od-mono"
            style={{
              marginTop: 8,
              width: "100%",
              minHeight: 120,
              fontSize: 11,
              padding: 8,
              border: "1px solid var(--od-border, #e5e7eb)",
              borderRadius: 6,
              background: "#fafafa",
            }}
            value={invites.map((i) => i.url).join("\n")}
            onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
          />
          <p className="od-muted" style={{ fontSize: 11, marginTop: 4 }}>
            Bu liste yalnızca bir kez gösterilir; admin panelinde de kayıtlı değildir. Linkleri
            ilgililere kendiniz iletmelisiniz.
          </p>
        </details>
      ) : null}

      {(result.warnings.length > 0 || result.errors.length > 0) ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: result.errors.length > 0 && result.warnings.length > 0 ? "1fr 1fr" : "1fr",
            gap: 12,
            padding: "0 14px 14px",
          }}
        >
          {result.warnings.length > 0 ? (
            <MessageList title="Atlanan kayıtlar" tone="warn" items={result.warnings.map((w) => ({ id: w.id, msg: w.message }))} />
          ) : null}
          {result.errors.length > 0 ? (
            <MessageList title="Hatalar" tone="bad" items={result.errors.map((e) => ({ id: e.id, msg: e.reason }))} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "bad" | "neutral" }) {
  return (
    <div
      style={{
        border: "1px solid var(--od-border, #e5e7eb)",
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600 }}>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <div className="od-muted" style={{ fontSize: 11, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function MessageList({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ id: string; msg: string }>;
  tone: "warn" | "bad";
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Badge tone={tone}>{title}</Badge>
        <span className="od-muted" style={{ fontSize: 11 }}>
          ({items.length})
        </span>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          maxHeight: 180,
          overflow: "auto",
          fontSize: 12,
          border: "1px solid var(--od-border, #e5e7eb)",
          borderRadius: 6,
        }}
      >
        {items.slice(0, 100).map((it, idx) => (
          <li
            key={`${it.id}-${idx}`}
            style={{
              padding: "6px 10px",
              borderBottom: idx < items.length - 1 ? "1px solid var(--od-border, #f1f5f9)" : "none",
            }}
          >
            <code className="od-mono" style={{ fontSize: 10, color: "var(--od-muted, #64748b)" }}>
              {it.id.slice(0, 8)}
            </code>{" "}
            <span>{it.msg}</span>
          </li>
        ))}
        {items.length > 100 ? (
          <li style={{ padding: "6px 10px" }} className="od-muted">
            … ve {items.length - 100} kayıt daha
          </li>
        ) : null}
      </ul>
    </div>
  );
}
