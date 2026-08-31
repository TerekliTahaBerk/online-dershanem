import { KeyRound } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChangePasswordForm } from "@/components/panel/change-password-form";

/**
 * Parola değiştirme.
 *
 * `requireRole` DEĞİL `requireSession` kullanır: `requireRole`, geçici parolalı
 * kullanıcıyı bu sayfaya yönlendiriyor — burada da çağrılsaydı sonsuz döngü olurdu.
 */
export default async function ChangePasswordPage() {
  const session = await requireSession();
  const forced = session.mustChangePassword;

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <div className="mx-auto max-w-[460px] py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]">
          <KeyRound size={19} aria-hidden="true" />
        </span>

        <h1 className="mt-5 font-display text-[clamp(1.7rem,3.5vw,2.2rem)] leading-[1.15] text-[var(--site-ink)]">
          {forced ? "Kendi parolanızı belirleyin." : "Parolanızı değiştirin."}
        </h1>

        <p className="mt-3 text-[14.5px] leading-7 text-[var(--site-body)]">
          {forced
            ? "Devam etmeden önce yalnızca sizin bildiğiniz bir parola belirleyin."
            : "Yeni parolanızı belirledikten sonra diğer cihazlardaki oturumlarınız kapanır."}
        </p>

        <div className="mt-8 rounded-[14px] border border-[var(--site-line)] bg-white p-6">
          <ChangePasswordForm forced={forced} />
        </div>

        <p className="mt-5 text-[12.5px] leading-6 text-[var(--site-muted)]">
          Parolanızı kaydettiğinizde bu hesaba açık olan diğer oturumlar güvenlik için kapatılır.
        </p>
      </div>
    </PanelShell>
  );
}
