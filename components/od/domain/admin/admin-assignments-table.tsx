"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Filter, Trash2 } from "lucide-react";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
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
  bulkUpdateAssignmentStatusAction,
  bulkDeleteAssignmentsAction,
} from "@/lib/services/assignments/bulk-actions";

export type AdminAssignmentRow = {
  id: string;
  title: string;
  subject: string | null;
  teacherName: string;
  targetLabel: string;
  targetTone: "lavender" | "mint" | "sky";
  dueAt: string | null;
  submissionCount: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
};

const STATUS_TONE: Record<AdminAssignmentRow["status"], "mint" | "neutral" | "sky"> = {
  PUBLISHED: "mint",
  DRAFT: "neutral",
  CLOSED: "sky",
};
const STATUS_LABEL: Record<AdminAssignmentRow["status"], string> = {
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  CLOSED: "Kapalı",
};
const STATUSES: AdminAssignmentRow["status"][] = ["PUBLISHED", "DRAFT", "CLOSED"];

export function AdminAssignmentsTable({
  data,
  savedViews = [],
  currentUserId,
}: {
  data: AdminAssignmentRow[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const navRouter = useRouter();
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
    () => ({ status: sp.getAll("status") }),
    [sp]
  );
  const totalActive = current.status.length;

  const toggleStatus = (v: string) => {
    const params = new URLSearchParams(sp.toString());
    const cur = params.getAll("status");
    params.delete("status");
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    next.forEach((x) => params.append("status", x));
    navRouter.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const clearAll = () => {
    const params = new URLSearchParams(sp.toString());
    params.delete("status");
    navRouter.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  function applyStatus(status: AdminAssignmentRow["status"]) {
    startTransition(async () => {
      const r = await bulkUpdateAssignmentStatusAction({
        assignmentIds: selectedIds,
        status,
      });
      if (r.ok) {
        toast.success(`${(r.data as any).count} ödev güncellendi`);
        setSelected({});
        router.refresh();
      } else {
        toast.error((r.error as any)?.message ?? "Hata");
      }
    });
  }
  function bulkDelete() {
    if (!confirm(`${selectedIds.length} ödev silinecek. Emin misiniz?`)) return;
    startTransition(async () => {
      const r = await bulkDeleteAssignmentsAction({ assignmentIds: selectedIds });
      if (r.ok) {
        toast.success(`${(r.data as any).count} ödev silindi`);
        setSelected({});
        router.refresh();
      } else {
        toast.error((r.error as any)?.message ?? "Hata");
      }
    });
  }

  const columns = React.useMemo<ColumnDef<AdminAssignmentRow>[]>(
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
        accessorKey: "title",
        header: "Başlık",
        cell: ({ row }) => (
          <Link
            href={`/v2/admin/odevler/${row.original.id}`}
            className="font-medium text-od-ink hover:text-od-accent"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "subject",
        header: "Ders",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">{row.original.subject ?? "—"}</span>
        ),
      },
      {
        accessorKey: "teacherName",
        header: "Öğretmen",
        cell: ({ row }) => <span className="text-od-mute">{row.original.teacherName}</span>,
      },
      {
        accessorKey: "targetLabel",
        header: "Hedef",
        cell: ({ row }) => (
          <Badge tone={row.original.targetTone} size="sm">
            {row.original.targetLabel}
          </Badge>
        ),
      },
      {
        accessorKey: "dueAt",
        header: "Son Teslim",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">
            {row.original.dueAt
              ? format(new Date(row.original.dueAt), "dd MMM yyyy", { locale: tr })
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "submissionCount",
        header: "Gönderim",
        cell: ({ row }) => (
          <span className="text-od-small font-medium text-od-ink-2">
            {row.original.submissionCount}
          </span>
        ),
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
        searchPlaceholder="Başlık, öğretmen, hedef ara…"
        pageSize={25}
        emptyState="Filtreye uyan ödev yok."
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
              <PopoverContent align="end" className="w-[280px] space-y-3 p-3">
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
                <div className="flex justify-end border-t border-od-border pt-2">
                  <Button variant="ghost" size="sm" onClick={clearAll} disabled={totalActive === 0}>
                    Temizle
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {currentUserId && (
              <SavedViewsMenu scope="assignments" views={savedViews} currentUserId={currentUserId} />
            )}
            <ExportButton endpoint="/api/v1/export/assignments" />
          </>
        }
      />
    </div>
  );
}
