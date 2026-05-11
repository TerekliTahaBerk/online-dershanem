import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-9 w-full rounded-od border border-od-border-2 bg-od-surface px-3 text-od-body text-od-ink",
        "placeholder:text-od-mute-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-accent/30 focus-visible:border-od-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[88px] w-full rounded-od border border-od-border-2 bg-od-surface px-3 py-2 text-od-body text-od-ink",
        "placeholder:text-od-mute-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-accent/30 focus-visible:border-od-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-od-small font-medium text-od-ink-2", className)} {...props} />
  )
);
Label.displayName = "Label";
