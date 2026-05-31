import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordSetupForm } from "@/components/auth/password-setup-form";
import { getServerAuthSession } from "@/lib/auth";
import { changePasswordAction } from "./_actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Şifre Değiştir | Online Dershanem",
  robots: { index: false, follow: false },
};

/**
 * Phase 3 / Session 2 — forced password change page.
 *
 * Reachable by any authenticated user; mandatory for users with
 * `mustChangePassword=true`. We do NOT call `requirePanelSession()` here
 * because that helper would redirect to `/panel/sifre-degistir` in a loop
 * when the flag is true.
 */
export default async function SifreDegistirPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris?callbackUrl=/panel/sifre-degistir");

  const mustChange = !!session.user.mustChangePassword;

  return (
    <AuthShell
      title={mustChange ? "Şifrenizi belirleyin" : "Şifreyi değiştir"}
      subtitle={
        mustChange
          ? "Güvenliğiniz için, devam etmeden önce geçici şifrenizi yeni bir şifreyle değiştirmeniz gerekiyor."
          : "Yeni bir şifre belirleyin. Eski şifrenizle aynı olamaz."
      }
    >
      <PasswordSetupForm
        action={changePasswordAction}
        requireCurrentPassword
        submitLabel="Şifreyi kaydet"
      />
    </AuthShell>
  );
}
