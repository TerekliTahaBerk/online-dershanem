"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Megaphone,
  CreditCard,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Badge } from "@/components/od/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/od/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";
import { ScrollArea } from "@/components/od/ui/scroll-area";
import { cn } from "@/lib/utils/cn";

type Notif = {
  id: string;
  type: "SYSTEM" | "LESSON" | "CONTENT" | "PAYMENT" | "PERFORMANCE" | "ANNOUNCEMENT";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_META: Record<
  Notif["type"],
  { icon: React.ComponentType<{ className?: string }>; tone: string; label: string }
> = {
  SYSTEM:       { icon: Sparkles,     tone: "text-pastel-lavender-ink bg-pastel-lavender-soft", label: "Sistem" },
  LESSON:       { icon: GraduationCap, tone: "text-pastel-mint-ink bg-pastel-mint-soft",         label: "Ders" },
  CONTENT:      { icon: Inbox,        tone: "text-pastel-sky-ink bg-pastel-sky-soft",            label: "İçerik" },
  PAYMENT:      { icon: CreditCard,   tone: "text-pastel-yellow-ink bg-pastel-yellow-soft",      label: "Ödeme" },
  PERFORMANCE:  { icon: TrendingUp,   tone: "text-pastel-mint-ink bg-pastel-mint-soft",          label: "Performans" },
  ANNOUNCEMENT: { icon: Megaphone,    tone: "text-pastel-blush-ink bg-pastel-blush-soft",        label: "Duyuru" },
};

export function NotificationCenter() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notif[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const loadCount = React.useCallback(async () => {
    try {
      const r = await fetch("/api/v1/notifications/unread", {
        credentials: "same-origin",
      });
      if (!r.ok) return;
      const j = await r.json();
      setUnread(j.count ?? 0);
    } catch {}
  }, []);

  const loadList = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/notifications?take=20", {
        credentials: "same-origin",
      });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + 30s polling for unread count
  React.useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, 30_000);
    return () => clearInterval(id);
  }, [loadCount]);

  // Realtime SSE — push-update unread count + toast on new notification
  React.useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    let retryDelay = 2_000;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource("/api/v1/realtime/notifications", {
        withCredentials: true,
      });
      es.onopen = () => {
        retryDelay = 2_000;
      };
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.kind === "notification") {
            setUnread((c) => c + 1);
            // Refresh list if popover currently open
            setOpen((isOpen) => {
              if (isOpen) loadList();
              return isOpen;
            });
            const p = data.payload;
            if (p?.title) {
              toast(p.title, {
                description: p.body,
                action: p.href
                  ? {
                      label: "Aç",
                      onClick: () => {
                        window.location.href = p.href;
                      },
                    }
                  : undefined,
              });
            }
          }
        } catch {
          /* ignore non-JSON */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        // Exponential backoff up to 30s
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    };
    connect();
    return () => {
      cancelled = true;
      es?.close();
    };
  }, [loadList]);

  // Fetch list when opened
  React.useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  const markAllRead = async () => {
    await fetch("/api/v1/notifications", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
    );
    setUnread(0);
  };

  const markOneRead = async (id: string) => {
    await fetch("/api/v1/notifications", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    setUnread((c) => Math.max(0, c - 1));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Bildirimler" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <Badge
                  tone="blush"
                  size="sm"
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-[10px]"
                >
                  {unread > 9 ? "9+" : unread}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Bildirimler</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-od-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-od-mute" />
            <span className="text-od-small font-semibold text-od-ink">Bildirimler</span>
            {unread > 0 && (
              <Badge tone="blush" size="sm">
                {unread} yeni
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={unread === 0}
            className="h-7 text-od-tiny"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tümünü oku
          </Button>
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {loading && items.length === 0 ? (
            <div className="px-3 py-8 text-center text-od-small text-od-mute">
              Yükleniyor…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-od-mute">
              <Inbox className="h-8 w-8 text-od-mute-2" />
              <span className="text-od-small">Henüz bildirim yok</span>
            </div>
          ) : (
            <ul className="divide-y divide-od-border/60">
              {items.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
                const Icon = meta.icon;
                const unreadDot = !n.readAt;
                const content = (
                  <div
                    className={cn(
                      "flex gap-3 px-3 py-2.5 hover:bg-od-subtle/60 transition-colors",
                      unreadDot && "bg-pastel-sky-soft/30"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-od-sm",
                        meta.tone
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-od-small font-medium text-od-ink line-clamp-1">
                          {n.title}
                        </p>
                        {unreadDot && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pastel-blush-ink" />
                        )}
                      </div>
                      <p className="mt-0.5 text-od-tiny text-od-mute-2 line-clamp-2">
                        {n.body}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-od-mute">
                        <span>{meta.label}</span>
                        <span>·</span>
                        <span>
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: tr,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          if (unreadDot) markOneRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => unreadDot && markOneRead(n.id)}
                        className="block w-full text-left"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-od-border bg-od-subtle/40 px-3 py-2 text-center">
          <Link
            href="/v2/bildirimler"
            onClick={() => setOpen(false)}
            className="text-od-tiny font-medium text-od-accent hover:underline"
          >
            Tümünü görüntüle
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
