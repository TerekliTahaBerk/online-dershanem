"use client";

import * as React from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/od/data/data-table";
import { Badge } from "@/components/od/ui/badge";
import { SavedViewsMenu, type SavedViewItem } from "@/components/od/data/saved-views-menu";
import { ExportButton } from "@/components/od/data/export-button";

export type AccountingRow = {
  id: string;
  occurredAt: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  related: string;
  description: string | null;
  amount: number; // kuruş
};

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export function AdminAccountingTable({
  data,
  savedViews = [],
  currentUserId,
}: {
  data: AccountingRow[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const columns = React.useMemo<ColumnDef<AccountingRow>[]>(
    () => [
      {
        accessorKey: "occurredAt",
        header: "Tarih",
        cell: ({ row }) => (
          <span className="text-od-mute">
            {format(new Date(row.original.occurredAt), "dd MMM yyyy", { locale: tr })}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Tip",
        cell: ({ row }) =>
          row.original.type === "INCOME" ? (
            <Badge tone="mint">
              <TrendingUp className="mr-1 inline h-3 w-3" /> Gelir
            </Badge>
          ) : (
            <Badge tone="blush">
              <TrendingDown className="mr-1 inline h-3 w-3" /> Gider
            </Badge>
          ),
      },
      {
        accessorKey: "category",
        header: "Kategori",
        cell: ({ row }) => <Badge tone="sky">{row.original.category}</Badge>,
      },
      {
        accessorKey: "related",
        header: "İlgili",
        cell: ({ row }) => <span className="text-od-ink-2">{row.original.related || "—"}</span>,
      },
      {
        accessorKey: "description",
        header: "Açıklama",
        cell: ({ row }) => <span className="text-od-mute">{row.original.description ?? "—"}</span>,
      },
      {
        accessorKey: "amount",
        header: () => <span className="block text-right">Tutar</span>,
        cell: ({ row }) => (
          <div
            className={`text-right font-mono font-semibold ${
              row.original.type === "INCOME"
                ? "text-pastel-mint-ink"
                : "text-pastel-blush-ink"
            }`}
          >
            {row.original.type === "INCOME" ? "+" : "−"} {fmtTL(row.original.amount)}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Açıklama / kategori ara…"
      toolbar={
        <>
          <ExportButton endpoint="/api/v1/export/accounting" forwardParams={false} />
          {currentUserId && (
            <SavedViewsMenu
              scope="accounting"
              views={savedViews}
              currentUserId={currentUserId}
            />
          )}
        </>
      }
    />
  );
}
