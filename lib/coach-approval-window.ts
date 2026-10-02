import { istanbulWeekStart } from "./istanbul-time";
export function coachApprovalDeadline(now: Date): Date {
  return new Date(istanbulWeekStart(now).getTime() + 10 * 3_600_000);
}
