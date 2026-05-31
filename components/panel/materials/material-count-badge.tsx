/**
 * Phase 2 / Session 9 — `MaterialCountBadge`
 *
 * Tiny pill that shows how many materials are attached to a homework or
 * lesson. Renders nothing when `count <= 0` so it can be dropped into
 * any existing card without conditional wrappers.
 */
import { Badge } from "@/components/panel/ui/badge";

export function MaterialCountBadge({ count, label }: { count: number; label?: string }) {
  if (!count || count <= 0) return null;
  return (
    <span title={label ? `${count} ${label}` : `${count} materyal`}>
      <Badge tone="accent">📎 {count}</Badge>
    </span>
  );
}
