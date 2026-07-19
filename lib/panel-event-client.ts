"use client";

import type { PanelEventInput } from "@/lib/panel-events";

/** Fire-and-forget panel telemetry. Payload is server-side allowlisted. */
export function sendPanelEvent(event: PanelEventInput): void {
  void fetch("/api/panel/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => undefined);
}

