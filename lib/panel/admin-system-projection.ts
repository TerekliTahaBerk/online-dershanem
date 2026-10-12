import type { CohortGain } from "@/lib/cohort-quality";
import type { AdminGain } from "@/lib/mobile-contracts/admin-system";
/** Suppression must happen before serialization, not just in the native UI. */
export function publicCohortGain(gain: CohortGain): AdminGain {
  if (gain.status !== "READY") return { exam: gain.exam, status: "INSUFFICIENT_SAMPLE" };
  return { exam: gain.exam, status: "READY", pairedStudents: gain.pairedStudents, observedStudents: gain.observedStudents, medianChange: gain.medianChange!, lowerQuartile: gain.lowerQuartile!, upperQuartile: gain.upperQuartile!, positiveChangePercent: gain.positiveChangePercent!, medianGapDays: gain.medianGapDays!, coveragePercent: gain.coveragePercent, dataThrough: gain.dataThrough?.toISOString() ?? null };
}
