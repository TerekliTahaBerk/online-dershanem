import type { RateLimitOpts } from "@/lib/security/rate-limit";

/** Central policies for Y-67's burst-race coverage. Values preserve endpoint intent. */
export const RATE_LIMIT_POLICIES = {
  /**
   * IP başına KABA sel koruması — hesap bazlı kaba kuvvet koruması değil.
   *
   * Hedefli deneme zaten hesap üzerinde tutuluyor: `app/api/auth/login`
   * `failedAttempts` sayacı ve `lockedUntil` ile hesabı geçici kilitliyor.
   * Buradaki sayaç ise BAŞARILI girişleri de tüketiyor ve yalnız IP'ye bakıyor;
   * 15 dakikada 10 iken tek IP arkasındaki bir ev (iki öğrenci + veli), okul
   * laboratuvarı veya paylaşımlı NAT normal kullanımda "Çok fazla deneme"
   * duvarına çarpıyordu. Tavan gerçek kullanım için yükseltildi; hesap kilidi
   * dokunulmadan duruyor.
   */
  login: {
    action: "auth.login",
    limit: {
      max: 40,
      windowMs: 15 * 60_000,
      message: "Çok fazla deneme. Biraz sonra tekrar deneyin.",
    },
  },
  register: {
    action: "auth.register",
    limit: {
      max: 5,
      windowMs: 60 * 60_000,
      message: "Çok fazla kayıt denemesi. Lütfen bir süre sonra tekrar deneyin.",
    },
  },
  odCheckout: {
    action: "checkout.od",
    limit: {
      max: 8,
      windowMs: 10 * 60_000,
      message:
        "Çok fazla ödeme denemesi yapıldı. Lütfen 10 dakika sonra tekrar deneyin.",
    },
  },
  odkCheckout: {
    action: "checkout.odk",
    limit: {
      max: 8,
      windowMs: 10 * 60_000,
      message: "Çok fazla ödeme denemesi yapıldı. Lütfen 10 dakika sonra tekrar deneyin.",
    },
  },
  odkAnswer: {
    action: "odk.attempt.answer",
    limit: { max: 600, windowMs: 15 * 60_000 },
  },
  odkHeartbeat: {
    action: "odk.attempt.heartbeat",
    limit: { max: 45, windowMs: 15 * 60_000 },
  },
  odkSubmit: {
    action: "odk.attempt.submit",
    limit: { max: 15, windowMs: 15 * 60_000 },
  },
  /**
   * Hesap devralma daveti kimlik doğrulaması OLMADAN parola belirletir; bu
   * yüzden parola sıfırlamayla aynı sınıfta tutulur. Tavan gerçek kullanım
   * için değil, token tahmini için dardır: davet bağlantısı e-postadan tek
   * tıkla açılır, normal bir kullanıcı birkaç denemeden fazlasını yapmaz.
   */
  accountClaim: {
    action: "auth.account_claim",
    limit: {
      max: 12,
      windowMs: 15 * 60_000,
      message: "Çok fazla deneme. Biraz sonra tekrar deneyin.",
    },
  },
} as const satisfies Record<
  string,
  { action: string; limit: RateLimitOpts }
>;
