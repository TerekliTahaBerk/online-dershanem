/**
 * Eski panel (öğrenci / öğretmen / veli / admin) için merkezi feature-flag.
 *
 * Panel geçici olarak kapatıldı; yeni sürüm sıfırdan geliştirilecek. Public
 * site (landing, paketler, blog, ödeme/lead akışları) bu flag'den etkilenmez.
 *
 * Açma/kapama:
 *   - PANEL_ENABLED=true  → eski panel ve panel API'leri çalışır (eski davranış).
 *   - aksi her durumda     → panel kapalı; /panel-yenileniyor'a yönlendirilir,
 *                            panel/admin API'leri 503 döner.
 *
 * Env tanımsızsa panel KAPALI kabul edilir (production-safe default).
 *
 * Not: Middleware (Edge runtime) ve client component'ler ayrı ayrı okur:
 *   - Sunucu/Edge tarafı  → PANEL_ENABLED
 *   - Client (navbar vb.) → NEXT_PUBLIC_PANEL_ENABLED  ([[isPanelEnabledClient]])
 * İki değeri tutarlı set edin.
 */

function parseFlag(value: string | undefined): boolean {
  return value === "true";
}

/** Sunucu / Edge (middleware) tarafı panel durumu. Default: kapalı. */
export function isPanelEnabled(): boolean {
  return parseFlag(process.env.PANEL_ENABLED);
}

/** Client component'ler için panel durumu (navbar linkleri vb.). Default: kapalı. */
export function isPanelEnabledClient(): boolean {
  return parseFlag(process.env.NEXT_PUBLIC_PANEL_ENABLED);
}

/** Panel kapalıyken kullanıcıların yönlendirildiği public bakım sayfası. */
export const PANEL_MAINTENANCE_PATH = "/panel-yenileniyor";

/**
 * Public self-register feature-flag.
 *
 * Yeni ürün kuralı: public tarafta kullanıcı kendi kendine kayıt OLMAZ. Hesaplar
 * yalnızca admin/invite ile açılır. Kullanıcı public siteden ödeme yapar (guest
 * checkout), ödeme alındıktan sonra admin öğrenci/veli hesabını oluşturur ve
 * giriş bilgisi / tek kullanımlık davet linki verir. Bkz. [[isPanelEnabled]].
 *
 * Bu flag eski self-register akışını (`/kayit`, `/api/auth/send-code` REGISTER,
 * `/api/auth/complete-registration`) tamamen kapatır. Default: kapalı. Yalnızca
 * `PUBLIC_REGISTER_ENABLED=true` iken eski davranış geri döner (geri-alınabilir).
 *
 * NOT: PASSWORD_RESET akışı bu flag'den ETKİLENMEZ — davet/ilk giriş ve şifre
 * sıfırlama çalışmaya devam eder.
 */
export function isPublicRegisterEnabled(): boolean {
  return parseFlag(process.env.PUBLIC_REGISTER_ENABLED);
}

/** Public register kapalıyken JSON API'lerin döndüğü standart hata gövdesi. */
export const PUBLIC_REGISTER_DISABLED_ERROR = {
  error: {
    code: "PUBLIC_REGISTER_DISABLED",
    message:
      "Public kayıt kapalıdır. Hesaplar satın alma sonrası yönetim tarafından oluşturulur.",
  },
} as const;
