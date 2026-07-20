"use client";

import { useLayoutEffect } from "react";
import type { AccessibilityViewPreference } from "@/lib/accessibility-preferences";

const attributes = ["data-panel-motion", "data-panel-contrast", "data-panel-text-scale", "data-panel-spacing"] as const;

export function applyAccessibilityViewPreference(preference: AccessibilityViewPreference) {
  const root = document.documentElement;
  root.dataset.panelMotion = preference.reducedMotion ? "reduced" : "default";
  root.dataset.panelContrast = preference.highContrast ? "high" : "default";
  root.dataset.panelTextScale = preference.textScale === "LARGE" ? "large" : "default";
  root.dataset.panelSpacing = preference.comfortableSpacing ? "comfortable" : "default";
}

export function AccessibilityPreferenceApplier({ preference }: { preference: AccessibilityViewPreference }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    applyAccessibilityViewPreference(preference);
    return () => { for (const attribute of attributes) root.removeAttribute(attribute); };
  }, [preference]);
  return null;
}
