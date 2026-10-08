"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

/** Yönlendirme hiç tamamlanmazsa (iptal, aynı adrese redirect) çubuk takılı kalmasın. */
const SAFETY_TIMEOUT_MS = 15_000;
/** Önbellekten anında açılan geçişlerde çubuk yanıp sönmesin. */
const SHOW_DELAY_MS = 100;
/** Hover ile yapılan tam prefetch; imleç linkin üzerinden geçip giderse istek atılmaz. */
const INTENT_DELAY_MS = 65;

/**
 * Tam (veri dahil) önceden yüklenecek adresler. Public sayfalar herkes için
 * aynı ve hafif; panel sayfaları kişiye özel ve ağır sorgular taşır — onlar
 * yalnız varsayılan (loading sınırına kadar) prefetch'i alır.
 */
function isFullPrefetchPath(pathname: string) {
  return !/^\/(panel|api|_next)(\/|$)/.test(pathname);
}

/** Aynı origin'de, gerçekten başka bir sayfaya giden düz tıklanabilir link mi? */
function navigationTarget(target: EventTarget | null) {
  const anchor = (target as Element | null)?.closest?.("a");
  if (!anchor || !anchor.href) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // Aynı sayfa (yalnız #hash değişimi ya da aynı adres): yükleme yok.
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return url;
}

function saveData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/**
 * Sayfa geçişi ilerleme çubuğu + niyet prefetch'i.
 *
 * 1. Link'in üzerine gelindiğinde (hover, klavye odağı, dokunma başlangıcı)
 *    hedef public sayfa verisiyle birlikte önceden alınır. Dinamik sayfalarda
 *    Next varsayılan olarak yalnız `loading.tsx` iskeletini önceden aldığı için
 *    tıklamadan sonra sunucuyu beklemek gerekiyordu; hover ile tıklama arasındaki
 *    ~150-300 ms çoğu geçişi anında açmaya yeter.
 * 2. Tıklama anında çubuk başlar, URL değişince tamamlanır. Geçiş 100 ms'den
 *    kısa sürerse hiç görünmez.
 */
export function NavigationProgress() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const activeRef = useRef(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const prefetched = new Set<string>();
    let intentTimeout: ReturnType<typeof setTimeout> | null = null;

    const prefetch = (url: URL) => {
      const href = `${url.pathname}${url.search}`;
      if (prefetched.has(href) || !isFullPrefetchPath(url.pathname) || saveData()) return;
      prefetched.add(href);
      router.prefetch(href, { kind: "full" as PrefetchKind });
    };

    const handleIntent = (event: Event) => {
      const url = navigationTarget(event.target);
      if (intentTimeout) clearTimeout(intentTimeout);
      if (!url) return;
      if (event.type === "pointerover") intentTimeout = setTimeout(() => prefetch(url), INTENT_DELAY_MS);
      else prefetch(url);
    };

    const clearTimers = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };

    const finish = () => {
      clearTimers();
      if (!activeRef.current) return;
      activeRef.current = false;
      setProgress(100);
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    };

    const start = () => {
      clearTimers();
      activeRef.current = true;
      setProgress(0);
      showTimeoutRef.current = setTimeout(() => {
        setVisible(true);
        setProgress(12);
        intervalRef.current = setInterval(() => {
          // Yavaşlayarak %90'a yaklaşır; gerçek tamamlanma URL değişimidir.
          setProgress((p) => (p < 90 ? p + Math.max((90 - p) * 0.08, 0.4) : p));
        }, 150);
      }, SHOW_DELAY_MS);
      safetyTimeoutRef.current = setTimeout(finish, SAFETY_TIMEOUT_MS);
    };

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (navigationTarget(e.target)) start();
    };

    finishRef.current = finish;
    document.addEventListener("click", handleClick);
    document.addEventListener("pointerover", handleIntent, { passive: true });
    document.addEventListener("focusin", handleIntent);
    document.addEventListener("touchstart", handleIntent, { passive: true });
    return () => {
      clearTimers();
      if (intentTimeout) clearTimeout(intentTimeout);
      finishRef.current = null;
      document.removeEventListener("click", handleClick);
      document.removeEventListener("pointerover", handleIntent);
      document.removeEventListener("focusin", handleIntent);
      document.removeEventListener("touchstart", handleIntent);
    };
  }, [router]);

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
        className="h-full rounded-r-full bg-[#14976B] shadow-[0_0_10px_rgba(20,151,107,0.6)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
