import "server-only";

/**
 * Panel kilidi.
 *
 * Panel sıfırdan yazılıyor ve bu repodaki commit'ler otomatik olarak canlıya
 * çıkıyor. Bu yüzden panel, tamamlanana kadar VARSAYILAN OLARAK KAPALI kalır;
 * yarım kalmış ekranlar gerçek ziyaretçilere görünmez.
 *
 * Kapalıyken:
 *   - `/giris`      → "Panelimiz sizin için yenileniyor" mesajı (giriş formu yok)
 *   - `/panel/*`    → 404
 *   - panel API'leri → 503
 *
 * Açmak için ortam değişkeni: `PANEL_ENABLED=true`
 *
 * `server-only`: bu değer client'ta okunamaz. `NEXT_PUBLIC_` öneki olmadığı
 * için client bundle'ında `undefined` olur ve sessizce `false` görünürdü —
 * import hatası, sessiz yanlış davranıştan iyidir.
 */
export const PANEL_ENABLED = process.env.PANEL_ENABLED === "true";
