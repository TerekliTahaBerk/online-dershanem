"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

/**
 * Theme provider — sitedeki light-default + dark variant'ı destekler.
 * `data-theme="light|dark"` attribute'unu html'e yazar (sitedeki mevcut
 * design system bu attribute'a bakıyor — globals.css :root[data-theme="dark"]).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
