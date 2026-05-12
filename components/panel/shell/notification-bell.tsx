"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRealtime } from "@/lib/realtime-client";

type Notif = { id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string; priority: string };
type Payload = { unread: number; items: Notif[] };

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload>({ unread: 0, items: [] });
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/panel/notifications", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  useRealtime(`user-${userId}`, {
    "notification:new": () => refresh(),
    "inbox:update": (d) => setData((prev) => ({ ...prev, unread: (d as { unread: number }).unread })),
  });

  async function markAll() {
    await fetch("/api/panel/notifications", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    refresh();
  }

  async function markOne(id: string) {
    await fetch("/api/panel/notifications", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirimler"
        className="od-btn od-btn-ghost od-btn-sm"
        style={{ position: "relative", padding: "6px 10px" }}
      >
        🔔
        {data.unread > 0 ? (
          <span style={{
            position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9, background: "var(--pd-bad)", color: "#fff", fontSize: 11, fontWeight: 700,
            display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}>
            {data.unread > 99 ? "99+" : data.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360, maxHeight: 480,
            background: "var(--pd-card)", border: "1px solid var(--pd-line)", borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)", zIndex: 51, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: "1px solid var(--pd-line)",
            }}>
              <strong style={{ fontSize: 13, color: "var(--pd-ink-1)" }}>Bildirimler</strong>
              <button onClick={markAll} className="od-btn od-btn-ghost od-btn-sm" style={{ fontSize: 11 }}>
                Tümünü okundu işaretle
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loading ? (
                <div style={{ padding: 16, fontSize: 12, color: "var(--pd-ink-3)" }}>Yükleniyor…</div>
              ) : data.items.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--pd-ink-3)" }}>Bildirim yok.</div>
              ) : data.items.map((n) => {
                const Wrapper: React.ElementType = n.href ? Link : "div";
                const wrapperProps = n.href ? { href: n.href, onClick: () => { markOne(n.id); setOpen(false); } } : {};
                return (
                  <Wrapper key={n.id} {...wrapperProps} style={{
                    display: "block", padding: "12px 14px", borderBottom: "1px solid var(--pd-line)",
                    background: n.readAt ? "transparent" : "var(--pd-bg-2)",
                    cursor: n.href ? "pointer" : "default", color: "var(--pd-ink-1)", textDecoration: "none",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 13 }}>{n.title}</strong>
                      {!n.readAt ? <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--pd-accent)", flexShrink: 0, marginTop: 5 }} /> : null}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--pd-ink-2)", lineHeight: 1.4 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: "var(--pd-ink-3)", marginTop: 4 }}>
                      {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(n.createdAt))}
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
