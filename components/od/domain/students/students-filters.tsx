"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import { Badge } from "@/components/od/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/od/ui/popover";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "NEW", label: "Yeni" },
  { value: "FOLLOW_UP", label: "Takip" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "AT_RISK", label: "Riskli" },
  { value: "COMPLETED", label: "Tamamlandı" },
  { value: "INACTIVE", label: "Pasif" },
];

export type StudentsFiltersProps = {
  classLevels: string[];
  examTypes: string[];
  cities: string[];
  tags: { id: string; label: string }[];
};

type Key = "status" | "classLevel" | "examType" | "city" | "tag";

export function StudentsFilters({
  classLevels,
  examTypes,
  cities,
  tags,
}: StudentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const current = React.useMemo(
    () => ({
      status: sp.getAll("status"),
      classLevel: sp.getAll("classLevel"),
      examType: sp.getAll("examType"),
      city: sp.getAll("city"),
      tag: sp.getAll("tag"),
    }),
    [sp]
  );

  const totalActive =
    current.status.length +
    current.classLevel.length +
    current.examType.length +
    current.city.length +
    current.tag.length;

  const apply = (next: Record<Key, string[]>) => {
    const params = new URLSearchParams(sp.toString());
    (Object.keys(next) as Key[]).forEach((k) => {
      params.delete(k);
      next[k].forEach((v) => params.append(k, v));
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggle = (key: Key, value: string) => {
    const exists = current[key].includes(value);
    const nextValues = exists
      ? current[key].filter((v) => v !== value)
      : [...current[key], value];
    apply({ ...current, [key]: nextValues });
  };

  const clearKey = (key: Key) => apply({ ...current, [key]: [] });
  const clearAll = () =>
    apply({ status: [], classLevel: [], examType: [], city: [], tag: [] });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5" />
            Filtrele
            {totalActive > 0 && (
              <Badge tone="lavender" size="sm" className="ml-1">
                {totalActive}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] p-0">
          <div className="max-h-[70vh] overflow-y-auto p-3 space-y-4">
            <FilterGroup
              label="Durum"
              options={STATUS_OPTIONS}
              selected={current.status}
              onToggle={(v) => toggle("status", v)}
              onClear={() => clearKey("status")}
            />
            <FilterGroup
              label="Sınıf"
              options={classLevels.map((v) => ({ value: v, label: v }))}
              selected={current.classLevel}
              onToggle={(v) => toggle("classLevel", v)}
              onClear={() => clearKey("classLevel")}
            />
            <FilterGroup
              label="Sınav"
              options={examTypes.map((v) => ({ value: v, label: v }))}
              selected={current.examType}
              onToggle={(v) => toggle("examType", v)}
              onClear={() => clearKey("examType")}
            />
            <FilterGroup
              label="Şehir"
              options={cities.map((v) => ({ value: v, label: v }))}
              selected={current.city}
              onToggle={(v) => toggle("city", v)}
              onClear={() => clearKey("city")}
            />
            <FilterGroup
              label="Etiket"
              options={tags.map((t) => ({ value: t.id, label: t.label }))}
              selected={current.tag}
              onToggle={(v) => toggle("tag", v)}
              onClear={() => clearKey("tag")}
            />
          </div>
          <div className="flex items-center justify-between border-t border-od-border bg-od-subtle/40 px-3 py-2">
            <span className="text-od-tiny text-od-mute">
              {totalActive} filtre aktif
            </span>
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

      {/* Active filter chips */}
      {totalActive > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {renderChips("Durum", current.status, STATUS_OPTIONS, (v) =>
            toggle("status", v)
          )}
          {renderChips(
            "Sınıf",
            current.classLevel,
            classLevels.map((v) => ({ value: v, label: v })),
            (v) => toggle("classLevel", v)
          )}
          {renderChips(
            "Sınav",
            current.examType,
            examTypes.map((v) => ({ value: v, label: v })),
            (v) => toggle("examType", v)
          )}
          {renderChips(
            "Şehir",
            current.city,
            cities.map((v) => ({ value: v, label: v })),
            (v) => toggle("city", v)
          )}
          {renderChips(
            "Etiket",
            current.tag,
            tags.map((t) => ({ value: t.id, label: t.label })),
            (v) => toggle("tag", v)
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-od-tiny text-od-mute hover:text-od-ink underline-offset-2 hover:underline"
          >
            tümünü temizle
          </button>
        </div>
      )}
    </div>
  );
}

function renderChips(
  groupLabel: string,
  selected: string[],
  options: { value: string; label: string }[],
  onRemove: (v: string) => void
) {
  if (selected.length === 0) return null;
  return selected.map((v) => {
    const opt = options.find((o) => o.value === v);
    return (
      <span
        key={`${groupLabel}-${v}`}
        className="inline-flex items-center gap-1 rounded-od-sm border border-od-border bg-od-subtle/60 px-2 py-0.5 text-od-tiny text-od-ink-2"
      >
        <span className="text-od-mute">{groupLabel}:</span>
        {opt?.label ?? v}
        <button
          type="button"
          onClick={() => onRemove(v)}
          className="text-od-mute hover:text-od-ink"
          aria-label={`${opt?.label ?? v} filtresini kaldır`}
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  });
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-od-tiny font-semibold uppercase tracking-wide text-od-mute">
          {label}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-od-tiny text-od-mute hover:text-od-ink"
          >
            sıfırla
          </button>
        )}
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
                  : "border-od-border bg-od-surface text-od-ink-2 hover:border-od-ink/30 hover:bg-od-subtle/40",
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
