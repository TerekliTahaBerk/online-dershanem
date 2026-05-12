"use client";

import { useEffect } from "react";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[panel error]", error);
  }, [error]);

  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>⚠️</span>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Bir şeyler ters gitti</h2>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
        Sayfa yüklenirken beklenmedik bir hata oluştu. Tekrar denemek için aşağıdaki butona basın.
      </p>
      {error?.message ? (
        <pre style={{
          background: "var(--surface-2, #f5f5f5)",
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          overflow: "auto",
          maxHeight: 160,
          marginBottom: 16,
        }}>{error.message}</pre>
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={reset} className="od-btn od-btn-primary">Tekrar dene</button>
        <a href="/panel" className="od-btn od-btn-ghost">Panele dön</a>
      </div>
    </div>
  );
}
