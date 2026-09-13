import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PreferenceFields } from "@/components/panel/student-adaptive-plan/PreferenceFields";
import { TaskCard } from "@/components/panel/student-adaptive-plan/TaskCard";
import type {
  Preference,
  Task,
} from "@/components/panel/student-adaptive-plan/types";

const task: Task = {
  id: "task-1",
  title: "20 problem çöz",
  scheduledFor: "2026-09-13",
  durationMinutes: 30,
  taskKind: "QUESTION_PRACTICE",
  sourceType: "ASSIGNMENT",
  reasonCode: "DUE_SOON",
  status: "PLANNED",
  targetType: "QUESTIONS",
  targetValue: 20,
  subject: "Matematik",
};

function AdaptivePlanParts({
  mode,
}: {
  mode: "default" | "empty" | "warning";
}) {
  const [preference, setPreference] = useState<Preference>({
    availableDays: mode === "empty" ? [] : [1, 3, 5],
    minutesPerDay: 45,
    nextExamAt: null,
    examLabel: null,
    planningEnabled: true,
    overwhelmPulse: mode === "warning" ? 5 : null,
  });
  return (
    <div className="max-w-[720px] space-y-5">
      <section className="panel-surface p-5">
        <PreferenceFields
          preference={preference}
          setPreference={setPreference}
        />
      </section>
      {mode === "empty" ? (
        <p className="panel-surface p-5 text-sm">Henüz plan görevi yok.</p>
      ) : (
        <TaskCard
          task={task}
          canComplete
          highlighted={mode === "warning"}
          busy={false}
          draft={null}
          onStart={() => undefined}
          onOpenComplete={() => undefined}
          onDraftChange={() => undefined}
          onSubmitComplete={() => undefined}
          onCancelComplete={() => undefined}
        />
      )}
    </div>
  );
}

const meta = {
  title: "Panel/Adaptive Plan/Parts",
  component: AdaptivePlanParts,
  tags: ["autodocs"],
} satisfies Meta<typeof AdaptivePlanParts>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { mode: "default" } };
export const EmptyData: Story = { args: { mode: "empty" } };
export const Warning: Story = { args: { mode: "warning" } };
