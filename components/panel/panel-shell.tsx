import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { roleLabel } from "@/lib/auth/roles";
import { LogoutButton } from "@/components/panel/logout-button";

/**
 * Panel kabuğu.
 *
 * Pazarlama sitesinden bilerek farklı bir register: küçük tipografi, sıkı
 * boşluk, küçük yarıçap. Burası okunmaz, kullanılır. Marka zeytin yeşili
 * burada CTA değil, AKTİF DURUM rengidir.
 */
export function PanelShell({
  role,
  fullName,
  email,
  nav,
  children,
}: {
  role: UserRole;
  fullName: string | null;
  email: string;
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="site-scope min-h-dvh bg-[var(--site-bg-warm)]">
      <a
        href="#panel-content"
        className="fixed left-4 top-3 z-[200] -translate-y-24 rounded-full bg-[var(--site-ink)] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Ana içeriğe geç
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--site-line)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/panel" className="flex items-center gap-2.5 text-[14px] font-bold tracking-[-.02em] text-[var(--site-ink)]">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--brand-olive)] text-[13px] font-black text-white shadow-[0_7px_20px_-10px_rgba(58,74,44,.8)]">od</span>
              <span className="hidden sm:inline">onlinedershanem</span>
            </Link>
            <span className="rounded-full border border-[var(--brand-olive-soft)] bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--brand-olive)]">
              {roleLabel(role)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-[var(--site-body)] sm:inline">
              {fullName || email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8">
        {nav ? <div className="mb-6">{nav}</div> : null}
        <main id="panel-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
