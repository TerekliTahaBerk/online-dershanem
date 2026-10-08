"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Yönlendirme hiç tamamlanmazsa (iptal, aynı adrese redirect) çubuk takılı kalmasın. */
const SAFETY_TIMEOUT_MS = 15_000;

/**
 * Sayfa geçişi ilerleme çubuğu.
 *
 * Tıklama anında görünür, URL değişince tamamlanır. Böylece sunucu yanıtı
 * gelene kadar kullanıcı "tıklama alındı" geri bildirimini hemen görür;
 * segmentlerdeki `loading.tsx` iskeletleri bunun üstüne içerik yerini tutar.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };

    const finish = () => {
      clearTimers();
      if (!visibleRef.current) return;
      setProgress(100);
      hideTimeoutRef.current = setTimeout(() => {
        visibleRef.current = false;
        setVisible(false);
        setProgress(0);
      }, 250);
    };

    const start = () => {
      clearTimers();
      visibleRef.current = true;
      setVisible(true);
      setProgress(8);
      intervalRef.current = setInterval(() => {
        // Yavaşlayarak %90'a yaklaşır; gerçek tamamlanma URL değişimidir.
        setProgress((p) => (p < 90 ? p + Math.max((90 - p) * 0.08, 0.4) : p));
      }, 150);
      safetyTimeoutRef.current = setTimeout(finish, SAFETY_TIMEOUT_MS);
    };

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Aynı sayfa (yalnız #hash değişimi ya da aynı adres): yükleme yok.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    };

    finishRef.current = finish;
    document.addEventListener("click", handleClick);
    return () => {
      clearTimers();
      finishRef.current = null;
      document.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    finishRef.current?.();
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[2147483000] h-[3px]"
      role="progressbar"
      aria-label="Sayfa yükleniyor"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full rounded-r-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
