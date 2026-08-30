import type { OdkStatusTone } from "@/lib/odk/presentation";
import { PanelStatusBadge } from "@/components/panel/ui";

export function OdkStatusBadge({ label, tone = "neutral", pulse = false }: { label: string; tone?: OdkStatusTone; pulse?: boolean }) {
  return <PanelStatusBadge label={label} tone={tone} pulse={pulse} />;
}
