"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { Toaster } from "@/components/od/ui/toast";
import { TooltipProvider } from "@/components/od/ui/tooltip";

/**
 * AppProviders — single mount point for all client-side providers used by
 * the new panel system. Mount inside a route group's layout (or `app/v2/layout.tsx`).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
