"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bookmark, BookmarkPlus, Trash2, Globe2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/od/ui/button";
import { Badge } from "@/components/od/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";
import {
  createSavedViewAction,
  deleteSavedViewAction,
} from "@/lib/services/saved-views/actions";

export type SavedViewItem = {
  id: string;
  name: string;
  scope: string;
  filter: Record<string, string | string[]>;
  isShared: boolean;
  ownerId: string;
};

export function SavedViewsMenu({
  scope,
  views,
  currentUserId,
  excludeKeys = ["page", "pageSize", "sort", "q"],
}: {
  scope: string;
  views: SavedViewItem[];
  currentUserId: string;
  /** Bu key'ler kaydedilen filtre setine alınmaz (sayfa/sort/arama) */
  excludeKeys?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [shared, setShared] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const captureCurrentFilter = React.useCallback((): Record<string, string | string[]> => {
    const out: Record<string, string | string[]> = {};
    const seen = new Set<string>();
    searchParams.forEach((_, key) => {
      if (seen.has(key) || excludeKeys.includes(key)) return;
      seen.add(key);
      const all = searchParams.getAll(key);
      out[key] = all.length > 1 ? all : all[0];
    });
    return out;
  }, [searchParams, excludeKeys]);

  const applyView = (filter: Record<string, string | string[]>) => {
    const usp = new URLSearchParams();
    // Mevcut "korunan" parametreleri taşı (örn. q)
    excludeKeys.forEach((k) => {
      const all = searchParams.getAll(k);
      all.forEach((v) => usp.append(k, v));
    });
    Object.entries(filter).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((vv) => usp.append(k, vv));
      else if (v != null && v !== "") usp.append(k, String(v));
    });
    const qs = usp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Görünüme bir isim verin.");
      return;
    }
    const filter = captureCurrentFilter();
    if (Object.keys(filter).length === 0) {
      toast.error("Kaydedilecek aktif bir filtre yok.");
      return;
    }
    startTransition(async () => {
      try {
        await createSavedViewAction({ scope, name: trimmed, filter, isShared: shared });
        toast.success(`"${trimmed}" kaydedildi.`);
        setName("");
        setShared(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kaydedilemedi");
      }
    });
  };

  const handleDelete = (id: string, viewName: string) => {
    startTransition(async () => {
      try {
        await deleteSavedViewAction({ id });
        toast.success(`"${viewName}" silindi.`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Silinemedi");
      }
    });
  };

  const myViews = views.filter((v) => v.ownerId === currentUserId);
  const sharedViews = views.filter((v) => v.ownerId !== currentUserId && v.isShared);
  const total = views.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Bookmark className="h-3.5 w-3.5" />
          Görünümler
          {total > 0 && (
            <span className="ml-1 rounded-full bg-od-mute/15 px-1.5 py-0.5 text-od-tiny font-medium text-od-mute">
              {total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="max-h-[280px] overflow-auto">
          {myViews.length === 0 && sharedViews.length === 0 && (
            <div className="px-3 py-6 text-center text-od-small text-od-mute">
              Henüz kayıtlı görünüm yok.
            </div>
          )}

          {myViews.length > 0 && (
            <div className="border-b border-od-border">
              <div className="px-3 pt-2 pb-1 text-od-tiny font-medium uppercase tracking-wide text-od-mute">
                Benim
              </div>
              {myViews.map((v) => (
                <ViewRow
                  key={v.id}
                  view={v}
                  ownedByMe
                  onApply={() => applyView(v.filter)}
                  onDelete={() => handleDelete(v.id, v.name)}
                  pending={pending}
                />
              ))}
            </div>
          )}

          {sharedViews.length > 0 && (
            <div className="border-b border-od-border">
              <div className="px-3 pt-2 pb-1 text-od-tiny font-medium uppercase tracking-wide text-od-mute">
                Paylaşılan
              </div>
              {sharedViews.map((v) => (
                <ViewRow
                  key={v.id}
                  view={v}
                  ownedByMe={false}
                  onApply={() => applyView(v.filter)}
                  onDelete={() => handleDelete(v.id, v.name)}
                  pending={pending}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 p-3">
          <div className="text-od-tiny font-medium uppercase tracking-wide text-od-mute">
            Mevcut filtreyi kaydet
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ör. Riskli AYT öğrencileri"
            maxLength={80}
            className="h-8 w-full rounded-od-1 border border-od-border bg-od-bg px-2 text-od-small placeholder:text-od-mute-2 focus:border-od-accent focus:outline-none"
          />
          <label className="flex cursor-pointer items-center gap-2 text-od-small text-od-ink-2">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-od-border"
            />
            <Globe2 className="h-3.5 w-3.5 text-od-mute" />
            Diğer kullanıcılarla paylaş
          </label>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={pending || !name.trim()}
            className="w-full"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Kaydet
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ViewRow({
  view,
  ownedByMe,
  onApply,
  onDelete,
  pending,
}: {
  view: SavedViewItem;
  ownedByMe: boolean;
  onApply: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const filterCount = Object.keys(view.filter).length;
  return (
    <div className="group flex items-center gap-1 px-2 py-1 hover:bg-od-bg-2">
      <button
        type="button"
        onClick={onApply}
        className="flex flex-1 items-center gap-2 rounded-od-1 px-1.5 py-1 text-left text-od-small text-od-ink hover:text-od-accent"
      >
        {view.isShared ? (
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-pastel-sky-ink" />
        ) : (
          <Lock className="h-3.5 w-3.5 shrink-0 text-od-mute" />
        )}
        <span className="flex-1 truncate font-medium">{view.name}</span>
        <Badge tone="neutral" size="sm">
          {filterCount}
        </Badge>
      </button>
      {ownedByMe && (
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded p-1 text-od-mute opacity-0 transition-opacity hover:bg-pastel-blush/20 hover:text-pastel-blush-ink group-hover:opacity-100"
          title="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
