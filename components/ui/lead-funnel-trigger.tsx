"use client";

import Link from "next/link";
import { MouseEvent, ReactNode } from "react";
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
 * Premium CTA. Forms have been removed site-wide; this component now
 * routes the user directly to the packages page (or a custom href) while
 * keeping the original analytics surface intact.
 */
export function LeadFunnelTrigger({
  children,
  source,
  className = "",
  eventName = "trial_cta_click",
  analyticsId,
  href = "/paketler/"
}: LeadFunnelTriggerProps) {
  const handleClick = (_event: MouseEvent<HTMLAnchorElement>) => {
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
