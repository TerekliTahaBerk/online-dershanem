"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tag, Filter, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Badge } from "@/components/od/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/od/ui/dropdown-menu";
import {
  bulkUpdateStudentStatusAction,
  bulkToggleStudentTagAction,
  bulkDeleteStudentsAction,
} from "@/lib/services/students/bulk-actions";

const STATUSES = [
  { v: "NEW", l: "Yeni" },
  { v: "FOLLOW_UP", l: "Takip" },
  { v: "ACTIVE", l: "Aktif" },
  { v: "AT_RISK", l: "Riskli" },
  { v: "COMPLETED", l: "Tamamlandı" },
  { v: "INACTIVE", l: "Pasif" },
] as const;

export function StudentsBulkBar({
  selectedIds,
  tags,
  onClear,
}: {
  selectedIds: string[];
  tags: { id: string; label: string }[];
  onClear: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (selectedIds.length === 0) return null;

  function applyStatus(status: string) {
    startTransition(async () => {
      const r = await bulkUpdateStudentStatusAction({
        studentIds: selectedIds,
        status: status as any,
      });
      if (r.ok) {
        toast.success(`${(r.data as any).count} öğrenci güncellendi`);
        onClear();
        router.refresh();
      } else {
        toast.error((r.error as any).message ?? "Hata");
      }
    });
  }

  function toggleTag(tagId: string, mode: "add" | "remove") {
    startTransition(async () => {
      const r = await bulkToggleStudentTagAction({
        studentIds: selectedIds,
        tagId,
        mode,
      });
      if (r.ok) {
        toast.success(`${(r.data as any).count} ilişki ${mode === "add" ? "eklendi" : "silindi"}`);
        onClear();
        router.refresh();
      } else {
        toast.error((r.error as any).message ?? "Hata");
      }
    });
  }

  function bulkDelete() {
    if (!confirm(`${selectedIds.length} öğrenci silinecek. Emin misiniz?`)) return;
    startTransition(async () => {
      const r = await bulkDeleteStudentsAction({ studentIds: selectedIds });
      if (r.ok) {
        toast.success(`${(r.data as any).count} öğrenci silindi`);
        onClear();
        router.refresh();
      } else {
        toast.error((r.error as any).message ?? "Hata");
      }
    });
  }

  return (
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
            <DropdownMenuItem key={s.v} onClick={() => applyStatus(s.v)}>
              {s.l}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending || tags.length === 0}>
            <Tag className="mr-1 h-3.5 w-3.5" /> Etiket <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Etiket Ekle</DropdownMenuLabel>
          {tags.map((t) => (
            <DropdownMenuItem key={`add-${t.id}`} onClick={() => toggleTag(t.id, "add")}>
              + {t.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Etiket Kaldır</DropdownMenuLabel>
          {tags.map((t) => (
            <DropdownMenuItem key={`rm-${t.id}`} onClick={() => toggleTag(t.id, "remove")}>
              − {t.label}
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

      <Button variant="ghost" size="sm" onClick={onClear} disabled={pending}>
        Temizle
      </Button>
    </div>
  );
}
