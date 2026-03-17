"use client";

import { ReactNode } from "react";
import { ContactChannel, trackContactClick } from "@/lib/tracking";

type ContactLinkProps = {
  href: string;
  channel: ContactChannel;
  placement: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

export function ContactLink({ href, channel, placement, className = "", children, ariaLabel }: ContactLinkProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      onClick={() => trackContactClick(channel, placement)}
      className={className}
    >
      {children}
    </a>
  );
}
