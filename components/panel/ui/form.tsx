import type { ReactNode } from "react";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: "var(--pd-ink-2)" }}>{label}</span>
      {children}
      {hint ? <span className="od-muted" style={{ fontSize: 11 }}>{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        padding: "8px 10px",
        border: "1px solid var(--pd-line)",
        borderRadius: 8,
        background: "var(--pd-card)",
        color: "var(--pd-ink-1)",
        fontSize: 13,
        ...(props.style ?? {}),
      }}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        padding: "8px 10px",
        border: "1px solid var(--pd-line)",
        borderRadius: 8,
        background: "var(--pd-card)",
        color: "var(--pd-ink-1)",
        fontSize: 13,
        fontFamily: "inherit",
        resize: "vertical",
        minHeight: 80,
        ...(props.style ?? {}),
      }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="od-select"
      style={{ width: "100%", ...(props.style ?? {}) }}
    />
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>{children}</div>;
}
