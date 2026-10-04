"use client";

import Link from "next/link";
import { trackConversionEvent } from "@/lib/tracking";

export function PreMeetingLink({ href = "/iletisim#on-gorusme", source, className }: {
  href?: string;
  source: string;
  className: string;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackConversionEvent("trial_cta_click", { source })}>
      Ücretsiz Ön Görüşme
    </Link>
  );
}
