"use client";

import { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { trackConversionEvent } from "@/lib/tracking";

type PurchaseFunnelTriggerProps = {
  children: ReactNode;
  source: string;
  packageName: string;
  paymentLink: string;
  className?: string;
  analyticsId?: string;
  /**
   * Optional explicit overrides for the cart form. If not provided we try
   * to derive category/subject from the analytics source string.
   */
  category?: string;
  subject?: string;
  priceLabel?: string;
};

/**
 * Purchase CTA — sends the user to our in-house cart/info form
 * (`/paketler/satin-al?...`) before forwarding them to the actual PayTR
 * payment link. This lets us capture buyer info + KVKK consent and
 * persist a `PurchaseIntent` row for the admin team.
 */
export function PurchaseFunnelTrigger({
  children,
  source,
  packageName,
  paymentLink,
  className = "",
  analyticsId,
  category,
  subject,
  priceLabel,
}: PurchaseFunnelTriggerProps) {
  const router = useRouter();

  // Try to extract "<Category> <Subject>" from packageName
  // (e.g. "TYT-AYT Matematik") if explicit values not supplied.
  const derived = (() => {
    if (category || subject) {
      return { cat: category || "", subj: subject || "" };
    }
    const parts = packageName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { cat: parts[0], subj: parts.slice(1).join(" ") };
    }
    return { cat: "", subj: packageName };
  })();

  const target = `/paketler/satin-al?${new URLSearchParams({
    cat: derived.cat,
    subj: derived.subj,
    name: packageName,
    price: priceLabel || "",
    link: paymentLink || "",
  }).toString()}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    trackConversionEvent("purchase_cta_click", { source, packageName });
    router.push(target);
  };

  return (
    <a
      href={target}
      onClick={handleClick}
      className={className}
      data-analytics-id={analyticsId ?? source}
      data-package-name={packageName}
    >
      {children}
    </a>
  );
}
