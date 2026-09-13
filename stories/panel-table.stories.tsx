import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  PanelStatusBadge,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
} from "@/components/panel/ui";

const meta = {
  title: "Panel/Table",
  component: PanelTable,
  tags: ["autodocs"],
} satisfies Meta<typeof PanelTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { name: "Ada Öğrenci", group: "LGS-A", status: "Teslim etti", tone: "success" },
  { name: "Cem Öğrenci", group: "LGS-A", status: "Gecikti", tone: "warning" },
  { name: "Duru Öğrenci", group: "LGS-B", status: "Bekliyor", tone: "neutral" },
] as const;

export const Desktop: Story = {
  args: {
    columns: ["Öğrenci", "Grup", "Durum"],
    caption: "Ödev teslim durumu",
    children: rows.map((row) => (
      <PanelTableRow key={row.name}>
        <PanelTableCell>{row.name}</PanelTableCell>
        <PanelTableCell>{row.group}</PanelTableCell>
        <PanelTableCell tone={row.tone === "warning" ? "warn" : "default"}>
          <PanelStatusBadge label={row.status} tone={row.tone} />
        </PanelTableCell>
      </PanelTableRow>
    )),
  },
};

/** Dar ekranda satırlar kart olur; başlıklar hücre etiketine dönüşür. */
export const MobileCards: Story = {
  ...Desktop,
  globals: { viewport: { value: "mobile1" } },
};
