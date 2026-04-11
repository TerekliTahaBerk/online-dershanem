import { redirect } from "next/navigation";
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
    <main className="min-h-screen bg-white py-12">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Yönetim Girişi</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Admin paneli için sade ve doğrudan giriş
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Form yanıtları, öğrenci havuzu, paket takibi ve operasyon notları bu panelde tutulur. Public site görünümünden ayrı
              çalışır; amaç hızlı işlem almak ve tek yerden yönetmektir.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Kısa ve detaylı formlar tek panelde görünür",
                "Öğrenci kaydına paket ve durum işlenir",
                "Telefon, WhatsApp ve e-posta aksiyonları hazırdır",
                "Admin oturumu ile korunur"
              ].map((item) => (
                <div key={item} className="rounded-md border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-800">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <p className="text-sm font-semibold text-slate-950">Admin hesabı</p>
            <p className="mt-2 text-sm text-slate-600">
              `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ile seed edilen kullanıcı hesabı üzerinden giriş yapın.
            </p>
            <LoginForm callbackUrl={callbackUrl} />
          </section>
        </div>
      </Container>
    </main>
  );
}
