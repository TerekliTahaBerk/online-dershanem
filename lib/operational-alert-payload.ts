export type OperationalAlert = {
  event: string;
  severity: "warning" | "critical";
  summary: string;
  context?: Record<string, unknown>;
};

export function buildOperationalAlertRequest(webhook: string, alert: OperationalAlert, now = new Date()) {
  const url = new URL(webhook);
  const discord = ["discord.com", "discordapp.com"].includes(url.hostname)
    && /^\/api\/(?:v\d+\/)?webhooks\/\d+\/[^/]+$/.test(url.pathname);

  if (discord) {
    // wait=true makes Discord confirm that the message was actually saved.
    url.searchParams.set("wait", "true");
    return {
      url: url.toString(),
      body: {
        content: [
          `onlinedershanem. · ${alert.severity === "critical" ? "Kritik alarm" : "Uyarı"}`,
          alert.event,
          alert.summary,
          now.toISOString(),
        ].join("\n").slice(0, 2000),
        allowed_mentions: { parse: [] },
      },
    };
  }

  return {
    url: webhook,
    body: { ...alert, occurredAt: now.toISOString() },
  };
}
