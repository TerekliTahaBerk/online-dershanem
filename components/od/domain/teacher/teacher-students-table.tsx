"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
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
import { Filter } from "lucide-react";

export type TeacherStudentRow = {
  id: string;
  fullName: string;
  phone: string;
  classLevel: string | null;
  examType: string | null;
  status: "NEW" | "FOLLOW_UP" | "ACTIVE" | "AT_RISK" | "COMPLETED" | "INACTIVE";
  lessonCount: number;
};

const STATUS_TONE: Record<TeacherStudentRow["status"], "mint" | "sky" | "yellow" | "blush" | "lavender" | "neutral"> = {
  NEW: "lavender",
  FOLLOW_UP: "sky",
  ACTIVE: "mint",
  AT_RISK: "blush",
  COMPLETED: "neutral",
  INACTIVE: "neutral",
};
const STATUS_LABEL: Record<TeacherStudentRow["status"], string> = {
  NEW: "Yeni",
  FOLLOW_UP: "Takip",
  ACTIVE: "Aktif",
  AT_RISK: "Riskli",
  COMPLETED: "Tamamlandı",
  INACTIVE: "Pasif",
};

const STATUSES: TeacherStudentRow["status"][] = [
  "ACTIVE", "AT_RISK", "FOLLOW_UP", "NEW", "COMPLETED", "INACTIVE",
];

export function TeacherStudentsTable({
  data,
  classLevels,
  examTypes,
  savedViews = [],
  currentUserId,
}: {
  data: TeacherStudentRow[];
  classLevels: string[];
  examTypes: string[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = React.useMemo(
    () => ({
      status: sp.getAll("status"),
      classLevel: sp.getAll("classLevel"),
      examType: sp.getAll("examType"),
    }),
    [sp]
  );

  const totalActive =
    current.status.length + current.classLevel.length + current.examType.length;

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

  const clearAll = () => apply({ status: [], classLevel: [], examType: [] });

  const columns = React.useMemo<ColumnDef<TeacherStudentRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Öğrenci",
        cell: ({ row }) => (
          <span className="font-medium text-od-ink">{row.original.fullName}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Telefon",
        cell: ({ row }) => (
          <span className="font-mono text-od-tiny text-od-mute">{row.original.phone}</span>
        ),
      },
      {
        accessorKey: "classLevel",
        header: "Sınıf",
        cell: ({ row }) =>
          row.original.classLevel ? (
            <Badge tone="sky" size="sm">{row.original.classLevel}</Badge>
          ) : (
            <span className="text-od-mute-2">—</span>
          ),
      },
      {
        accessorKey: "examType",
        header: "Sınav",
        cell: ({ row }) =>
          row.original.examType ? (
            <Badge tone="lavender" size="sm">{row.original.examType}</Badge>
          ) : (
            <span className="text-od-mute-2">—</span>
          ),
      },
      {
        accessorKey: "lessonCount",
        header: "Ders",
        cell: ({ row }) => (
          <span className="text-od-small font-medium text-od-ink-2">
            {row.original.lessonCount}
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
      searchPlaceholder="Ad, telefon ara…"
      pageSize={25}
      emptyState="Filtreye uyan öğrenci yok."
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
            <PopoverContent align="end" className="w-[320px] p-3 space-y-3">
              <FilterGroup
                label="Durum"
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                selected={current.status}
                onToggle={(v) => toggle("status", v)}
              />
              <FilterGroup
                label="Sınıf"
                options={classLevels.map((v) => ({ value: v, label: v }))}
                selected={current.classLevel}
                onToggle={(v) => toggle("classLevel", v)}
              />
              <FilterGroup
                label="Sınav"
                options={examTypes.map((v) => ({ value: v, label: v }))}
                selected={current.examType}
                onToggle={(v) => toggle("examType", v)}
              />
              <div className="flex justify-end pt-2 border-t border-od-border">
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
            <SavedViewsMenu scope="teacher.students" views={savedViews} currentUserId={currentUserId} />
          )}
          <ExportButton endpoint="/api/v1/export/teacher/my-students" />
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
