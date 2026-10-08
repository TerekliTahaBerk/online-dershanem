"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Header'sız, ortalanmış kimlik ekranları (`AuthCard` kullananlar). */
const AUTH_PATHS = ["/giris", "/kayit", "/davet"];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function Bone({ className }: { className: string }) {
  return <div aria-hidden="true" className={`route-loading-bone ${className}`} />;
}

/**
 * Kök `loading.tsx` her üst düzey segmenti sarar; geçişte gösterilen iskelet
 * HEDEF sayfanın kabuğuna benzemeli, yoksa kullanıcı önce yanlış bir ekran
 * sonra asıl sayfayı görür. URL yükleme durumuyla birlikte güncellendiği için
 * `usePathname` hedef adresi verir:
 *  - `/panel/*`  → panelin kendi iskeleti (kenar çubuğu + çalışma alanı)
 *  - kimlik ekranları → header'sız, ortalanmış kart iskeleti
 *  - diğer public sayfalar → GERÇEK site header'ı + hero/kart iskeleti; header
 *    geçiş boyunca yerinde kalır, yalnız içerik alanı yüklenir.
 */
export function RouteLoading({
  siteHeader,
  panelLoading,
}: {
  siteHeader: ReactNode;
  panelLoading: ReactNode;
}) {
  const pathname = usePathname() ?? "/";

  if (pathname === "/panel" || pathname.startsWith("/panel/")) return panelLoading;

  if (isAuthPath(pathname)) {
    return (
      <div
        aria-busy="true"
        className="site-scope grid min-h-dvh place-items-center bg-dc-canvas px-6 py-12"
      >
        <p className="sr-only" role="status">
          Sayfa yükleniyor
        </p>
        <div className="flex w-full max-w-[380px] flex-col items-center">
          <div className="flex gap-3">
            <Bone className="h-12 w-12 rounded-[13px]" />
            <Bone className="h-12 w-12 rounded-[13px]" />
            <Bone className="h-12 w-12 rounded-[13px]" />
          </div>
          <Bone className="mt-6 h-6 w-48" />
          <Bone className="mt-10 h-12 w-full rounded-xl" />
          <Bone className="mt-3 h-12 w-full rounded-xl" />
          <Bone className="mt-4 h-[52px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div aria-busy="true" className="site-scope min-h-dvh bg-dc-canvas">
      {siteHeader}
      <p className="sr-only" role="status">
        Sayfa yükleniyor
      </p>
      <section className="border-b border-dc-line-soft bg-dc-canvas">
        <div className="site-container flex flex-col items-center py-(--dc-section-tight) text-center">
          <Bone className="h-3 w-28" />
          <Bone className="mt-5 h-9 w-[min(560px,90%)] sm:h-11" />
          <Bone className="mt-3 h-9 w-[min(420px,70%)] sm:h-11" />
          <Bone className="mt-6 h-4 w-[min(520px,88%)]" />
          <Bone className="mt-2 h-4 w-[min(380px,64%)]" />
          <div className="mt-8 flex gap-3">
            <Bone className="h-12 w-36 rounded-full" />
            <Bone className="h-12 w-32 rounded-full" />
          </div>
        </div>
      </section>
      <div className="site-container grid gap-5 py-(--dc-section-tight) md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-dc-card border border-dc-line bg-white p-7">
            <Bone className="h-10 w-10 rounded-xl" />
            <Bone className="mt-5 h-5 w-2/3" />
            <Bone className="mt-4 h-3 w-full" />
            <Bone className="mt-2 h-3 w-5/6" />
            <Bone className="mt-2 h-3 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
