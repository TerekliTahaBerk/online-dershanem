/**
 * Oturum listesinde gösterilen kısa cihaz tanımı — saf, istemci ve sunucu
 * tarafından paylaşılır. Ham user-agent ekrana veya mobil yanıta çıkmaz.
 *
 * Native mobil uygulama girişte `OnlineDershanemMobile/<sürüm> (<platform>)`
 * user-agent'ı gönderir (`mobile/src/lib/api/client.ts`).
 */
export function sessionDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Bilinmeyen cihaz";
  const app = /OnlineDershanemMobile\/[\d.]+\s*\((ios|android)\)/i.exec(userAgent);
  if (app) return `Online Dershanem uygulaması · ${app[1].toLowerCase() === "ios" ? "iOS" : "Android"}`;
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Tarayıcı";
  const system =
    userAgent.includes("iPhone") || userAgent.includes("iPad")
      ? "iOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Windows")
            ? "Windows"
            : userAgent.includes("Linux")
              ? "Linux"
              : null;
  return system ? `${browser} · ${system}` : browser;
}
