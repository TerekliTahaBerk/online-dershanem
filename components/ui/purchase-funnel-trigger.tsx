"use client";

import { MouseEvent, ReactNode } from "react";
import { trackConversionEvent } from "@/lib/tracking";

type PurchaseFunnelTriggerProps = {
  children: ReactNode;
  source: string;
  packageName: string;
  paymentLink: string;
  className?: string;
  analyticsId?: string;
};

export function PurchaseFunnelTrigger({
  children,
  source,
  packageName,
  paymentLink,
  className = "",
  analyticsId
}: PurchaseFunnelTriggerProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    trackConversionEvent("purchase_cta_click", { source, packageName });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-purchase-funnel", {
          detail: {
            source,
            packageName,
            paymentLink
          }
        })
      );
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className} data-analytics-id={analyticsId ?? source}>
      {children}
    </button>
  );
}
