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

/**
 * Direct purchase CTA — the multi-step intent form has been removed.
 * Clicking now opens the PayTR payment page in a new tab.
 */
export function PurchaseFunnelTrigger({
  children,
  source,
  packageName,
  paymentLink,
  className = "",
  analyticsId
}: PurchaseFunnelTriggerProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackConversionEvent("purchase_cta_click", { source, packageName });

    if (!paymentLink) {
      event.preventDefault();
      if (typeof window !== "undefined") {
        window.location.href = "/paketler/";
      }
    }
  };

  return (
    <a
      href={paymentLink || "/paketler/"}
      target={paymentLink ? "_blank" : undefined}
      rel={paymentLink ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      className={className}
      data-analytics-id={analyticsId ?? source}
      data-package-name={packageName}
    >
      {children}
    </a>
  );
}
