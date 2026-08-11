"use client";

import { createContext, useContext } from "react";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";

const PanelFeatureContext = createContext<PanelFeatureFlags | null>(null);

export function PanelFeatureProvider({ flags, children }: { flags: PanelFeatureFlags; children: React.ReactNode }) {
  return <PanelFeatureContext.Provider value={flags}>{children}</PanelFeatureContext.Provider>;
}

export function usePanelFeatureFlags() {
  const flags = useContext(PanelFeatureContext);
  if (!flags) throw new Error("PanelFeatureProvider bulunamadı.");
  return flags;
}
