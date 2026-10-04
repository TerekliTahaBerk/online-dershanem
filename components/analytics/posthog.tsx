"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { cleanAnalyticsUrl, posthogHost, POSTHOG_VISITOR_COOKIE, trackablePath, validVisitorId } from "@/lib/posthog-policy";

export function PostHogAnalytics({ distinctId }: { distinctId: string }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!key) return;
    if (validVisitorId(distinctId)) {
      document.cookie = `${POSTHOG_VISITOR_COOKIE}=${encodeURIComponent(distinctId)}; Path=/; SameSite=Lax; Max-Age=31536000${location.protocol === "https:" ? "; Secure" : ""}`;
    }
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
    const captureClick = (event: MouseEvent) => {
      if (!trackablePath(location.pathname) || !(event.target instanceof Element)) return;
      const target = event.target.closest("[data-analytics-id]");
      const id = target?.getAttribute("data-analytics-id");
      if (id) posthog.capture("cta_clicked", { cta_id: id, pathname: location.pathname }, { send_instantly: true });
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
    posthog.capture("$pageview", { $current_url: `${location.origin}${pathname}`, pathname });
  }, [pathname, distinctId]);

  return null;
}
