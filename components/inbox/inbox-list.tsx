"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox as InboxIcon, Check, Archive, ArchiveRestore, AlertCircle,
  CreditCard, GraduationCap, Megaphone, MessageSquare, ClipboardList,
  ClipboardCheck, Settings,
} from "lucide-react";
import type { InboxCategory, InboxPriority } from "@prisma/client";

type Item = {
  id: string;
  category: InboxCategory;
  priority: InboxPriority;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  createdBy: { id: string; name: string | null; email: string | null; role: string } | null;
};

const CATEGORY_META: Record<InboxCategory, { label: string; icon: typeof InboxIcon; tone: string }> = {
  SYSTEM: { label: "Sistem", icon: Settings, tone: "var(--pd-muted-2)" },
  FINANCE: { label: "Finans", icon: CreditCard, tone: "#10b981" },
  EDUCATION: { label: "Eğitim", icon: GraduationCap, tone: "#3b82f6" },
  ANNOUNCEMENT: { label: "Duyuru", icon: Megaphone, tone: "#f59e0b" },
  TEACHER_MESSAGE: { label: "Öğretmen", icon: MessageSquare, tone: "#8b5cf6" },
  ATTENDANCE: { label: "Yoklama", icon: ClipboardList, tone: "#ef4444" },
  ASSIGNMENT: { label: "Ödev", icon: ClipboardCheck, tone: "#06b6d4" },
};

const PRIORITY_META: Record<InboxPriority, { label: string; color: string }> = {
  LOW: { label: "Düşük", color: "var(--pd-muted-2)" },
  NORMAL: { label: "Normal", color: "var(--pd-ink-3)" },
  HIGH: { label: "Yüksek", color: "#f59e0b" },
  URGENT: { label: "Acil", color: "#ef4444" },
};

function formatRelative(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(d).toLocaleDateString("tr-TR");
}

export type InboxAction = (formData: FormData) => Promise<void>;

export function InboxList({
  items,
  total,
  unread,
  archived,
  basePath,
  onMarkRead,
  onArchive,
  onUnarchive,
  onMarkAllRead,
}: {
  items: Item[];
  total: number;
  unread: number;
  archived: boolean;
  basePath: string;
  onMarkRead: InboxAction;
  onArchive: InboxAction;
  onUnarchive: InboxAction;
  onMarkAllRead: InboxAction;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = (action: InboxAction) => {
    if (selected.size === 0) return;
    const fd = new FormData();
    for (const id of selected) fd.append("ids", id);
    startTransition(async () => {
      await action(fd);
      setSelected(new Set());
      router.refresh();
    });
  };

  const runMarkAllRead = () => {
    startTransition(async () => {
      await onMarkAllRead(new FormData());
      router.refresh();
    });
  };

  return (
    <div>
      {/* Filtreler */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link
          href={basePath}
          className={`pd-chip ${!archived ? "active" : ""}`}
          style={{ textDecoration: "none" }}
        >
          <InboxIcon size={13} /> Gelen kutusu {unread > 0 ? <strong>({unread})</strong> : null}
        </Link>
        <Link
          href={`${basePath}?archived=1`}
          className={`pd-chip ${archived ? "active" : ""}`}
          style={{ textDecoration: "none" }}
        >
          <Archive size={13} /> Arşiv
        </Link>
        <span style={{ flex: 1 }} />
        {selected.size > 0 ? (
          <>
            <button
              type="button"
              className="pd-btn-ghost"
              disabled={isPending}
              onClick={() => runBulk(onMarkRead)}
            >
              <Check size={14} /> Okundu işaretle ({selected.size})
            </button>
            <button
              type="button"
              className="pd-btn-ghost"
              disabled={isPending}
              onClick={() => runBulk(archived ? onUnarchive : onArchive)}
            >
              {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {archived ? " Geri al" : " Arşivle"} ({selected.size})
            </button>
          </>
        ) : (
          unread > 0 && !archived && (
            <button
              type="button"
              className="pd-btn-ghost"
              disabled={isPending}
              onClick={runMarkAllRead}
            >
              <Check size={14} /> Tümünü okundu işaretle
            </button>
          )
        )}
      </div>

      {/* Liste */}
      {items.length === 0 ? (
        <div className="pd-card" style={{ padding: 32, textAlign: "center", color: "var(--pd-muted-2)" }}>
          <InboxIcon size={32} style={{ opacity: 0.5, margin: "0 auto 8px" }} />
          <div>{archived ? "Arşivlenmiş mesaj yok." : "Gelen kutunuz boş."}</div>
        </div>
      ) : (
        <div className="pd-card" style={{ padding: 0, overflow: "hidden" }}>
          {items.map((m) => {
            const meta = CATEGORY_META[m.category];
            const prio = PRIORITY_META[m.priority];
            const Icon = meta.icon;
            const isUnread = !m.readAt;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--pd-border)",
                  background: isUnread ? "var(--pd-bg-hover, rgba(99,102,241,0.04))" : "transparent",
                  alignItems: "flex-start",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  style={{ marginTop: 4 }}
                />
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: meta.tone + "22", color: meta.tone,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontWeight: isUnread ? 600 : 500 }}>{m.title}</strong>
                    <span className="pd-chip" style={{ fontSize: 11, padding: "1px 6px" }}>
                      {meta.label}
                    </span>
                    {(m.priority === "HIGH" || m.priority === "URGENT") && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: prio.color }}>
                        <AlertCircle size={11} /> {prio.label}
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--pd-muted-2)" }}>
                      {formatRelative(m.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--pd-ink-3)", marginTop: 2 }}>{m.body}</div>
                  {m.href ? (
                    <Link
                      href={m.href}
                      style={{ fontSize: 12, color: "var(--pd-accent)", textDecoration: "none", marginTop: 4, display: "inline-block" }}
                      onClick={() => {
                        if (isUnread) {
                          const fd = new FormData();
                          fd.append("ids", m.id);
                          startTransition(async () => { await onMarkRead(fd); });
                        }
                      }}
                    >
                      Aç →
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: "var(--pd-muted-2)", textAlign: "right" }}>
        Toplam {total} mesaj
      </div>
    </div>
  );
}
