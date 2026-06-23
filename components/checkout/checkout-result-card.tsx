import Link from "next/link";
import { CheckCircle2, AlertTriangle, Clock, GraduationCap, ShieldCheck } from "lucide-react";

export type CheckoutResultStatus = "success" | "failed" | "pending";

type ResultAction = {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
};

type Props = {
  status: CheckoutResultStatus;
  /** Üst eyebrow yazısı — örn. "OD" veya "ODK" */
  eyebrow?: string;
  /** Başlık override — yoksa status'a göre default kullanılır */
  title?: string;
  /** Açıklama override */
  description?: React.ReactNode;
  /** Başarı durumunda gösterilecek "next step" notu */
  nextStepNote?: React.ReactNode;
  /** Aksiyon butonları */
  primaryAction?: ResultAction;
  secondaryAction?: ResultAction;
};

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 text-emerald-700",
    borderClass: "border-emerald-200",
    defaultTitle: "Ödemeniz alındı!",
    defaultDescription:
      "Ödemeniz başarıyla tamamlandı. Ekibimiz en kısa sürede sizinle iletişime geçecek; teşekkür ederiz.",
  },
  failed: {
    icon: AlertTriangle,
    iconBg: "bg-rose-50 text-rose-700",
    borderClass: "border-rose-200",
    defaultTitle: "Ödeme tamamlanamadı",
    defaultDescription:
      "İşleminiz başarısız oldu veya iptal edildi. Kart bilgilerinizi kontrol edip tekrar deneyebilir ya da bizimle iletişime geçebilirsiniz.",
  },
  pending: {
    icon: Clock,
    iconBg: "bg-amber-50 text-amber-700",
    borderClass: "border-amber-200",
    defaultTitle: "Bilgileriniz alındı",
    defaultDescription: "Talebiniz kayıt altına alındı. Ödemenin tamamlanması için sizinle iletişime geçilecek.",
  },
} as const;

/**
 * Pair-stil ödeme sonuç ekranı — success / failed / pending durumları için ortak.
 * Tüm checkout sonuç sayfalarında kullanılır.
 */
export function CheckoutResultCard({
  status,
  eyebrow,
  title,
  description,
  nextStepNote,
  primaryAction,
  secondaryAction,
}: Props) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div
      className={`mx-auto max-w-xl rounded-3xl border bg-white p-8 sm:p-10 shadow-sm text-center ${cfg.borderClass}`}
    >
      <div
        className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full ${cfg.iconBg}`}
      >
        <Icon size={32} strokeWidth={1.6} />
      </div>

      {eyebrow && (
        <div className="mt-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">
          {eyebrow}
        </div>
      )}

      <h1 className="mt-2 font-display text-[28px] leading-tight tracking-tight text-[var(--od-ink)]">
        {title ?? cfg.defaultTitle}
      </h1>

      <p className="mt-3 text-[14px] leading-relaxed text-[var(--od-ink-soft)]">
        {description ?? cfg.defaultDescription}
      </p>

      {status === "success" && nextStepNote && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--od-line)] bg-[var(--od-cream-2)] p-4 text-left text-[13px] text-[var(--od-ink)]">
          <GraduationCap
            size={20}
            strokeWidth={1.6}
            className="mt-0.5 flex-shrink-0 text-[var(--od-olive)]"
          />
          <div>{nextStepNote}</div>
        </div>
      )}

      {status === "success" && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-[var(--od-ink-soft)]">
          <ShieldCheck size={12} className="text-emerald-700" />
          PayTR üzerinden güvenli ödeme tamamlandı.
        </div>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="mt-7 flex flex-col sm:flex-row gap-2 justify-center">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={
                (primaryAction.variant ?? "primary") === "primary"
                  ? "inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-6 py-3 text-[13.5px] font-medium text-white hover:bg-black transition"
                  : "inline-flex items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[13.5px] font-medium text-[var(--od-ink)] hover:border-[var(--od-ink)]/40 transition"
              }
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className={
                (secondaryAction.variant ?? "ghost") === "primary"
                  ? "inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-6 py-3 text-[13.5px] font-medium text-white hover:bg-black transition"
                  : "inline-flex items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[13.5px] font-medium text-[var(--od-ink)] hover:border-[var(--od-ink)]/40 transition"
              }
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
