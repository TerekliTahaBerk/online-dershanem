"use client";

import { useEffect, useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { contact } from "@/lib/content";
import { ContactLink } from "@/components/ui/contact-link";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

export function StickyContactBar() {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen?: boolean }>;
      setIsHidden(Boolean(customEvent.detail?.isOpen));
    };

    window.addEventListener("lead-funnel-visibility", handleVisibility as EventListener);
    return () => window.removeEventListener("lead-funnel-visibility", handleVisibility as EventListener);
  }, []);

  if (isHidden) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[calc(100%-1rem)] max-w-md items-center gap-2 rounded-2xl border border-line-strong bg-anchor p-2 shadow-soft backdrop-blur md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <LeadFunnelTrigger
        source="sticky_mobile_primary"
        eventName="sticky_cta_click"
        className="inline-flex flex-1 items-center justify-center rounded-xl bg-paper px-3 py-2 text-xs font-semibold text-anchor"
        analyticsId="sticky_mobile_trial"
      >
        Ücretsiz Deneme
      </LeadFunnelTrigger>
      <ContactLink
        href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
        channel="whatsapp"
        placement="sticky_mobile"
        className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-paper"
      >
        <MessageCircleMore className="mr-1.5 h-4 w-4" /> WhatsApp
      </ContactLink>
    </div>
  );
}
