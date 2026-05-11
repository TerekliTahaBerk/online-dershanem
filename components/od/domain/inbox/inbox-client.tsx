"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Bell, Archive, Check, Trash2, Megaphone, Filter } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Input } from "@/components/od/ui/input";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { LivePresenceDot, PresenceProvider } from "@/components/od/presence/live-presence";
import { cn } from "@/lib/utils/cn";
import {
  markInboxRead,
  archiveInbox,
  unarchiveInbox,
  deleteInbox,
} from "@/lib/services/inbox/mutations";
import { toast } from "sonner";

type InboxItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  href: string | null;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  createdBy: { id: string; name: string | null; email: string | null; role: string } | null;
};

type Props = {
  items: InboxItem[];
  unreadCount: number;
  total: number;
  filter: { unreadOnly?: boolean; archived?: boolean; category?: string; q?: string };
};

const CATEGORY_TONE: Record<string, "sky" | "yellow" | "mint" | "blush" | "lavender" | "neutral"> = {
  SYSTEM: "neutral",
  FINANCE: "yellow",
  EDUCATION: "mint",
  ANNOUNCEMENT: "lavender",
  TEACHER_MESSAGE: "sky",
  ATTENDANCE: "sky",
  ASSIGNMENT: "blush",
};

const CATEGORY_LABEL: Record<string, string> = {
  SYSTEM: "Sistem",
  FINANCE: "Finans",
  EDUCATION: "Eğitim",
  ANNOUNCEMENT: "Duyuru",
  TEACHER_MESSAGE: "Öğretmen Mesajı",
  ATTENDANCE: "Yoklama",
  ASSIGNMENT: "Ödev",
};

const PRIORITY_TONE: Record<string, "sky" | "yellow" | "mint" | "blush" | "lavender" | "neutral"> = {
  LOW: "neutral",
  NORMAL: "sky",
  HIGH: "yellow",
  URGENT: "blush",
};

export function InboxClient({ items, unreadCount, total, filter }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(filter.q ?? "");
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  async function bulk(action: "read" | "archive" | "unarchive" | "delete") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const fn = {
        read: markInboxRead,
        archive: archiveInbox,
        unarchive: unarchiveInbox,
        delete: deleteInbox,
      }[action];
      const res = await fn({ ids });
      if (res.ok) {
        toast.success(`${res.data.count} mesaj güncellendi`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  function applyFilter(patch: Record<string, string | null>) {
    const sp = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    });
    router.push(`/v2/admin/inbox?${sp.toString()}`);
  }

  return (
    <PresenceProvider userIds={items.map((m) => m.createdBy?.id).filter(Boolean) as string[]}>
    <div className="space-y-od-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-od-3 py-od-3">
          <div className="flex items-center gap-od-2">
            <Bell className="h-4 w-4 text-od-mute" />
            <span className="text-od-small text-od-ink-2">
              {unreadCount} okunmamış · {total} toplam
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-od-2">
            <Input
              type="search"
              placeholder="Ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilter({ q: search || null });
              }}
              className="w-48"
            />

            <Button
              size="sm"
              variant={filter.unreadOnly ? "primary" : "outline"}
              onClick={() => applyFilter({ unread: filter.unreadOnly ? null : "1" })}
            >
              Okunmamış
            </Button>

            <Button
              size="sm"
              variant={filter.archived ? "primary" : "outline"}
              onClick={() => applyFilter({ archived: filter.archived ? null : "1" })}
            >
              Arşiv
            </Button>

            <select
              className="h-9 rounded-od border border-od-border bg-od-surface px-od-2 text-od-small"
              value={filter.category ?? ""}
              onChange={(e) => applyFilter({ category: e.target.value || null })}
            >
              <option value="">Tüm kategoriler</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <Link href="/v2/admin/inbox/yeni-duyuru">
              <Button size="sm" variant="accent">
                <Megaphone className="mr-1 h-4 w-4" />
                Duyuru Gönder
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Card className="border-od-accent/40 bg-od-accent-soft">
          <CardContent className="flex items-center gap-od-3 py-od-3">
            <span className="text-od-small font-medium text-od-ink">
              {selected.size} seçili
            </span>
            <div className="ml-auto flex gap-od-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk("read")}>
                <Check className="mr-1 h-4 w-4" /> Okundu işaretle
              </Button>
              {filter.archived ? (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk("unarchive")}>
                  <Archive className="mr-1 h-4 w-4" /> Arşivden çıkar
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk("archive")}>
                  <Archive className="mr-1 h-4 w-4" /> Arşivle
                </Button>
              )}
              <Button size="sm" variant="danger" disabled={pending} onClick={() => bulk("delete")}>
                <Trash2 className="mr-1 h-4 w-4" /> Sil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {items.length === 0 ? (
        <EmptyState
          tone="lavender"
          icon={Bell}
          title="Mesaj yok"
          description="Bu filtreye uyan mesaj bulunamadı."
        />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center gap-od-3">
            <input
              type="checkbox"
              checked={selected.size === items.length && items.length > 0}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-od-border"
            />
            <CardTitle className="text-od-small text-od-mute">
              Tümünü seç
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-od-border">
              {items.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "flex items-start gap-od-3 px-od-4 py-od-3 transition-colors hover:bg-od-subtle",
                    !m.readAt && "bg-pastel-sky-soft/40",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="mt-1 h-4 w-4 rounded border-od-border"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-od-2">
                      <Badge tone={CATEGORY_TONE[m.category] ?? "neutral"}>
                        {CATEGORY_LABEL[m.category] ?? m.category}
                      </Badge>
                      {m.priority !== "NORMAL" && (
                        <Badge tone={PRIORITY_TONE[m.priority] ?? "neutral"}>
                          {m.priority}
                        </Badge>
                      )}
                      <span className="ml-auto text-od-tiny text-od-mute">
                        {formatDistanceToNow(new Date(m.createdAt), {
                          addSuffix: true,
                          locale: tr,
                        })}
                      </span>
                    </div>
                    <h3
                      className={cn(
                        "mt-1 truncate text-od-body",
                        !m.readAt ? "font-semibold text-od-ink" : "font-medium text-od-ink-2",
                      )}
                    >
                      {m.title}
                    </h3>
                    {m.createdBy && (
                      <div className="mt-0.5 flex items-center gap-1 text-od-tiny text-od-mute">
                        <LivePresenceDot userId={m.createdBy.id} />
                        <span>{m.createdBy.name ?? m.createdBy.email ?? "Sistem"}</span>
                      </div>
                    )}
                    <p className="mt-0.5 line-clamp-2 text-od-small text-od-mute">
                      {m.body}
                    </p>
                    {m.href && (
                      <Link
                        href={m.href}
                        className="mt-1 inline-block text-od-tiny font-medium text-od-accent hover:underline"
                      >
                        Aç →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
    </PresenceProvider>
  );
}
