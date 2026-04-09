import { redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { LoginForm } from "@/components/auth/login-form";
import { getServerAuthSession } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerAuthSession();
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl || "/admin";

  if (session?.user?.role === "ADMIN") {
    redirect(callbackUrl);
  }

  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-line bg-white p-8 shadow-soft sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Yönetim Girişi</p>
              <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                Operasyon paneline güvenli giriş
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                Form başvuruları, satın alma niyetleri ve ileride bağlanacak ödeme bildirimleri tek panelde tutulacak. Bu ekran
                yalnızca yönetim erişimi içindir.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "Lead formları veritabanında tutulur",
                  "Satın alma kayıtları ve durumları izlenir",
                  "Admin erişimi oturum tabanlı korunur",
                  "Vercel + Prisma dağıtımına hazır kurgu"
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-line bg-soft px-4 py-4 text-sm font-medium text-ink">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-line bg-paper/90 p-8 shadow-soft sm:p-10">
              <div className="rounded-3xl border border-line bg-white p-6 sm:p-7">
                <p className="text-sm font-semibold text-ink">Admin Girişi</p>
                <p className="mt-2 text-sm text-muted">
                  `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ile seed edilen kullanıcı hesabı üzerinden giriş yapın.
                </p>
                <LoginForm callbackUrl={callbackUrl} />
              </div>
            </section>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
