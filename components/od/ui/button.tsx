"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-od font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-od-bg " +
  "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:  "bg-od-ink text-od-bg hover:bg-od-ink-2",
        accent:   "bg-od-accent text-white hover:bg-od-accent-hover",
        outline:  "border border-od-border-2 bg-od-surface text-od-ink hover:bg-od-subtle",
        ghost:    "text-od-ink-2 hover:bg-od-subtle",
        soft:     "bg-od-accent-soft text-od-accent-chip-ink hover:bg-od-accent-soft/80",
        danger:   "bg-pastel-blush text-pastel-blush-ink hover:bg-pastel-blush/80",
        link:     "text-od-accent underline-offset-4 hover:underline px-0"
      },
      size: {
        sm:  "h-8 px-3 text-od-small",
        md:  "h-9 px-4 text-od-body",
        lg:  "h-11 px-6 text-od-body",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
