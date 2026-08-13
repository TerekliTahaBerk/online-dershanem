import { AdminMfaForm } from "@/components/panel/admin-mfa-form";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AdminStepUpPage() {
  const session = await requireRole("ADMIN");
  const [config, passkeyCount] = await Promise.all([prisma.adminMfa.findUnique({ where: { userId: session.userId }, select: { totpEnabledAt: true } }), prisma.passkeyCredential.count({ where: { userId: session.userId, revokedAt: null } })]);
  return <main className="mx-auto max-w-lg px-5 py-12"><section className="rounded-3xl border bg-white p-7 shadow-sm"><p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Adım yükseltme</p><h1 className="mt-2 text-3xl font-bold">Kimliğinizi yeniden doğrulayın</h1><p className="mb-7 mt-3 text-sm leading-6 text-slate-600">Hassas yönetici işlemleri için doğrulama 10 dakika geçerlidir.</p><AdminMfaForm purpose="STEP_UP" passkeyCount={passkeyCount} totpEnabled={Boolean(config?.totpEnabledAt)} allowRecovery={false} /></section></main>;
}
