/**
 * Ödev durumları — panel görünümü.
 *
 * DB enum'ları: AssignmentProgressStatus (TODO|IN_PROGRESS|DONE) +
 * AssignmentSubmissionStatus. UI sözlüğü Part 1 ile hizalı.
 */

import type { AssignmentProgressStatus, AssignmentSubmissionStatus } from "@prisma/client";

export type AssignmentDisplayStatus =
  | "ATANDI"
  | "GORULDU"
  | "DEVAM_EDIYOR"
  | "TAMAMLANDI"
  | "GEC"
  | "DEGERLENDIRILDI";

export const ASSIGNMENT_DISPLAY_LABELS: Record<AssignmentDisplayStatus, string> = {
  ATANDI: "Atandı",
  GORULDU: "Görüldü",
  DEVAM_EDIYOR: "Devam ediyor",
  TAMAMLANDI: "Tamamlandı",
  GEC: "Geç",
  DEGERLENDIRILDI: "Değerlendirildi",
};

export function deriveAssignmentDisplayStatus(input: {
  progress: AssignmentProgressStatus | null;
  dueAt: Date;
  now?: Date;
  submissionStatus?: AssignmentSubmissionStatus | null;
  seenAt?: Date | null;
}): AssignmentDisplayStatus {
  const now = input.now ?? new Date();
  if (input.submissionStatus === "APPROVED") return "DEGERLENDIRILDI";
  if (input.progress === "DONE") return "TAMAMLANDI";
  if (input.progress === "IN_PROGRESS") {
    return input.dueAt.getTime() < now.getTime() ? "GEC" : "DEVAM_EDIYOR";
  }
  if (input.dueAt.getTime() < now.getTime()) return "GEC";
  if (input.seenAt) return "GORULDU";
  return "ATANDI";
}

export type AssignmentGroupSummary = {
  total: number;
  submitted: number;
  waiting: number;
  late: number;
};

export function summarizeGroupAssignment(input: {
  rows: Array<{
    progress: AssignmentProgressStatus | null;
    dueAt: Date;
    submissionStatus?: AssignmentSubmissionStatus | null;
  }>;
  now?: Date;
}): AssignmentGroupSummary {
  const now = input.now ?? new Date();
  let submitted = 0;
  let waiting = 0;
  let late = 0;
  for (const row of input.rows) {
    const status = deriveAssignmentDisplayStatus({
      progress: row.progress,
      dueAt: row.dueAt,
      now,
      submissionStatus: row.submissionStatus,
    });
    if (status === "TAMAMLANDI" || status === "DEGERLENDIRILDI") submitted += 1;
    else if (status === "GEC") late += 1;
    else waiting += 1;
  }
  return { total: input.rows.length, submitted, waiting, late };
}
