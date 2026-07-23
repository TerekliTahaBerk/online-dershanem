/**
 * Boot-time environment validation.
 *
 * Production'da eksik veya zayıf env varsa **uyar** (throw etmez — Vercel
 * cold-start'ları bozmasın). Critical olanlar prod'da yoksa explicit warn
 * + boot timestamp + git sha gibi bilgileri log'a yazar.
 *
 * Çağrım:
 *   - `instrumentation.ts` (Next.js 15 native hook) içinden tek seferlik.
 *   - veya server tarafı ilk request'te idempotent çağrılabilir.
 */
import "server-only";

type EnvCheck = {
  key: string;
  required: boolean;
  /** prod'da required mı? dev'de optional olabilir. */
  prodOnly?: boolean;
  description: string;
};

const CHECKS: EnvCheck[] = [
  { key: "DATABASE_URL", required: true, description: "PostgreSQL bağlantı dizesi" },
  { key: "DIRECT_URL", required: false, prodOnly: true, description: "Migration ve bakım için doğrudan PostgreSQL bağlantısı" },
  { key: "NEXT_PUBLIC_APP_URL", required: false, prodOnly: true, description: "Public site URL" },
  { key: "NEXTAUTH_SECRET", required: false, prodOnly: true, description: "Panel oturum imzalama anahtarı" },
  { key: "PANEL_ENABLED", required: false, prodOnly: true, description: "Panel yayın anahtarı; true veya false açıkça tanımlanmalı" },
  { key: "PAYTR_MERCHANT_ID", required: false, prodOnly: true, description: "PayTR (ödeme alacaksa zorunlu)" },
  { key: "PAYTR_MERCHANT_KEY", required: false, prodOnly: true, description: "PayTR" },
  { key: "PAYTR_MERCHANT_SALT", required: false, prodOnly: true, description: "PayTR" },
  { key: "RESEND_API_KEY", required: false, description: "Email gönderimi (opsiyonel)" },
  { key: "EMAIL_MODE", required: false, description: "Email kapsamı: receipts (varsayılan) veya all" },
  { key: "CRON_SECRET", required: false, prodOnly: true, description: "Cron route'ları korumak için bearer" },
  { key: "BLOB_READ_WRITE_TOKEN", required: false, prodOnly: true, description: "ODK kitapçıkları için özel Blob deposu" },
  { key: "ODK_ROLLOUT_MODE", required: false, prodOnly: true, description: "ODK general/pilot yayın modu" },
  { key: "ODK_PILOT_KILL_SWITCH", required: false, prodOnly: true, description: "ODK acil erişim kesme anahtarı" },
  { key: "ODK_PILOT_ACCEPTANCE_APPROVED", required: false, prodOnly: true, description: "ODK canlı kabul kanıtı" },
  { key: "ODK_PILOT_SECURITY_REVIEW_APPROVED", required: false, prodOnly: true, description: "ODK güvenlik ve çocuk verisi onayı" },
  { key: "ODK_PILOT_OPERATIONS_APPROVED", required: false, prodOnly: true, description: "ODK sınav günü operasyon onayı" },
  { key: "ODK_LAST_RESTORE_DRILL_AT", required: false, prodOnly: true, description: "Son başarılı ODK restore tatbikatı tarihi" },
];

type EnvStatus = { ok: boolean; missing: string[]; warnings: string[] };

let _status: EnvStatus | null = null;

export function validateEnvOnce(): EnvStatus {
  // Health ve smoke endpoint'leri boot doğrulamasından sonra da gerçek sonucu
  // görmeli. Önceki boolean kilit ikinci çağrıda hataları yanlışlıkla siliyordu.
  if (_status) return _status;

  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const c of CHECKS) {
    const v = process.env[c.key];
    const needed = c.required || (c.prodOnly && isProd);
    if (needed && !v) {
      missing.push(`${c.key} (${c.description})`);
    } else if (!v) {
      warnings.push(`${c.key}: tanımsız — ${c.description}`);
    }
  }

  // Redis tamamen opsiyoneldir; ikisi de yoksa bilinçli in-memory fallback'i
  // kullanılır. Yalnızca yarım yapılandırma gerçek bir operatör uyarısıdır.
  const redisUrl = Boolean(process.env.UPSTASH_REDIS_REST_URL);
  const redisToken = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (redisUrl !== redisToken) warnings.push("UPSTASH_REDIS: URL ve token birlikte tanımlanmalı");

  const banner = [
    "─".repeat(60),
    `[env] Boot validation — ${new Date().toISOString()}`,
    `[env] NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`,
    `[env] Vercel: ${process.env.VERCEL ? "yes" : "no"} (env=${process.env.VERCEL_ENV ?? "—"})`,
    missing.length === 0 ? "[env] ✓ tüm zorunlu değişkenler set" : `[env] ✗ EKSİK ZORUNLU: ${missing.length}`,
    ...missing.map((m) => `       - ${m}`),
    warnings.length > 0 ? `[env] uyarı: ${warnings.length}` : "",
    ...warnings.map((w) => `       · ${w}`),
    "─".repeat(60),
  ].filter(Boolean).join("\n");

  if (missing.length > 0) {
    console.error(banner);
  } else {
    console.log(banner);
  }

  _status = { ok: missing.length === 0, missing, warnings };
  return _status;
}
