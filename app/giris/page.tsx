import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/container";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const callbackUrl =
    resolvedSearchParams.callbackUrl && resolvedSearchParams.callbackUrl.startsWith("/")
      ? resolvedSearchParams.callbackUrl
      : "/admin";

  return (
    <main className="min-h-screen bg-paper py-16">
      <Container className="max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-line bg-white p-8 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Online Dershanem Yönetim</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Formlar, satın alma akışı ve admin görünürlüğü artık tek merkezde.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Bu giriş ekranı yalnızca yönetim ekibi için. Admin hesabı veritabanında oluşturulduğunda lead kayıtları, satın alma ön formları
              ve ödeme olayları panelde listelenir.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-soft p-4">
                <p className="text-sm font-semibold text-ink">Lead kayıtları</p>
                <p className="mt-2 text-sm text-muted">Ana sayfa, popup ve kısa form başvuruları tek tabloda toplanır.</p>
              </div>
              <div className="rounded-2xl border border-line bg-soft p-4">
                <p className="text-sm font-semibold text-ink">Satın alma izleği</p>
                <p className="mt-2 text-sm text-muted">Ön bilgi formu ve ödeme linkine geçiş olayları admin paneline düşer.</p>
              </div>
            </div>
            <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-brand transition hover:text-pine">
              Ana siteye dön
            </Link>
          </section>

          <section className="rounded-[2rem] border border-line bg-white p-8 shadow-soft sm:p-10">
            <p className="text-sm font-semibold text-ink">Admin girişi</p>
            <p className="mt-2 text-sm text-muted">
              İlk kurulumda `.env.local` içindeki admin bilgileriyle `npm run db:seed-admin` çalıştırıp hesabı üretmen gerekir.
            </p>
            <LoginForm callbackUrl={callbackUrl} />
          </section>
        </div>
      </Container>
    </main>
  );
}
