"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { trackConversionEvent } from "@/lib/tracking";

type LeadFunnelTriggerProps = {
  children: ReactNode;
  source: string;
  className?: string;
  eventName?: "hero_cta_click" | "trial_cta_click" | "pricing_cta_click" | "sticky_cta_click" | "landing_cta_click";
  analyticsId?: string;
  href?: string;
};

/**
 * Lead CTA. Varsayılan olarak çalışan ücretsiz ön görüşme formuna gider;
 * içerik veya fiyat CTA'ları gerektiğinde açık bir `href` verebilir.
 */
export function LeadFunnelTrigger({
  children,
  source,
  className = "",
  eventName = "trial_cta_click",
  analyticsId,
  href = "/iletisim/"
}: LeadFunnelTriggerProps) {
  const handleClick = () => {
    trackConversionEvent(eventName, { source });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      data-analytics-id={analyticsId ?? source}
    >
      {children}
    </Link>
  );
}
