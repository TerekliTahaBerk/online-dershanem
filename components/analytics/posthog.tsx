"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { PostHog } from "posthog-js";
import { cleanAnalyticsUrl, posthogHost, POSTHOG_VISITOR_COOKIE, trackablePath, validVisitorId } from "@/lib/posthog-policy";
import { analyticsProduct, productCta, reachedScrollDepths } from "@/lib/product-analytics";

/**
 * posthog-js ~100 KB (gzip) — her public sayfanın JS'inin yaklaşık üçte biri.
 * Statik import ilk boyamayı ve etkileşimi geciktiriyordu; kütüphane tarayıcı
 * boşa çıkınca ayrı bir chunk olarak yüklenir. Olaylar bu sözü bekler, böylece
 * yükleme bitmeden yapılan tıklama/sayfa görüntüleme kaybolmaz.
 */
let posthogReady: Promise<PostHog> | null = null;

function whenIdle() {
  return new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 3000 });
    else setTimeout(resolve, 1);
  });
}

function capture(...args: Parameters<PostHog["capture"]>) {
  void posthogReady?.then((posthog) => posthog.capture(...args));
}

export function PostHogAnalytics({ distinctId }: { distinctId: string }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!key) return;
    if (validVisitorId(distinctId)) {
      document.cookie = `${POSTHOG_VISITOR_COOKIE}=${encodeURIComponent(distinctId)}; Path=/; SameSite=Lax; Max-Age=31536000${location.protocol === "https:" ? "; Secure" : ""}`;
    }
    posthogReady ??= whenIdle()
      .then(() => import("posthog-js"))
      .then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: posthogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST),
          ui_host: "https://eu.posthog.com",
          bootstrap: { distinctID: distinctId },
          persistence: "memory",
          person_profiles: "never",
          capture_pageview: false,
          capture_pageleave: false,
          autocapture: false,
          capture_dead_clicks: false,
          capture_performance: false,
          disable_session_recording: true,
          disable_surveys: true,
          advanced_disable_flags: true,
          before_send: (event) => {
            if (!event || !trackablePath(location.pathname)) return null;
            // Otomatik SDK özelliklerindeki sorgu/hash ve sayfa başlıklarını kaldır.
            for (const name of Object.keys(event.properties)) {
              if (/url|referrer/i.test(name) && typeof event.properties[name] === "string") {
                event.properties[name] = cleanAnalyticsUrl(event.properties[name]);
              }
              if (/title|search|campaign|utm_/i.test(name)) delete event.properties[name];
            }
            return event;
          },
        });
        return posthog;
      });
    const captureClick = (event: MouseEvent) => {
      if (!trackablePath(location.pathname) || !(event.target instanceof Element)) return;
      const target = event.target.closest("a[href], [data-analytics-id]");
      const id = target?.getAttribute("data-analytics-id");
      const product = analyticsProduct(location.pathname);
      const action = product && target?.closest("main") ? productCta(target.getAttribute("href") || "", location.origin) : undefined;
      if (id || action) capture("cta_clicked", {
        cta_id: id || `${product?.toLowerCase()}_${action?.cta_kind}`,
        pathname: location.pathname,
        ...(product ? { product_code: product } : {}),
        ...action,
        cta_position: target?.closest("header") ? "header" : target?.closest("footer") ? "footer" : "main",
        ...(target?.closest("main section") ? { cta_section: Array.from(document.querySelectorAll("main section")).indexOf(target.closest("main section")!) + 1 } : {}),
      }, { send_instantly: true });
    };
    document.addEventListener("click", captureClick, true);
    return () => {
      document.removeEventListener("click", captureClick, true);
    };
  }, [distinctId]);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !trackablePath(pathname)) return;
    const product = analyticsProduct(pathname);
    capture("$pageview", { $current_url: `${location.origin}${pathname}`, pathname, ...(product ? { product_code: product } : {}) });
  }, [pathname, distinctId]);

  useEffect(() => {
    const product = analyticsProduct(pathname);
    if (!product || !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
    const depths = new Set<number>();
    const openedQuestions = new Set<number>();
    let frame = 0;
    const measureScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (location.pathname !== pathname) return;
        for (const depth of reachedScrollDepths(window.scrollY, document.documentElement.scrollHeight, window.innerHeight)) {
          if (depths.has(depth)) continue;
          depths.add(depth);
          capture("product_scroll_depth", { pathname, product_code: product, depth_percent: depth });
        }
      });
    };
    const measureFaq = (event: Event) => {
      if (location.pathname !== pathname || !(event.target instanceof HTMLDetailsElement) || !event.target.open) return;
      const index = Array.from(document.querySelectorAll("main details")).indexOf(event.target) + 1;
      if (!index || openedQuestions.has(index)) return;
      openedQuestions.add(index);
      capture("product_faq_opened", { pathname, product_code: product, faq_index: index });
    };
    window.addEventListener("scroll", measureScroll, { passive: true });
    document.addEventListener("toggle", measureFaq, true);
    return () => {
      window.removeEventListener("scroll", measureScroll);
      document.removeEventListener("toggle", measureFaq, true);
      cancelAnimationFrame(frame);
    };
  }, [pathname, distinctId]);

  return null;
}
