"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Settings2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { DashboardPanelKey } from "@prisma/client";
import { Button } from "@/components/od/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";
import {
  saveDashboardLayoutAction,
  resetDashboardLayoutAction,
} from "@/lib/services/dashboard-layout/actions";
import type {
  DashboardLayoutData,
  DashboardWidgetItem,
} from "@/lib/services/dashboard-layout/types";

export type WidgetCatalogItem = { key: string; label: string };

export function WidgetManager({
  panel,
  initialItems,
  catalog,
}: {
  panel: DashboardPanelKey;
  initialItems: DashboardWidgetItem[];
  catalog: readonly WidgetCatalogItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<DashboardWidgetItem[]>(initialItems);
  const [pending, startTransition] = React.useTransition();

  // Yeniden açıldığında prop güncellemesini yansıt
  React.useEffect(() => {
    if (open) setItems(initialItems);
  }, [open, initialItems]);

  const labelOf = React.useCallback(
    (key: string) => catalog.find((c) => c.key === key)?.label ?? key,
    [catalog],
  );

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
  };

  const toggleVisible = (idx: number) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, visible: !it.visible } : it)));

  const handleSave = () => {
    startTransition(async () => {
      try {
        await saveDashboardLayoutAction({ panel, items });
        toast.success("Panel düzeni kaydedildi.");
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kaydedilemedi");
      }
    });
  };

  const handleReset = () => {
    if (!confirm("Panel düzeni varsayılana sıfırlanacak. Devam edilsin mi?")) return;
    startTransition(async () => {
      try {
        await resetDashboardLayoutAction({ panel });
        toast.success("Varsayılan düzene dönüldü.");
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Sıfırlanamadı");
      }
    });
  };

  const visibleCount = items.filter((i) => i.visible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings2 className="h-3.5 w-3.5" />
          Panel Düzeni
          <span className="ml-1 rounded-full bg-od-mute/15 px-1.5 py-0.5 text-od-tiny font-medium text-od-mute">
            {visibleCount}/{items.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="border-b border-od-border px-3 py-2">
          <div className="text-od-small font-medium text-od-ink">Panel düzeni</div>
          <div className="text-od-tiny text-od-mute">
            Widget sırasını ve görünürlüğünü ayarla. Değişiklikler sadece sana özeldir.
          </div>
        </div>
        <ul className="max-h-[360px] overflow-auto">
          {items.map((it, idx) => (
            <li
              key={it.key}
              className="flex items-center gap-1 border-b border-od-border/60 px-2 py-1.5 last:border-b-0"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded p-0.5 text-od-mute hover:bg-od-bg-2 disabled:opacity-30"
                  title="Yukarı"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, +1)}
                  disabled={idx === items.length - 1}
                  className="rounded p-0.5 text-od-mute hover:bg-od-bg-2 disabled:opacity-30"
                  title="Aşağı"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <span
                className={`flex-1 truncate text-od-small ${
                  it.visible ? "text-od-ink" : "text-od-mute-2 line-through"
                }`}
              >
                {labelOf(it.key)}
              </span>
              <button
                type="button"
                onClick={() => toggleVisible(idx)}
                className="rounded p-1 text-od-mute hover:bg-od-bg-2 hover:text-od-ink"
                title={it.visible ? "Gizle" : "Göster"}
              >
                {it.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-od-border px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={pending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sıfırla
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={pending}
          >
            <Save className="h-3.5 w-3.5" />
            Kaydet
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Verilen layout sırasına göre widget'ları render eder.
 * `widgets` map'i: key → ReactNode. Visible olmayanlar atlanır.
 */
export function DashboardWidgetSlots({
  layout,
  widgets,
}: {
  layout: DashboardLayoutData;
  widgets: Record<string, React.ReactNode>;
}) {
  return (
    <>
      {layout.items
        .filter((it) => it.visible && widgets[it.key] !== undefined)
        .map((it) => (
          <React.Fragment key={it.key}>{widgets[it.key]}</React.Fragment>
        ))}
    </>
  );
}
