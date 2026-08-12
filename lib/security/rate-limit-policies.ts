import type { RateLimitOpts } from "@/lib/security/rate-limit";

/** Central policies for Y-67's burst-race coverage. Values preserve endpoint intent. */
export const RATE_LIMIT_POLICIES = {
  login: {
    action: "auth.login",
    limit: {
      max: 10,
      windowMs: 15 * 60_000,
      message: "Çok fazla deneme. Biraz sonra tekrar deneyin.",
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
} as const satisfies Record<
  string,
  { action: string; limit: RateLimitOpts }
>;
