import { AdminMfaForm } from "@/components/panel/admin-mfa-form";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AdminStepUpPage() {
  const session = await requireRole("ADMIN");
  const [config, passkeyCount] = await Promise.all([prisma.adminMfa.findUnique({ where: { userId: session.userId }, select: { totpEnabledAt: true } }), prisma.passkeyCredential.count({ where: { userId: session.userId, revokedAt: null } })]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-8 sm:px-5 sm:py-12">
      <section className="w-full rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Adım yükseltme</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Kimliğinizi yeniden doğrulayın</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-slate-600">
          Hassas yönetici işlemleri için doğrulama 10 dakika geçerlidir. Telefondan Face ID / parmak
          izi veya uygulama kodu kullanabilirsiniz.
        </p>
        <AdminMfaForm
          purpose="STEP_UP"
          passkeyCount={passkeyCount}
          totpEnabled={Boolean(config?.totpEnabledAt)}
          allowRecovery={false}
        />
      </section>
    </main>
  );
}
