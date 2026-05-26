"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRealtime } from "@/lib/realtime-client";

type Notif = { id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string; priority: string };
type Payload = { unread: number; items: Notif[] };

type Tab = "all" | "unread";

function priorityColor(p: string): string {
  const x = (p || "").toUpperCase();
  if (x === "HIGH" || x === "URGENT" || x === "CRITICAL") return "var(--pd-bad)";
  if (x === "LOW") return "var(--pd-muted-2, #9a9c98)";
  return "var(--pd-accent)";
}

function dayBucket(iso: string): "today" | "yesterday" | "older" {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startY = startToday - 86400000;
  const t = d.getTime();
  if (t >= startToday) return "today";
  if (t >= startY) return "yesterday";
  return "older";
}

const BUCKET_LABEL: Record<"today" | "yesterday" | "older", string> = {
  today: "Bugün",
  yesterday: "Dün",
  older: "Daha eski",
};

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload>({ unread: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

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

  const filtered = useMemo(
    () => tab === "unread" ? data.items.filter((n) => !n.readAt) : data.items,
    [tab, data.items],
  );

  const grouped = useMemo(() => {
    const g: Record<"today" | "yesterday" | "older", Notif[]> = { today: [], yesterday: [], older: [] };
    for (const n of filtered) g[dayBucket(n.createdAt)].push(n);
    return g;
  }, [filtered]);

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
            position: "absolute", right: 0, top: "calc(100% + 8px)", width: 380, maxHeight: 520,
            background: "var(--pd-card)", border: "1px solid var(--pd-line)", borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)", zIndex: 51, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{
              padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: "1px solid var(--pd-line)",
            }}>
              <strong style={{ fontSize: 13, color: "var(--pd-ink-1)" }}>Bildirimler</strong>
              <button onClick={markAll} className="od-btn od-btn-ghost od-btn-sm" style={{ fontSize: 11 }}>
                Tümünü okundu işaretle
              </button>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Bildirim filtresi" style={{
              display: "flex", borderBottom: "1px solid var(--pd-line)", padding: "0 8px",
            }}>
              {(["all", "unread"] as Tab[]).map((t) => {
                const active = tab === t;
                const count = t === "unread" ? data.unread : data.items.length;
                return (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      color: active ? "var(--pd-ink-1)" : "var(--pd-ink-3)",
                      borderBottom: active ? "2px solid var(--pd-accent)" : "2px solid transparent",
                    }}
                  >
                    {t === "all" ? "Tümü" : "Okunmamış"}
                    <span style={{ marginLeft: 6, fontSize: 11, color: "var(--pd-ink-3)" }}>({count})</span>
                  </button>
                );
              })}
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {loading ? (
                <div style={{ padding: 16, fontSize: 12, color: "var(--pd-ink-3)" }}>Yükleniyor…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--pd-ink-3)" }}>
                  {tab === "unread" ? "Okunmamış bildirim yok 🎉" : "Bildirim yok."}
                </div>
              ) : (
                (["today", "yesterday", "older"] as const).map((bucket) => {
                  const list = grouped[bucket];
                  if (list.length === 0) return null;
                  return (
                    <div key={bucket}>
                      <div style={{
                        padding: "6px 14px", fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                        textTransform: "uppercase", color: "var(--pd-ink-3)",
                        background: "var(--pd-bg-subtle, #f8f8f5)",
                      }}>
                        {BUCKET_LABEL[bucket]}
                      </div>
                      {list.map((n) => (
                        <div key={n.id} style={{
                          padding: "10px 14px", borderBottom: "1px solid var(--pd-line)",
                          background: n.readAt ? "transparent" : "var(--pd-bg-2, var(--pd-bg-subtle))",
                          color: "var(--pd-ink-1)",
                          display: "flex", gap: 10, alignItems: "flex-start",
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: 3, flexShrink: 0, marginTop: 7,
                            background: priorityColor(n.priority),
                          }} aria-hidden />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                              <strong style={{ fontSize: 13 }}>{n.title}</strong>
                              {!n.readAt ? (
                                <button
                                  onClick={() => markOne(n.id)}
                                  className="od-btn od-btn-ghost od-btn-sm"
                                  style={{ fontSize: 10, padding: "2px 6px" }}
                                  title="Okundu işaretle"
                                >
                                  ✓
                                </button>
                              ) : null}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--pd-ink-2)", lineHeight: 1.4 }}>{n.body}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "var(--pd-ink-3)" }}>
                                {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(n.createdAt))}
                              </span>
                              {n.href ? (
                                <Link
                                  href={n.href}
                                  onClick={() => { markOne(n.id); setOpen(false); }}
                                  className="od-btn od-btn-ghost od-btn-sm"
                                  style={{ fontSize: 11 }}
                                >
                                  Aç →
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
