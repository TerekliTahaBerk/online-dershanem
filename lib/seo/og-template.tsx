/**
 * Reusable OG image components — OD design system temalı.
 *
 * `next/og`'nin ImageResponse'i için JSX döner. Edge runtime gerektirir.
 * Tüm OG generator route'larından import edilir.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const OD_CREAM = "#FAFAF7";
const OD_OLIVE = "#5B6B3F";
const OD_INK = "#1B1B19";
const OD_MUTED = "#6B6B66";

export type OgVariant = "default" | "blog" | "package";

export function ogAccent(variant: OgVariant): string {
  if (variant === "blog") return "#7A4B2A";
  if (variant === "package") return "#1E5F3F";
  return OD_OLIVE;
}

export type OgProps = {
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  variant?: OgVariant;
};

/**
 * OG image JSX template. Tek dosyada paylaşılır.
 */
export function OgTemplate({ title, subtitle, badge, variant = "default" }: OgProps) {
  const accent = ogAccent(variant);
  const titleSize = title.length > 60 ? 56 : 68;
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: OD_CREAM,
        padding: "64px 72px",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        color: OD_INK,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: accent,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 22,
          }}
        >
          OD
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>
          Online Dershanem
        </div>
      </div>

      {/* Title block */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
        {badge ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: accent,
              color: "white",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {badge}
          </div>
        ) : null}
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -1.2,
            color: OD_INK,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 26, lineHeight: 1.4, color: OD_MUTED, maxWidth: 1000 }}>
            {subtitle}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `2px solid ${accent}`,
          paddingTop: 18,
          fontSize: 20,
          color: OD_MUTED,
        }}
      >
        <div>onlinedershanem.com</div>
        <div style={{ color: accent, fontWeight: 700 }}>LGS · YKS · Matematik</div>
      </div>
    </div>
  );
}
