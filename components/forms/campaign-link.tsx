"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { campaignKeys } from "@/lib/marketing-application";

/** URL-only attribution across discovery links; no cookies or browser storage. */
export function CampaignLink({ href, children, ...props }: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
  "aria-current"?: "page";
}) {
  const pathname = usePathname();
  const [campaign, setCampaign] = useState("");
  useEffect(() => {
    const input = new URLSearchParams(window.location.search);
    const output = new URLSearchParams();
    for (const key of campaignKeys) {
      const value = input.get(key);
      if (value && /^[a-z][a-z0-9_-]{0,63}$/.test(value)) output.set(key, value);
    }
    setCampaign(output.toString());
  }, [pathname]);
  return <Link href={campaign ? `${href}${href.includes("?") ? "&" : "?"}${campaign}` : href} {...props}>{children}</Link>;
}
