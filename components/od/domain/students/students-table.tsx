"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Filter } from "lucide-react";
import { DataTable } from "@/components/od/data/data-table";
import { Button } from "@/components/od/ui/button";
import { Badge } from "@/components/od/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/od/ui/dropdown-menu";
import { StudentsBulkBar } from "./students-bulk-bar";

export type StudentRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  classLevel: string | null;
  examType: string | null;
  city: string | null;
  status: "NEW" | "FOLLOW_UP" | "ACTIVE" | "AT_RISK" | "COMPLETED" | "INACTIVE";
  activePackage: string | null;
  updatedAt: string | Date;
  tags: { tag: { id: string; key: string; label: string; color: string } }[];
  _count: { lessons: number };
};

const STATUS_TONE: Record<StudentRow["status"], "neutral" | "mint" | "sky" | "yellow" | "blush" | "lavender"> = {
  NEW:        "lavender",
  FOLLOW_UP:  "sky",
  ACTIVE:     "mint",
  AT_RISK:    "blush",
  COMPLETED:  "neutral",
  INACTIVE:   "neutral"
};

const STATUS_LABEL: Record<StudentRow["status"], string> = {
  NEW: "Yeni",
  FOLLOW_UP: "Takip",
  ACTIVE: "Aktif",
  AT_RISK: "Riskli",
  COMPLETED: "Tamamlandı",
  INACTIVE: "Pasif"
};

const TAG_TONE: Record<string, "mint" | "sky" | "yellow" | "blush" | "lavender" | "neutral"> = {
  GREEN: "mint",
  BLUE: "sky",
  YELLOW: "yellow",
  ORANGE: "yellow",
  RED: "blush",
  PINK: "blush",
  PURPLE: "lavender",
  GRAY: "neutral"
};

export function StudentsTable({
  data,
  tags = [],
}: {
  data: StudentRow[];
  tags?: { id: string; label: string }[];
}) {
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

  const columns = React.useMemo<ColumnDef<StudentRow>[]>(
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
            className="h-4 w-4 rounded border-od-border"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 32,
      },
      {
        accessorKey: "fullName",
        header: "Ad Soyad",
        cell: ({ row }) => (
          <Link
            href={`/v2/admin/ogrenciler/${row.original.id}`}
            className="font-medium text-od-ink hover:text-od-accent transition-colors"
          >
            {row.original.fullName}
          </Link>
        )
      },
      {
        accessorKey: "phone",
        header: "Telefon",
        cell: ({ row }) => <span className="font-mono text-od-tiny text-od-mute">{row.original.phone}</span>
      },
      {
        accessorKey: "classLevel",
        header: "Sınıf",
        cell: ({ row }) =>
          row.original.classLevel ? (
            <Badge tone="outline" size="sm">{row.original.classLevel}</Badge>
          ) : (
            <span className="text-od-mute-2">—</span>
          )
      },
      {
        accessorKey: "examType",
        header: "Sınav",
        cell: ({ row }) =>
          row.original.examType ? (
            <Badge tone="lavender" size="sm">{row.original.examType}</Badge>
          ) : (
            <span className="text-od-mute-2">—</span>
          )
      },
      {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => (
          <Badge tone={STATUS_TONE[row.original.status]} size="sm">
            {STATUS_LABEL[row.original.status]}
          </Badge>
        )
      },
      {
        id: "tags",
        header: "Etiketler",
        cell: ({ row }) => {
          const tags = row.original.tags;
          if (tags.length === 0) return <span className="text-od-mute-2 text-od-tiny">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((t) => (
                <Badge key={t.tag.id} tone={TAG_TONE[t.tag.color] ?? "neutral"} size="sm">
                  {t.tag.label}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge tone="neutral" size="sm">+{tags.length - 3}</Badge>
              )}
            </div>
          );
        }
      },
      {
        accessorKey: "_count.lessons",
        header: "Ders",
        cell: ({ row }) => (
          <span className="text-od-small font-medium text-od-ink-2">{row.original._count.lessons}</span>
        )
      },
      {
        accessorKey: "city",
        header: "Şehir",
        cell: ({ row }) => row.original.city ?? <span className="text-od-mute-2">—</span>
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/v2/admin/ogrenciler/${row.original.id}`}>Detayı aç</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Etiket ekle</DropdownMenuItem>
              <DropdownMenuItem>Inbox mesajı</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-pastel-blush-ink">Arşivle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    ],
    [selected, allSelected]
  );

  return (
    <div className="space-y-od-3">
      <StudentsBulkBar
        selectedIds={selectedIds}
        tags={tags}
        onClear={() => setSelected({})}
      />
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Ad, telefon, e-posta ara…"
        pageSize={25}
        toolbar={
          <>
            <Button variant="outline" size="sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrele
            </Button>
            <Link href="/v2/admin/ogrenciler/yeni">
              <Button variant="accent" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Yeni Öğrenci
              </Button>
            </Link>
          </>
        }
        emptyState="Henüz öğrenci kaydı yok."
      />
    </div>
  );
}
