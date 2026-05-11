import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-od-tiny font-medium transition-colors",
  {
    variants: {
      tone: {
        neutral:  "bg-od-subtle text-od-ink-2 border-od-border",
        accent:   "bg-od-accent-soft text-od-accent-chip-ink border-transparent",
        sky:      "bg-pastel-sky text-pastel-sky-ink border-transparent",
        yellow:   "bg-pastel-yellow text-pastel-yellow-ink border-transparent",
        mint:     "bg-pastel-mint text-pastel-mint-ink border-transparent",
        blush:    "bg-pastel-blush text-pastel-blush-ink border-transparent",
        lavender: "bg-pastel-lavender text-pastel-lavender-ink border-transparent",
        outline:  "bg-transparent text-od-ink-2 border-od-border-2"
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-0.5 text-od-tiny",
        lg: "px-3 py-1 text-od-small"
      }
    },
    defaultVariants: { tone: "neutral", size: "md" }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
