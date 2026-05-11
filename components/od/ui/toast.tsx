"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="system"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "rounded-od-lg border border-od-border bg-od-surface text-od-ink shadow-od-lg",
          description: "text-od-mute",
          actionButton: "bg-od-accent text-white",
          cancelButton: "bg-od-subtle text-od-ink-2"
        }
      }}
    />
  );
}

export { toast } from "sonner";
