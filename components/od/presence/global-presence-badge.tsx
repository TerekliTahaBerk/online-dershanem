"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/od/ui/tooltip";

/**
 * Topbar global presence indicator — sistemde anlık online kullanıcı sayısı.
 * 30 saniyede bir poll eder.
 */
export function GlobalPresenceBadge() {
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/v1/presence", { credentials: "include", cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { count: number };
        if (!cancelled) setCount(d.count ?? 0);
      } catch {}
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (count === null) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden md:inline-flex items-center gap-1.5 rounded-od border border-od-border-2 bg-od-surface px-2 py-1 text-od-tiny text-od-mute">
          <span className="relative inline-flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                count > 0 ? "animate-ping bg-pastel-mint-ink/40" : ""
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                count > 0 ? "bg-pastel-mint-ink" : "bg-od-mute-2/40"
              }`}
            />
          </span>
          <span className="font-medium tabular-nums text-od-ink-2">{count}</span>
          <span>çevrimiçi</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{count} kullanıcı şu an aktif</TooltipContent>
    </Tooltip>
  );
}
