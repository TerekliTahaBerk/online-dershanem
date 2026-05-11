"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Filter } from "lucide-react";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { Input } from "@/components/od/ui/input";
import { ExportButton } from "@/components/od/data/export-button";
import { SavedViewsMenu, type SavedViewItem } from "@/components/od/data/saved-views-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";

export type ParentLessonRow = {
  id: string;
  scheduledAt: string;
  childId: string;
  childName: string;
  title: string | null;
  subject: string | null;
  teacherName: string;
  duration: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

const STATUS_TONE: Record<ParentLessonRow["status"], "sky" | "mint" | "blush"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
};
const STATUS_LABEL: Record<ParentLessonRow["status"], string> = {
  SCHEDULED: "Planlı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};
const STATUSES: ParentLessonRow["status"][] = ["SCHEDULED", "COMPLETED", "CANCELLED"];

export function ParentLessonsTable({
  data,
  children,
  savedViews = [],
  currentUserId,
}: {
  data: ParentLessonRow[];
  children: { id: string; name: string }[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = React.useMemo(
    () => ({
      status: sp.getAll("status"),
      childId: sp.getAll("childId"),
      from: sp.get("from") ?? "",
      to: sp.get("to") ?? "",
    }),
    [sp]
  );

  const totalActive =
    current.status.length +
    current.childId.length +
    (current.from ? 1 : 0) +
    (current.to ? 1 : 0);

  const writeParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString());
    mut(params);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggle = (key: "status" | "childId", value: string) =>
    writeParams((p) => {
      const cur = p.getAll(key);
      p.delete(key);
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      next.forEach((v) => p.append(key, v));
    });

  const setDate = (key: "from" | "to", value: string) =>
    writeParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
    });

  const clearAll = () =>
    writeParams((p) => {
      ["status", "childId", "from", "to"].forEach((k) => p.delete(k));
    });

  const columns = React.useMemo<ColumnDef<ParentLessonRow>[]>(
    () => [
      {
        accessorKey: "scheduledAt",
        header: "Tarih",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">
            {format(new Date(row.original.scheduledAt), "dd MMM yyyy HH:mm", { locale: tr })}
          </span>
        ),
      },
      {
        accessorKey: "childName",
        header: "Çocuk",
        cell: ({ row }) => (
          <span className="font-medium text-od-ink">{row.original.childName}</span>
        ),
      },
      {
        id: "title",
        accessorFn: (r) => r.title ?? r.subject ?? "—",
        header: "Ders",
        cell: ({ row }) => (
          <span className="text-od-ink-2">
            {row.original.title ?? row.original.subject ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "teacherName",
        header: "Öğretmen",
        cell: ({ row }) => <span className="text-od-mute">{row.original.teacherName}</span>,
      },
      {
        accessorKey: "duration",
        header: "Süre",
        cell: ({ row }) => <span className="text-od-mute">{row.original.duration} dk</span>,
      },
      {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => (
          <Badge tone={STATUS_TONE[row.original.status]} size="sm">
            {STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Çocuk, ders, öğretmen ara…"
      pageSize={25}
      emptyState="Filtreye uyan ders yok."
      toolbar={
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-3.5 w-3.5" />
                Filtrele
                {totalActive > 0 && (
                  <Badge tone="lavender" size="sm" className="ml-1">{totalActive}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] space-y-3 p-3">
              <FilterGroup
                label="Durum"
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                selected={current.status}
                onToggle={(v) => toggle("status", v)}
              />
              {children.length > 1 && (
                <FilterGroup
                  label="Çocuk"
                  options={children.map((c) => ({ value: c.id, label: c.name }))}
                  selected={current.childId}
                  onToggle={(v) => toggle("childId", v)}
                />
              )}
              <div>
                <div className="mb-1.5 text-od-tiny font-semibold uppercase tracking-wide text-od-mute">
                  Tarih aralığı
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={current.from}
                    onChange={(e) => setDate("from", e.target.value)}
                  />
                  <Input
                    type="date"
                    value={current.to}
                    onChange={(e) => setDate("to", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-od-border pt-2">
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={totalActive === 0}>
                  Temizle
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {currentUserId && (
            <SavedViewsMenu scope="parent.lessons" views={savedViews} currentUserId={currentUserId} />
          )}
          <ExportButton endpoint="/api/v1/export/parent/lessons" />
        </>
      }
    />
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 text-od-tiny font-semibold uppercase tracking-wide text-od-mute">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={[
                "rounded-od-sm border px-2 py-1 text-od-tiny transition-colors",
                active
                  ? "border-od-accent bg-od-accent/10 text-od-accent"
                  : "border-od-border bg-od-surface text-od-ink-2 hover:border-od-ink/30",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
