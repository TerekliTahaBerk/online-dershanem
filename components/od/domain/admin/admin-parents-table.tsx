"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { SavedViewsMenu, type SavedViewItem } from "@/components/od/data/saved-views-menu";
import { PresenceProvider, LivePresenceDot } from "@/components/od/presence/live-presence";

export type AdminParentRow = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  userId: string | null;
  studentCount: number;
  studentNames: string[];
};

export function AdminParentsTable({
  data,
  savedViews = [],
  currentUserId,
}: {
  data: AdminParentRow[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const userIds = React.useMemo(
    () => data.map((r) => r.userId).filter(Boolean) as string[],
    [data],
  );

  const columns = React.useMemo<ColumnDef<AdminParentRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Ad Soyad",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <LivePresenceDot userId={row.original.userId} />
            <Link
              href={`/v2/admin/veliler/${row.original.id}`}
              className="font-medium text-od-ink hover:underline"
            >
              {row.original.fullName}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Telefon",
        cell: ({ row }) => <span className="text-od-mute">{row.original.phone ?? "—"}</span>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-od-mute">{row.original.email ?? "—"}</span>,
      },
      {
        accessorKey: "studentCount",
        header: "Öğrenci Sayısı",
        cell: ({ row }) => (
          <Badge tone={row.original.studentCount > 0 ? "mint" : "neutral"}>
            {row.original.studentCount}
          </Badge>
        ),
      },
      {
        id: "students",
        header: "Bağlı Öğrenciler",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.studentNames.slice(0, 3).map((name, i) => (
              <Badge key={i} tone="sky" size="sm">
                {name}
              </Badge>
            ))}
            {row.original.studentNames.length > 3 && (
              <Badge tone="neutral" size="sm">
                +{row.original.studentNames.length - 3}
              </Badge>
            )}
          </div>
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
        searchPlaceholder="Veli ara…"
        toolbar={
          currentUserId ? (
            <SavedViewsMenu
              scope="parents"
              views={savedViews}
              currentUserId={currentUserId}
            />
          ) : undefined
        }
      />
    </PresenceProvider>
  );
}
