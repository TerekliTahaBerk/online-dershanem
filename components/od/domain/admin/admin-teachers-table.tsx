"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { SavedViewsMenu, type SavedViewItem } from "@/components/od/data/saved-views-menu";
import { PresenceProvider, LivePresenceDot } from "@/components/od/presence/live-presence";

export type AdminTeacherRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  subjects: string;
  classroomCount: number;
  lessonCount: number;
  status: string;
  userId: string | null;
  updatedAt: string;
};

export function AdminTeachersTable({
  data,
  savedViews = [],
  currentUserId,
}: {
  data: AdminTeacherRow[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const userIds = React.useMemo(
    () => data.map((r) => r.userId).filter(Boolean) as string[],
    [data],
  );

  const columns = React.useMemo<ColumnDef<AdminTeacherRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Ad Soyad",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <LivePresenceDot userId={row.original.userId} />
            <Link
              href={`/v2/admin/ogretmenler/${row.original.id}`}
              className="font-medium text-od-ink hover:underline"
            >
              {row.original.fullName}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "İletişim",
        cell: ({ row }) => (
          <div className="text-od-ink-2">
            <div>{row.original.email ?? "—"}</div>
            {row.original.phone && (
              <div className="text-od-tiny text-od-mute">{row.original.phone}</div>
            )}
          </div>
        ),
      },
      { accessorKey: "subjects", header: "Branş" },
      {
        accessorKey: "classroomCount",
        header: "Sınıflar",
        cell: ({ row }) => <span className="text-od-mute">{row.original.classroomCount}</span>,
      },
      {
        accessorKey: "lessonCount",
        header: "Dersler",
        cell: ({ row }) => <span className="text-od-mute">{row.original.lessonCount}</span>,
      },
      {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => (
          <Badge tone={row.original.status === "ACTIVE" ? "mint" : "neutral"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Güncelleme",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">
            {format(new Date(row.original.updatedAt), "dd MMM yyyy", { locale: tr })}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <PresenceProvider userIds={userIds}>
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Öğretmen ara…"
        toolbar={
          currentUserId ? (
            <SavedViewsMenu
              scope="teachers"
              views={savedViews}
              currentUserId={currentUserId}
            />
          ) : undefined
        }
      />
    </PresenceProvider>
  );
}
