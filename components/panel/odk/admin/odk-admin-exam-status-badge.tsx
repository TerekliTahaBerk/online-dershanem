import { Badge } from "@/components/panel/ui/badge";
import {
  getOdkExamStatusLabel,
  getOdkExamStatusTone,
} from "@/lib/panel/odk-admin-display";
import type { OdkExamStatus } from "@prisma/client";

/**
 * Phase 2 / Session 15 — small server component pill that maps an
 * `OdkExamStatus` value onto the existing `<Badge>` tone vocabulary.
 *
 * Intentionally trivial — exists so list/detail pages, the action bar, and
 * future surfaces stay visually identical without each repeating the mapping.
 */
export function OdkAdminExamStatusBadge({ status }: { status: OdkExamStatus }) {
  return (
    <Badge tone={getOdkExamStatusTone(status)}>{getOdkExamStatusLabel(status)}</Badge>
  );
}
