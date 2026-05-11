import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/od/ui/button";
import type { LucideIcon } from "lucide-react";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  tone?: "neutral" | "mint" | "sky" | "yellow" | "blush" | "lavender";
  className?: string;
};

const toneRing = {
  neutral:  "bg-od-subtle text-od-mute",
  mint:     "bg-pastel-mint-soft text-pastel-mint-ink",
  sky:      "bg-pastel-sky-soft text-pastel-sky-ink",
  yellow:   "bg-pastel-yellow-soft text-pastel-yellow-ink",
  blush:    "bg-pastel-blush-soft text-pastel-blush-ink",
  lavender: "bg-pastel-lavender-soft text-pastel-lavender-ink"
};

export function EmptyState({ icon: Icon, title, description, action, tone = "neutral", className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-od-lg border border-dashed border-od-border bg-od-surface p-10 text-center",
        className
      )}
    >
      {Icon && (
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", toneRing[tone])}>
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-sm">
        <h3 className="text-od-h3 font-semibold text-od-ink">{title}</h3>
        {description && <p className="text-od-small text-od-mute">{description}</p>}
      </div>
      {action && (
        action.href ? (
          <a href={action.href}>
            <Button variant="accent" size="sm">{action.label}</Button>
          </a>
        ) : (
          <Button variant="accent" size="sm" onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}

export function ErrorState({ title = "Bir şeyler ters gitti", description, onRetry, className }: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-od-lg border border-od-border bg-pastel-blush-soft p-10 text-center",
        className
      )}
    >
      <h3 className="text-od-h3 font-semibold text-pastel-blush-ink">{title}</h3>
      {description && <p className="text-od-small text-pastel-blush-ink/80 max-w-md">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>Tekrar dene</Button>
      )}
    </div>
  );
}
