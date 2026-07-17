import Link from "next/link";
import Image from "next/image";
import type { UserRole } from "@prisma/client";
import { Bell, ChevronRight } from "lucide-react";
import { roleLabel } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AdminCommandSearch } from "@/components/panel/admin-command-search";
import { LogoutButton } from "@/components/panel/logout-button";

export async function PanelShell({ role, fullName, email, nav, children }: { role: UserRole; fullName: string | null; email: string; nav?: React.ReactNode; children: React.ReactNode }) {
  const adminLayout = role === "ADMIN" && nav;
  const firstName = (fullName || email).split(" ")[0];
  const session = await getSession();
  const unread = session ? await prisma.notification.count({ where: { userId: session.userId, readAt: null } }) : 0;

  const notificationButton = (
    <Link href="/panel/bildirimler" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--site-line)] bg-white text-[var(--site-muted)] transition hover:text-[var(--site-ink)]" aria-label={unread ? `${unread} okunmamış bildirimi aç` : "Bildirimleri aç"}>
      <Bell size={16} />
      {unread ? <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white ring-2 ring-white">{unread > 99 ? "99+" : unread}</span> : null}
    </Link>
  );

  return (
    <div className={`site-scope min-h-dvh ${adminLayout ? "panel-app-bg" : "bg-[var(--site-bg-warm)]"}`}>
      <a href="#panel-content" className="fixed left-4 top-3 z-[400] -translate-y-24 rounded-full bg-[var(--site-ink)] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0">Ana içeriğe geç</a>

      {adminLayout ? (
        <div className="min-h-dvh lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
          <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--site-line)] bg-[#f7f6f0]/92 px-4 py-5 backdrop-blur-xl lg:flex">
            <Link href="/panel/yonetim" aria-label="Online Dershanem yönetim ana sayfası" className="flex flex-col items-start gap-2 px-2 text-[var(--site-ink)]">
              <Image src="/onlinedershanem_.png" alt="Online Dershanem" width={1050} height={200} priority sizes="176px" className="h-auto w-[176px]" />
              <span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[.1em] text-[var(--brand-olive)]">Yönetim alanı</span>
            </Link>
            <div className="mt-8 flex-1">{nav}</div>
            <div className="rounded-[18px] border border-[var(--site-line)] bg-white/75 p-3">
              <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff1bf] text-xs font-extrabold text-amber-900">{firstName.charAt(0).toLocaleUpperCase("tr-TR")}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[var(--site-ink)]">{fullName || email}</span><span className="mt-0.5 block text-[10.5px] text-[var(--site-muted)]">{roleLabel(role)}</span></span></div>
              <div className="mt-3 border-t border-[var(--site-line)] pt-2"><LogoutButton compact /></div>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="sticky top-0 z-40 border-b border-[var(--site-line)] bg-[#fbfaf5]/88 backdrop-blur-xl">
              <div className="flex h-[68px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
                <div className="flex min-w-0 items-center lg:hidden"><Link href="/panel/yonetim" aria-label="Online Dershanem yönetim ana sayfası" className="flex shrink-0 items-center"><Image src="/onlinedershanem_.png" alt="Online Dershanem" width={1050} height={200} priority sizes="128px" className="h-auto w-[118px] sm:w-[128px]" /></Link></div>
                <div className="hidden items-center gap-1.5 text-[11.5px] text-[var(--site-muted)] lg:flex"><span>Online Dershanem</span><ChevronRight size={13} /><span className="font-semibold text-[var(--site-ink)]">Yönetim</span></div>
                <div className="flex items-center gap-2"><AdminCommandSearch />{notificationButton}<div className="hidden sm:block lg:hidden"><LogoutButton /></div></div>
              </div>
              <div className="border-t border-[var(--site-line)] px-4 py-2 lg:hidden">{nav}</div>
            </header>
            <main id="panel-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">{children}</main>
          </div>
        </div>
      ) : (
        <>
          <header className="sticky top-0 z-40 border-b border-[var(--site-line)] bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-2.5 sm:gap-3"><Link href="/panel" aria-label="Online Dershanem panel ana sayfası" className="flex shrink-0 items-center"><Image src="/onlinedershanem_.png" alt="Online Dershanem" width={1050} height={200} priority sizes="150px" className="h-auto w-[116px] sm:w-[150px]" /></Link><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[.06em] text-[var(--brand-olive)] sm:text-[10.5px]">{roleLabel(role)}</span></div><div className="flex items-center gap-2 sm:gap-3"><span className="hidden text-[13px] text-[var(--site-body)] sm:inline">{fullName || email}</span>{notificationButton}<LogoutButton /></div></div>{nav ? <div className="border-t border-[var(--site-line)]"><div className="mx-auto max-w-[1320px] px-4 py-2 sm:px-6">{nav}</div></div> : null}</header>
          <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8"><main id="panel-content" tabIndex={-1}>{children}</main></div>
        </>
      )}
    </div>
  );
}
