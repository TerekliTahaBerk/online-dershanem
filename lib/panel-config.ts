import "server-only";

/**
 * Panel kilidi.
 *
 * Panel yeniden yazılırken burada ayrıca bir KOD kilidi vardı: ortam değişkeni
 * `true` olsa bile panel kapalı kalıyordu, çünkü bu repodaki commit'ler
 * otomatik olarak canlıya çıkıyor ve yarım ekranların sızma riski gerçekti.
 * Panel 2026-08-15'te açıldı; kod kilidi kaldırıldı. Tek otorite artık ortam
 * değişkeni.
 *
 * Kapalıyken (`PANEL_ENABLED` ≠ "true"):
 *   - `/giris`      → "Panelimiz sizin için yenileniyor" mesajı (giriş formu yok)
 *   - `/panel/*`    → 404
 *   - panel API'leri → 503
 *
 * DİKKAT: bu değer proxy katmanında derleme anında gömülür. Vercel'de env
 * değiştirmek tek başına yetmez; YENİDEN DEPLOY gerekir. Paneli acilen
 * kapatmak gerekirse `PANEL_ENABLED=false` yapıp redeploy edin.
 *
 * `server-only`: bu değer client'ta okunamaz. `NEXT_PUBLIC_` öneki olmadığı
 * için client bundle'ında `undefined` olur ve sessizce `false` görünürdü —
 * import hatası, sessiz yanlış davranıştan iyidir.
 */
export const PANEL_ENABLED = process.env.PANEL_ENABLED === "true";

/**
 * Başvurular Tally üzerinden alınır; hesapları yönetim ekibi panelden açar.
 * Eski PUBLIC_REGISTER_ENABLED ortam değişkeni kendi kendine kaydı açamaz.
 * Panel girişi ve yönetimin hesap oluşturma yetkisi bundan etkilenmez.
 */
export const PUBLIC_REGISTER_ENABLED = false;
