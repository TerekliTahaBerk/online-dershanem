import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AcademicPanel } from "@/components/panel/student-360/AcademicPanel";
import { AssignmentsPanel } from "@/components/panel/student-360/AssignmentsPanel";
import { CoachingPanel } from "@/components/panel/student-360/CoachingPanel";
import { LessonsPanel } from "@/components/panel/student-360/LessonsPanel";
import { OverviewPanel } from "@/components/panel/student-360/OverviewPanel";
import { RiskPanel } from "@/components/panel/student-360/RiskPanel";

const NOW = new Date("2026-09-13T09:00:00.000Z");

function Student360Panels({ mode }: { mode: "default" | "empty" | "warning" }) {
  const empty = mode === "empty";
  const warning = mode === "warning";
  return (
    <div className="max-w-[1000px] space-y-5">
      <OverviewPanel
        data={{
          weekAttendancePresent: empty ? 0 : 3,
          weekAttendanceTotal: empty ? 0 : 4,
          completedAssignments: empty ? 0 : 2,
          assignmentTotal: empty ? 0 : 3,
          planCompletionPercent: empty ? null : 67,
          recentExams: empty
            ? []
            : [
                {
                  id: "exam-1",
                  title: "TYT Prova",
                  takenAt: NOW,
                  totalNet: 61.25,
                },
              ],
          activeRiskReasons: warning ? ["İki çalışma gecikti."] : [],
          upcomingLessons: empty
            ? []
            : [{ id: "lesson-1", title: "Matematik", startsAt: NOW }],
          openInterventions: warning
            ? [
                {
                  id: "case-1",
                  reason: "Plan desteği gerekiyor.",
                  status: "OPEN",
                  dueAt: NOW,
                },
              ]
            : [],
          openHelpRequests: warning ? 1 : 0,
          nearestOdkExamTitle: empty ? null : "TYT Prova",
        }}
      />
      <AcademicPanel
        data={{
          subjectPerformance: empty
            ? []
            : [{ subject: "Matematik", avgNet: 18.5, sampleSize: 3 }],
          outcomeHints: warning
            ? [
                {
                  title: "Problemler",
                  subject: "Matematik",
                  type: "NEEDS_REVIEW",
                },
              ]
            : [],
          assignmentHistory: [],
          reviewDueCount: warning ? 2 : 0,
          evidenceCount: warning ? 1 : 0,
          unifiedOutcomes: [],
        }}
      />
      <LessonsPanel
        data={{
          upcoming: empty
            ? []
            : [
                {
                  id: "lesson-1",
                  title: "Matematik",
                  startsAt: NOW,
                  groupName: "LGS-A",
                },
              ],
          past: [],
          recoveryOpenCount: warning ? 1 : 0,
        }}
      />
      <AssignmentsPanel
        data={{
          items: empty
            ? []
            : [
                {
                  id: "assignment-1",
                  title: "Problemler",
                  status: warning ? "TODO" : "DONE",
                  dueAt: NOW,
                  groupName: "LGS-A",
                },
              ],
        }}
      />
      <CoachingPanel
        data={{
          coachName: empty ? null : "Ayşe Öğretmen",
          cadenceDays: 7,
          overdue: warning,
          sharedNote: null,
          focus: null,
          goals: [],
          checkIns: [],
          plan: null,
          feedbackCategory: null,
          timeline: [],
        }}
      />
      <RiskPanel
        data={{
          summary: {
            level: warning ? "high" : "none",
            totalPoints: warning ? 6 : 0,
            whyRisky: warning ? ["İki çalışma gecikti."] : [],
            items: [],
          },
          cases: [],
        }}
      />
    </div>
  );
}

const meta = {
  title: "Panel/Student 360/Panels",
  component: Student360Panels,
  tags: ["autodocs"],
} satisfies Meta<typeof Student360Panels>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { mode: "default" } };
export const EmptyData: Story = { args: { mode: "empty" } };
export const Warning: Story = { args: { mode: "warning" } };
