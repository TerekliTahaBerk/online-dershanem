import { KeyRound } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChangePasswordForm } from "@/components/panel/change-password-form";
import {
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

/**
 * Parola değiştirme.
 *
 * `requireRole` DEĞİL `requireSession` kullanır: `requireRole`, geçici parolalı
 * kullanıcıyı bu sayfaya yönlendiriyor — burada da çağrılsaydı sonsuz döngü olurdu.
 */
export default async function ChangePasswordPage() {
  const session = await requireSession();
  const forced = session.mustChangePassword;
  // Öğrenciye "sen", diğer rollere "siz" diye hitap edilir.
  const student = session.role === "STUDENT";

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <div className="mx-auto max-w-[460px] py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-(--brand-olive-soft) text-(--brand-olive)">
          <KeyRound size={19} aria-hidden="true" />
        </span>

        <h1 className={PAGE_TITLE_CLASS}>
          {student
            ? forced ? "Hoş geldin! Önce kendi parolanı belirleyelim." : "Parolanı değiştir."
            : forced ? "Kendi parolanızı belirleyin." : "Parolanızı değiştirin."}
        </h1>

        <p className={PAGE_DESCRIPTION_CLASS}>
          {student
            ? forced
              ? "Yalnızca senin bileceğin bir parola seç; sonra derslerin ve çalışmaların seni bekliyor olacak."
              : "Yeni parolanı belirlediğinde güvenliğin için diğer cihazlardaki oturumlarını kapatırız."
            : forced
              ? "Devam etmeden önce yalnızca sizin bildiğiniz bir parola belirleyin."
              : "Yeni parolanızı belirledikten sonra diğer cihazlardaki oturumlarınız kapanır."}
        </p>

        <div className="mt-8 rounded-[14px] border border-(--site-line) bg-white p-6">
          <ChangePasswordForm forced={forced} student={student} />
        </div>

        <p className="mt-5 text-[12.5px] leading-6 text-(--site-muted)">
          {student
            ? "Parolanı kaydettiğinde, bu hesaba açık olan diğer oturumları güvenliğin için kapatırız."
            : "Parolanızı kaydettiğinizde bu hesaba açık olan diğer oturumlar güvenlik için kapatılır."}
        </p>
      </div>
    </PanelShell>
  );
}
