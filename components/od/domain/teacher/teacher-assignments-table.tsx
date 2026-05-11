"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Filter } from "lucide-react";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { ExportButton } from "@/components/od/data/export-button";
import { SavedViewsMenu, type SavedViewItem } from "@/components/od/data/saved-views-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";

export type TeacherAssignmentRow = {
  id: string;
  title: string;
  subject: string | null;
  targetLabel: string;
  classroomId: string | null;
  dueAt: string | null;
  submissionCount: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
};

const STATUS_TONE: Record<TeacherAssignmentRow["status"], "mint" | "neutral" | "sky"> = {
  PUBLISHED: "mint",
  DRAFT: "neutral",
  CLOSED: "sky",
};
const STATUS_LABEL: Record<TeacherAssignmentRow["status"], string> = {
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  CLOSED: "Kapalı",
};
const STATUSES: TeacherAssignmentRow["status"][] = ["PUBLISHED", "DRAFT", "CLOSED"];

export function TeacherAssignmentsTable({
  data,
  classrooms,
  savedViews = [],
  currentUserId,
}: {
  data: TeacherAssignmentRow[];
  classrooms: { id: string; name: string }[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = React.useMemo(
    () => ({
      status: sp.getAll("status"),
      classroomId: sp.getAll("classroomId"),
    }),
    [sp]
  );

  const totalActive = current.status.length + current.classroomId.length;

  const apply = (next: Partial<typeof current>) => {
    const params = new URLSearchParams(sp.toString());
    (Object.keys(next) as (keyof typeof current)[]).forEach((k) => {
      params.delete(k);
      (next[k] ?? []).forEach((v) => params.append(k, v));
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggle = (key: keyof typeof current, value: string) => {
    const exists = current[key].includes(value);
    apply({
      [key]: exists ? current[key].filter((v) => v !== value) : [...current[key], value],
    });
  };

  const clearAll = () => apply({ status: [], classroomId: [] });

  const columns = React.useMemo<ColumnDef<TeacherAssignmentRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Başlık",
        cell: ({ row }) => (
          <Link
            href={`/v2/ogretmen/odevler/${row.original.id}`}
            className="font-medium text-od-ink hover:text-pastel-sky-ink"
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
        accessorKey: "targetLabel",
        header: "Hedef",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">{row.original.targetLabel}</span>
        ),
      },
      {
        accessorKey: "dueAt",
        header: "Son Teslim",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">
            {row.original.dueAt
              ? format(new Date(row.original.dueAt), "dd MMM yyyy HH:mm", { locale: tr })
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
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Başlık, hedef ara…"
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
            <PopoverContent align="end" className="w-[340px] space-y-3 p-3">
              <FilterGroup
                label="Durum"
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                selected={current.status}
                onToggle={(v) => toggle("status", v)}
              />
              <FilterGroup
                label="Sınıf"
                options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
                selected={current.classroomId}
                onToggle={(v) => toggle("classroomId", v)}
              />
              <div className="flex justify-end border-t border-od-border pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={totalActive === 0}
                >
                  Temizle
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {currentUserId && (
            <SavedViewsMenu scope="teacher.assignments" views={savedViews} currentUserId={currentUserId} />
          )}
          <ExportButton endpoint="/api/v1/export/teacher/my-assignments" />
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
