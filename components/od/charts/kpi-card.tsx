import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/od/ui/card";

export type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  delta?: { value: number; suffix?: string; label?: string };
  tone?: "neutral" | "mint" | "sky" | "yellow" | "blush" | "lavender";
  hint?: string;
  className?: string;
};

const toneStyles = {
  neutral:  { bg: "bg-od-subtle",          ink: "text-od-ink" },
  mint:     { bg: "bg-pastel-mint-soft",   ink: "text-pastel-mint-ink" },
  sky:      { bg: "bg-pastel-sky-soft",    ink: "text-pastel-sky-ink" },
  yellow:   { bg: "bg-pastel-yellow-soft", ink: "text-pastel-yellow-ink" },
  blush:    { bg: "bg-pastel-blush-soft",  ink: "text-pastel-blush-ink" },
  lavender: { bg: "bg-pastel-lavender-soft", ink: "text-pastel-lavender-ink" }
};

export function KpiCard({ label, value, icon: Icon, delta, tone = "neutral", hint, className }: KpiCardProps) {
  const t = toneStyles[tone];
  const deltaPositive = delta && delta.value > 0;
  const deltaZero = delta && delta.value === 0;
  const DeltaIcon = deltaZero ? Minus : deltaPositive ? ArrowUpRight : ArrowDownRight;
  const deltaColor = deltaZero
    ? "text-od-mute"
    : deltaPositive
      ? "text-pastel-mint-ink bg-pastel-mint-soft"
      : "text-pastel-blush-ink bg-pastel-blush-soft";

  return (
    <Card className={cn("p-5 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-od-tiny font-medium uppercase tracking-wider text-od-mute">{label}</span>
          <span className="text-od-h1 font-semibold text-od-ink truncate">{value}</span>
        </div>
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-od shrink-0", t.bg)}>
            <Icon className={cn("h-4 w-4", t.ink)} />
          </div>
        )}
      </div>
      {(delta || hint) && (
        <div className="flex items-center gap-2 text-od-tiny">
          {delta && (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium", deltaColor)}>
              <DeltaIcon className="h-3 w-3" />
              {Math.abs(delta.value)}
              {delta.suffix ?? "%"}
            </span>
          )}
          {(delta?.label || hint) && (
            <span className="text-od-mute">{delta?.label ?? hint}</span>
          )}
        </div>
      )}
    </Card>
  );
}
