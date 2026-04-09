import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/container";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect("/giris?callbackUrl=/admin");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white/90 backdrop-blur-xl">
        <Container className="flex min-h-20 items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Admin Panel</p>
            <h1 className="mt-1 text-xl font-bold text-ink">Online Dershanem Operasyon Merkezi</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{session.user.name ?? session.user.email}</p>
              <p className="text-xs text-muted">{session.user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </Container>
      </header>
      {children}
    </div>
  );
}
