import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OfflineSyncProvider } from "@/components/panel/offline-sync-provider";
import { StudentAssignmentList } from "@/components/panel/student-assignment-list";

const base = {
  id: "assignment-1",
  title: "Problem Seti",
  description: "İlk 20 soruyu çöz.",
  dueAt: "2026-09-14T18:00:00.000Z",
  groupName: "LGS-A",
  subject: "Matematik",
  version: 1,
  evidenceRequired: false,
  criteria: [],
  submissions: [],
};

const meta = {
  title: "Panel/Student Assignment List",
  component: StudentAssignmentList,
  decorators: [
    (Story) => (
      <OfflineSyncProvider
        scope="storybook"
        available={false}
        enabled={false}
        lowDataMode={false}
      >
        <Story />
      </OfflineSyncProvider>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof StudentAssignmentList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  args: { assignments: [{ ...base, status: "TODO" }] },
};
export const EmptyData: Story = { args: { assignments: [] } };
export const Warning: Story = {
  args: {
    assignments: [
      {
        ...base,
        status: "IN_PROGRESS",
        evidenceRequired: true,
        submissions: [
          {
            id: "submission-1",
            attemptNumber: 1,
            status: "CHANGES_REQUESTED",
            textEvidence: "Çözüm dosyası",
            feedback: "İki soruyu yeniden kontrol et.",
            scores: [],
          },
        ],
      },
    ],
    evidenceEnabled: true,
  },
};
