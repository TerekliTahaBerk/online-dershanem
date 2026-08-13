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
 * Bakım tamamlandığında önce aşağıdaki kod kilidini kaldırın, ardından ortam
 * değişkenini `PANEL_ENABLED=true` yapın. Kod kilidi, canlı ortamda daha önce
 * açık kalmış bir env değeri olsa bile panelin yanlışlıkla açılmasını önler.
 * `PANEL_MAINTENANCE_BYPASS=true` yalnız otomatik E2E workflow'larında panel
 * akışlarını test etmek için kullanılır; canlı ortama tanımlanmaz.
 *
 * `server-only`: bu değer client'ta okunamaz. `NEXT_PUBLIC_` öneki olmadığı
 * için client bundle'ında `undefined` olur ve sessizce `false` görünürdü —
 * import hatası, sessiz yanlış davranıştan iyidir.
 */
const PANEL_MAINTENANCE_MODE = process.env.PANEL_MAINTENANCE_BYPASS !== "true";

export const PANEL_ENABLED = !PANEL_MAINTENANCE_MODE && process.env.PANEL_ENABLED === "true";
