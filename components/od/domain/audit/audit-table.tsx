"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { ScrollText, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";
import { Input } from "@/components/od/ui/input";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { cn } from "@/lib/utils/cn";

type AuditRow = {
  id: string;
  actorUserId: string | null;
  actorType: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string | null;
  payload: any;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string | null; role: string } | null;
};

type Props = {
  rows: AuditRow[];
  total: number;
  filter: { entityType?: string; action?: string; q?: string; page?: number };
};

const ACTION_TONE: Record<string, "mint" | "sky" | "yellow" | "blush" | "lavender" | "neutral"> = {
  create: "mint",
  update: "sky",
  delete: "blush",
  read: "neutral",
  archive: "yellow",
  unarchive: "yellow",
  toggle: "lavender",
  set: "lavender",
  remove: "blush",
  broadcast: "lavender",
  login: "mint",
  logout: "neutral",
};

function actionTone(action: string) {
  const lower = action.toLowerCase();
  for (const [k, v] of Object.entries(ACTION_TONE)) {
    if (lower.includes(k)) return v;
  }
  return "neutral" as const;
}

export function AuditTable({ rows, total, filter }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(filter.q ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const page = filter.page ?? 1;
  const hasNext = rows.length === 50;

  function applyFilter(patch: Record<string, string | null>) {
    const sp = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    });
    sp.delete("page");
    router.push(`/v2/admin/audit?${sp.toString()}`);
  }

  function toggleRow(id: string) {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  }

  return (
    <div className="space-y-od-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-od-3 py-od-3">
          <ScrollText className="h-4 w-4 text-od-mute" />
          <span className="text-od-small text-od-mute">{total} kayıt</span>
          <div className="ml-auto flex flex-wrap items-center gap-od-2">
            <Input
              type="search"
              placeholder="entityType / action ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilter({ q: search || null });
              }}
              className="w-56"
            />
            <select
              className="h-9 rounded-od border border-od-border bg-od-surface px-od-2 text-od-small"
              value={filter.entityType ?? ""}
              onChange={(e) => applyFilter({ entityType: e.target.value || null })}
            >
              <option value="">Tüm varlıklar</option>
              <option>Student</option>
              <option>Teacher</option>
              <option>Parent</option>
              <option>Classroom</option>
              <option>Lesson</option>
              <option>Payment</option>
              <option>InboxMessage</option>
              <option>RolePermission</option>
              <option>UserPermissionOverride</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          tone="lavender"
          icon={ScrollText}
          title="Kayıt yok"
          description="Bu filtreye uyan audit kaydı bulunamadı."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-od-border">
              {rows.map((r) => (
                <li key={r.id} className="hover:bg-od-subtle transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleRow(r.id)}
                    className="flex w-full items-start gap-od-3 px-od-4 py-od-3 text-left"
                  >
                    <ChevronRight
                      className={cn(
                        "mt-1 h-4 w-4 text-od-mute transition-transform",
                        expanded.has(r.id) && "rotate-90",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-od-2">
                        <Badge tone="neutral">{r.entityType}</Badge>
                        <Badge tone={actionTone(r.action)}>{r.action}</Badge>
                        <code className="truncate text-od-tiny text-od-mute">
                          {r.entityId}
                        </code>
                        <span className="ml-auto text-od-tiny text-od-mute">
                          {formatDistanceToNow(new Date(r.createdAt), {
                            addSuffix: true,
                            locale: tr,
                          })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-od-2 text-od-small">
                        <span className="font-medium text-od-ink-2">
                          {r.actor?.name ?? r.actor?.email ?? "—"}
                        </span>
                        {r.actor && (
                          <Badge tone="lavender">{r.actor.role}</Badge>
                        )}
                        {r.summary && (
                          <span className="truncate text-od-mute">· {r.summary}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {expanded.has(r.id) && (
                    <div className="border-t border-od-border bg-od-subtle/50 px-od-10 py-od-3">
                      <div className="grid gap-od-2 text-od-tiny sm:grid-cols-2">
                        <div>
                          <span className="text-od-mute">Tam tarih:</span>{" "}
                          <span className="font-mono">
                            {format(new Date(r.createdAt), "dd MMM yyyy HH:mm:ss", { locale: tr })}
                          </span>
                        </div>
                        <div>
                          <span className="text-od-mute">Actor type:</span>{" "}
                          <span className="font-mono">{r.actorType}</span>
                        </div>
                      </div>
                      {r.payload && (
                        <pre className="mt-od-2 overflow-x-auto rounded-od bg-od-bg p-od-2 text-od-tiny font-mono text-od-ink-2">
                          {JSON.stringify(r.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-od-tiny text-od-mute">Sayfa {page}</span>
        <div className="flex gap-od-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => applyFilter({ page: String(page - 1) })}
          >
            Önceki
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNext}
            onClick={() => applyFilter({ page: String(page + 1) })}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
