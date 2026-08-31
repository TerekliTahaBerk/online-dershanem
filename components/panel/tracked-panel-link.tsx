"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { PanelEventInput } from "@/lib/panel-events";
import { sendPanelEvent } from "@/lib/panel-event-client";

export function TrackedPanelLink({
  href,
  className,
  event,
  children,
}: {
  href: string;
  className?: string;
  event: PanelEventInput;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={className}
      onClick={() => sendPanelEvent(event)}
    >
      {children}
    </Link>
  );
}
