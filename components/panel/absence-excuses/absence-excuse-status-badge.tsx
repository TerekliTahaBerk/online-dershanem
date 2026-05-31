import { Badge } from "@/components/panel/ui/badge";
import {
  getAbsenceExcuseStatusLabel,
  getAbsenceExcuseStatusTone,
} from "@/lib/panel/absence-excuses-display";
import type { AbsenceExcuseStatus } from "@prisma/client";

export function AbsenceExcuseStatusBadge({ status }: { status: AbsenceExcuseStatus }) {
  return (
    <Badge tone={getAbsenceExcuseStatusTone(status)}>
      {getAbsenceExcuseStatusLabel(status)}
    </Badge>
  );
}
