"use client";

import { useEffect, useRef } from "react";
import { TALLY_EMBED_ORIGIN } from "@/lib/integrations/tally-events";
import { publicTallyEmbedUrl, tallyEmbedHeight } from "@/lib/integrations/tally-embed";

/** Native lazy iframe + scoped resize listener; no third-party embed script. */
export function TallyEmbed({ formId, title, height = 820 }: {
  formId: string;
  title: string;
  height?: number;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== TALLY_EMBED_ORIGIN || event.source !== iframe.current?.contentWindow) return;
      const nextHeight = tallyEmbedHeight(event.data, formId);
      if (nextHeight !== null && iframe.current) iframe.current.style.height = `${nextHeight}px`;
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [formId]);

  return (
    <iframe
      ref={iframe}
      src={publicTallyEmbedUrl(formId)}
      title={title}
      loading="lazy"
      width="100%"
      height={height}
      style={{ height }}
      className="block w-full border-0"
    />
  );
}
