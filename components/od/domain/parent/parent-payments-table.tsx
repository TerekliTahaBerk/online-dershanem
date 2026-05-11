"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Filter, ExternalLink } from "lucide-react";
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

export type ParentPaymentRow = {
  id: string;
  occurredAt: string;
  childId: string | null;
  childName: string;
  description: string;
  amount: number;
  kind: "INTENT" | "INCOME";
  status: string; // PENDING|COMPLETED|FAILED|CANCELLED|PAID
  paymentLink: string | null;
};

const KIND_LABEL: Record<ParentPaymentRow["kind"], string> = {
  INTENT: "Sipariş",
  INCOME: "Tahsilat",
};
const STATUS_TONE: Record<string, "mint" | "yellow" | "blush" | "neutral"> = {
  PAID: "mint",
  COMPLETED: "mint",
  PENDING: "yellow",
  FAILED: "blush",
  CANCELLED: "blush",
};

function fmtTL(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(kurus / 100);
}

export function ParentPaymentsTable({
  data,
  children,
  savedViews = [],
  currentUserId,
}: {
  data: ParentPaymentRow[];
  children: { id: string; name: string }[];
  savedViews?: SavedViewItem[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = React.useMemo(
    () => ({
      kind: sp.getAll("kind"),
      status: sp.getAll("status"),
      childId: sp.getAll("childId"),
    }),
    [sp]
  );
  const totalActive =
    current.kind.length + current.status.length + current.childId.length;

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

  const clearAll = () => apply({ kind: [], status: [], childId: [] });

  const columns = React.useMemo<ColumnDef<ParentPaymentRow>[]>(
    () => [
      {
        accessorKey: "occurredAt",
        header: "Tarih",
        cell: ({ row }) => (
          <span className="text-od-tiny text-od-mute">
            {format(new Date(row.original.occurredAt), "dd MMM yyyy", { locale: tr })}
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
        accessorKey: "description",
        header: "Açıklama",
        cell: ({ row }) => (
          <span className="text-od-ink-2">{row.original.description}</span>
        ),
      },
      {
        accessorKey: "kind",
        header: "Tür",
        cell: ({ row }) => (
          <Badge tone={row.original.kind === "INCOME" ? "mint" : "lavender"} size="sm">
            {KIND_LABEL[row.original.kind]}
          </Badge>
        ),
      },
      {
        accessorKey: "amount",
        header: "Tutar",
        cell: ({ row }) => (
          <span
            className={
              row.original.kind === "INCOME"
                ? "font-medium text-pastel-mint-ink"
                : "font-medium text-od-ink-2"
            }
          >
            {fmtTL(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => (
          <Badge tone={STATUS_TONE[row.original.status] ?? "neutral"} size="sm">
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) =>
          row.original.paymentLink && row.original.status === "PENDING" ? (
            <a
              href={row.original.paymentLink}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-od-tiny text-pastel-sky-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Öde
            </a>
          ) : null,
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Çocuk, açıklama ara…"
      pageSize={25}
      emptyState="Filtreye uyan kayıt yok."
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
              <FilterGroup
                label="Tür"
                options={[
                  { value: "INTENT", label: "Sipariş" },
                  { value: "INCOME", label: "Tahsilat" },
                ]}
                selected={current.kind}
                onToggle={(v) => toggle("kind", v)}
              />
              <FilterGroup
                label="Durum"
                options={[
                  { value: "PENDING", label: "Bekliyor" },
                  { value: "PAID", label: "Ödendi" },
                  { value: "COMPLETED", label: "Tamamlandı" },
                  { value: "FAILED", label: "Başarısız" },
                  { value: "CANCELLED", label: "İptal" },
                ]}
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
            <SavedViewsMenu scope="parent.payments" views={savedViews} currentUserId={currentUserId} />
          )}
          <ExportButton endpoint="/api/v1/export/parent/payments" />
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
