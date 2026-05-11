"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronDown,
  Filter,
  Trash2,
  Video,
} from "lucide-react";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { Input } from "@/components/od/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/od/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";
import { ExportButton } from "@/components/od/data/export-button";
import { SavedViewsMenu, type SavedViewItem } from "@/components/od/data/saved-views-menu";
import {
  bulkUpdateLessonStatusAction,
  bulkDeleteLessonsAction,
  bulkRescheduleLessonsAction,
} from "@/lib/services/lessons/bulk-actions";
import { useSearchParams, useRouter as useNavRouter, usePathname } from "next/navigation";

export type AdminLessonRow = {
  id: string;
  scheduledAt: string;
  studentName: string;
  teacherName: string;
  title: string | null;
  subject: string | null;
  duration: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  googleMeetLink: string | null;
};

const STATUS_TONE: Record<AdminLessonRow["status"], "sky" | "mint" | "blush"> = {
  SCHEDULED: "sky",
  COMPLETED: "mint",
  CANCELLED: "blush",
};
const STATUS_LABEL: Record<AdminLessonRow["status"], string> = {
  SCHEDULED: "Planlı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};
const STATUSES: AdminLessonRow["status"][] = ["SCHEDULED", "COMPLETED", "CANCELLED"];

export function AdminLessonsTable({
  data,
  savedViews = [],
  currentUserId,
}: {
  data: AdminLessonRow[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const navRouter = useNavRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const selectedIds = React.useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );
  const allSelected = data.length > 0 && data.every((r) => selected[r.id]);
  const toggleAll = () => {
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(data.map((r) => [r.id, true])));
  };

  const current = React.useMemo(
    () => ({
      status: sp.getAll("status"),
      from: sp.get("from") ?? "",
      to: sp.get("to") ?? "",
    }),
    [sp]
  );
  const totalActive =
    current.status.length + (current.from ? 1 : 0) + (current.to ? 1 : 0);

  const writeParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString());
    mut(params);
    navRouter.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const toggleStatus = (v: string) =>
    writeParams((p) => {
      const cur = p.getAll("status");
      p.delete("status");
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      next.forEach((x) => p.append("status", x));
    });
  const setDate = (k: "from" | "to", v: string) =>
    writeParams((p) => (v ? p.set(k, v) : p.delete(k)));
  const clearAll = () =>
    writeParams((p) => ["status", "from", "to"].forEach((k) => p.delete(k)));

  function applyStatus(status: AdminLessonRow["status"]) {
    startTransition(async () => {
      const r = await bulkUpdateLessonStatusAction({ lessonIds: selectedIds, status });
      if (r.ok) {
        toast.success(`${(r.data as any).count} ders güncellendi`);
        setSelected({});
        router.refresh();
      } else {
        toast.error((r.error as any)?.message ?? "Hata");
      }
    });
  }
  function reschedule(newDate: string) {
    if (!newDate) return;
    startTransition(async () => {
      const r = await bulkRescheduleLessonsAction({ lessonIds: selectedIds, newDate });
      if (r.ok) {
        toast.success(`${(r.data as any).count} ders ertelendi`);
        setSelected({});
        router.refresh();
      } else {
        toast.error((r.error as any)?.message ?? "Hata");
      }
    });
  }
  function bulkDelete() {
    if (!confirm(`${selectedIds.length} ders silinecek. Emin misiniz?`)) return;
    startTransition(async () => {
      const r = await bulkDeleteLessonsAction({ lessonIds: selectedIds });
      if (r.ok) {
        toast.success(`${(r.data as any).count} ders silindi`);
        setSelected({});
        router.refresh();
      } else {
        toast.error((r.error as any)?.message ?? "Hata");
      }
    });
  }

  const columns = React.useMemo<ColumnDef<AdminLessonRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-od-border"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={!!selected[row.original.id]}
            onChange={(e) =>
              setSelected((s) => ({ ...s, [row.original.id]: e.target.checked }))
            }
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-od-border"
          />
        ),
        size: 32,
      },
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
        accessorKey: "studentName",
        header: "Öğrenci",
        cell: ({ row }) => (
          <Link
            href={`/v2/admin/dersler/${row.original.id}`}
            className="font-medium text-od-ink hover:text-od-accent"
          >
            {row.original.studentName}
          </Link>
        ),
      },
      {
        accessorKey: "teacherName",
        header: "Öğretmen",
        cell: ({ row }) => <span className="text-od-mute">{row.original.teacherName}</span>,
      },
      {
        id: "title",
        accessorFn: (r) => r.title ?? r.subject ?? "—",
        header: "Konu",
        cell: ({ row }) => (
          <span className="text-od-ink-2">{row.original.title ?? row.original.subject ?? "—"}</span>
        ),
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
      {
        id: "meet",
        header: "",
        cell: ({ row }) =>
          row.original.googleMeetLink ? (
            <a
              href={row.original.googleMeetLink}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
            >
              <Video className="h-3.5 w-3.5" /> Meet
            </a>
          ) : null,
      },
    ],
    [selected, allSelected]
  );

  return (
    <div className="space-y-od-3">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-od-2 rounded-od border border-pastel-sky-line bg-pastel-sky-soft px-od-3 py-od-2">
          <Badge tone="sky">{selectedIds.length} seçili</Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                <Filter className="mr-1 h-3.5 w-3.5" /> Durum <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Toplu Durum</DropdownMenuLabel>
              {STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => applyStatus(s)}>
                  {STATUS_LABEL[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                <CalendarDays className="mr-1 h-3.5 w-3.5" /> Ertele
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] space-y-2 p-3">
              <p className="text-od-tiny text-od-mute">
                Yeni gün — saat korunur ve durum SCHEDULED olur.
              </p>
              <Input
                type="date"
                onChange={(e) => reschedule(e.target.value)}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="text-pastel-blush-ink"
            onClick={bulkDelete}
            disabled={pending}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Sil
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setSelected({})} disabled={pending}>
            Temizle
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Öğrenci, öğretmen, konu ara…"
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
              <PopoverContent align="end" className="w-[320px] space-y-3 p-3">
                <div>
                  <div className="mb-1.5 text-od-tiny font-semibold uppercase tracking-wide text-od-mute">
                    Durum
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {STATUSES.map((s) => {
                      const active = current.status.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleStatus(s)}
                          className={[
                            "rounded-od-sm border px-2 py-1 text-od-tiny transition-colors",
                            active
                              ? "border-od-accent bg-od-accent/10 text-od-accent"
                              : "border-od-border bg-od-surface text-od-ink-2 hover:border-od-ink/30",
                          ].join(" ")}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-od-tiny font-semibold uppercase tracking-wide text-od-mute">
                    Tarih aralığı
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={current.from} onChange={(e) => setDate("from", e.target.value)} />
                    <Input type="date" value={current.to} onChange={(e) => setDate("to", e.target.value)} />
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
              <SavedViewsMenu scope="lessons" views={savedViews} currentUserId={currentUserId} />
            )}
            <ExportButton endpoint="/api/v1/export/lessons" />
          </>
        }
      />
    </div>
  );
}
