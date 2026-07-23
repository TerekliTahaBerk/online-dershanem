"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

const time = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Istanbul" });

export function OdkOperationsRefresh({ renderedAt, intervalSeconds = 30 }: { renderedAt: string; intervalSeconds?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [remaining, setRemaining] = useState(intervalSeconds);

  function refresh() {
    setRemaining(intervalSeconds);
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setRemaining((value) => {
        if (value <= 1) { startTransition(() => router.refresh()); return intervalSeconds; }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [intervalSeconds, router]);

  return <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-[var(--site-muted)]"><span>Son yenileme {time.format(new Date(renderedAt))}</span><span aria-hidden="true">·</span><span>{remaining} sn sonra</span><button type="button" onClick={refresh} disabled={pending} className="panel-secondary-button min-h-9 px-3 py-2 text-[11px]">{pending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Yenile</button></div>;
}
