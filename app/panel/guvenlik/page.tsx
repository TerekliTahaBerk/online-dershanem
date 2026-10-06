import { AdminMfaForm } from "@/components/panel/admin-mfa-form";
import { notFound } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/guards";
import { userRequiresMfa } from "@/lib/products/staff-permissions";
import { getAdminPasskeyCapabilities } from "@/lib/auth/mfa-methods";
import { prisma } from "@/lib/prisma";

export default async function AdminStepUpPage() {
  // Adım yükseltme: ADMIN ve ayrıcalıklı ürün personeli (MFA zorunlu hesaplar).
  const session = await requireActiveUser();
  if (!(await userRequiresMfa(session.userId, session.role))) notFound();
  const [config, passkeys] = await Promise.all([
    prisma.adminMfa.findUnique({
      where: { userId: session.userId },
      select: { totpEnabledAt: true },
    }),
    getAdminPasskeyCapabilities(session.userId),
  ]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-8 sm:px-5 sm:py-12">
      <section className="w-full rounded-3xl border bg-white p-5 shadow-xs sm:p-7">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
          Adım yükseltme
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Kimliğinizi yeniden doğrulayın
        </h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-slate-600">
          Hassas işlemler (yönetim, sonuç yayını, istisnai erişim) için doğrulama 10 dakika geçerlidir.
          Telefondan uygulama kodunu veya bu cihaza kayıtlı geçiş anahtarını
          kullanın.
        </p>
        <AdminMfaForm
          purpose="STEP_UP"
          passkeyCount={passkeys.passkeyCount}
          hasPlatformPasskey={passkeys.hasPlatformPasskey}
          totpEnabled={Boolean(config?.totpEnabledAt)}
          allowRecovery={false}
          stepUpReturnTo={session.role === "ADMIN" ? "/panel/yonetim" : "/panel/odk"}
        />
      </section>
    </main>
  );
}
