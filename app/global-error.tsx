"use client";

/**
 * Global error boundary — Next.js App Router root-level.
 * Render hatalarını yakalar, kullanıcıya nazik bir mesaj gösterir.
 *
 * Server-side hatalar burada görünmez (zaten log'a düşer); bu bileşen
 * client-side render/runtime hatalarını yakalar.
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client error log'una düş — sunucu zaten kendi tarafını loglar
    // eslint-disable-next-line no-console
    console.error("[global-error]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "2rem", maxWidth: 640, margin: "4rem auto" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", color: "#dc2626" }}>
            Beklenmedik bir hata oluştu
          </h1>
          <p style={{ color: "#4b5563", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Sayfa yüklenirken bir sorunla karşılaşıldı. Lütfen tekrar deneyin.
            Sorun devam ederse{" "}
            <a href="/iletisim" style={{ color: "#2563eb", textDecoration: "underline" }}>
              bize ulaşın
            </a>
            .
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1.5rem" }}>
              Hata kodu: <code>{error.digest}</code>
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={reset}
              style={{
                background: "#2563eb",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Tekrar Dene
            </button>
            <a
              href="/"
              style={{
                background: "#f3f4f6",
                color: "#111827",
                padding: "0.5rem 1rem",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "1px solid #e5e7eb",
              }}
            >
              Ana Sayfa
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
