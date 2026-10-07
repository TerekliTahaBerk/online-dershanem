"use client";

import { PanelErrorState } from "@/components/panel/panel-error-state";

/** Tüm panel bölümleri için hata sınırı (yönetimin kendi sınırı ayrıca vardır). */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PanelErrorState error={error} reset={reset} />;
}
