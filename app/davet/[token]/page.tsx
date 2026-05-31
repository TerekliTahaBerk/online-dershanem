import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordSetupForm } from "@/components/auth/password-setup-form";
import { validateInviteToken } from "@/lib/panel/account-onboarding";
import { consumeInviteAction } from "./_actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Davet Kabulü | Online Dershanem",
  description: "Yöneticiniz tarafından oluşturulan hesabı aktif edin.",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function DavetPage({ params }: Props) {
  const { token } = await params;
  const result = await validateInviteToken(token);

  if (!result.ok) {
    const message =
      result.reason === "EXPIRED"
        ? "Davet bağlantısının süresi dolmuş."
        : result.reason === "DISABLED"
          ? "Bu hesap devre dışı bırakılmış."
          : "Davet bağlantısı geçersiz veya süresi dolmuş.";
    return (
      <AuthShell
        title="Bağlantı geçersiz"
        subtitle={message}
        footer={
          <Link href="/iletisim" className="font-medium text-white hover:text-[#9A9AA0]">
            Yöneticiden yeni davet isteyin →
          </Link>
        }
      >
        <div className="rounded-2xl border border-[#2A2A2E] bg-[#16161A] p-5 text-center text-[14px] leading-6 text-[#9A9AA0]">
          Davet bağlantınız tek kullanımlıktır. Eğer şifrenizi zaten
          belirlediyseniz <Link className="text-white underline-offset-4 hover:underline" href="/giris">giriş yapabilirsiniz</Link>.
        </div>
      </AuthShell>
    );
  }

  const displayName = result.user.name?.trim() || result.user.email;

  return (
    <AuthShell
      title="Hesabınızı aktif edin"
      subtitle={`Hoş geldiniz, ${displayName}. Devam etmek için bir şifre belirleyin.`}
      footer={
        <span>
          Zaten şifreniz var mı?{" "}
          <Link href="/giris" className="font-medium text-white hover:text-[#9A9AA0]">
            Giriş yapın
          </Link>
        </span>
      }
    >
      <PasswordSetupForm
        action={consumeInviteAction}
        hidden={{ token }}
        submitLabel="Hesabı aktif et"
      />
    </AuthShell>
  );
}
