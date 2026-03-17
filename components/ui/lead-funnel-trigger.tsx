"use client";

import { MouseEvent, ReactNode } from "react";
import { trackConversionEvent } from "@/lib/tracking";

type LeadFunnelTriggerProps = {
  children: ReactNode;
  source: string;
  className?: string;
  eventName?: "hero_cta_click" | "trial_cta_click" | "pricing_cta_click" | "sticky_cta_click" | "landing_cta_click";
  analyticsId?: string;
};

export function LeadFunnelTrigger({
  children,
  source,
  className = "",
  eventName = "trial_cta_click",
  analyticsId
}: LeadFunnelTriggerProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    trackConversionEvent(eventName, { source });
    trackConversionEvent("lead_funnel_open", { source });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-lead-funnel", { detail: { source } }));
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className} data-analytics-id={analyticsId ?? source}>
      {children}
    </button>
  );
}
