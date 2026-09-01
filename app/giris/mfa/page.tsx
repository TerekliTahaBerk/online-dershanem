import { notFound, redirect } from "next/navigation";
import { AdminMfaForm } from "@/components/panel/admin-mfa-form";
import { requireSession } from "@/lib/auth/guards";
import { adminHasMfa } from "@/lib/auth/mfa";
import { getAdminPasskeyCapabilities } from "@/lib/auth/mfa-methods";
import { prisma } from "@/lib/prisma";
import { postAuthenticationPath } from "@/lib/auth/products";
import { PASSWORD_CHANGE_PATH } from "@/lib/auth/roles";

export default async function AdminMfaPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") notFound();
  if (session.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  if (!(await adminHasMfa(session.userId))) redirect("/giris/mfa/enroll");
  if (session.mfaVerifiedAt) redirect(await postAuthenticationPath(session));
  const [config, passkeys] = await Promise.all([
    prisma.adminMfa.findUnique({ where: { userId: session.userId }, select: { totpEnabledAt: true } }),
    getAdminPasskeyCapabilities(session.userId),
  ]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-8 sm:px-5 sm:py-12">
      <section className="w-full rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Yönetici güvenliği</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">İkinci faktörü doğrulayın</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-slate-600">
          Telefondan giriyorsanız doğrulama uygulaması kodunu kullanın. Face ID yalnızca geçiş
          anahtarı bu telefona kayıtlıysa çalışır.
        </p>
        <AdminMfaForm
          purpose="AUTHENTICATE"
          passkeyCount={passkeys.passkeyCount}
          hasPlatformPasskey={passkeys.hasPlatformPasskey}
          totpEnabled={Boolean(config?.totpEnabledAt)}
        />
      </section>
    </main>
  );
}
