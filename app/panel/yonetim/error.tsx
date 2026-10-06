"use client";

import { PanelErrorState } from "@/components/panel/panel-error-state";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PanelErrorState error={error} reset={reset} homeHref="/panel/yonetim" />;
}
