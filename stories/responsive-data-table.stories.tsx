import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  ResponsiveDataTable,
  ResponsiveDataTableBody,
  ResponsiveDataTableCell,
  ResponsiveDataTableHead,
  ResponsiveDataTableRow,
} from "@/components/panel/responsive-data-table";

const meta = {
  title: "Panel/Responsive Data Table",
  component: ResponsiveDataTable,
  tags: ["autodocs"],
} satisfies Meta<typeof ResponsiveDataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const orders = [
  { id: "SP-1042", buyer: "Ece Veli", total: "1.490 TL", state: "Ödendi" },
  { id: "SP-1043", buyer: "Kaan Veli", total: "990 TL", state: "İnceleme" },
];

export const Orders: Story = {
  args: {
    children: (
      <>
        <ResponsiveDataTableHead>
          <tr>
            {["Sipariş", "Alıcı", "Tutar", "Durum"].map((label) => (
              <ResponsiveDataTableCell key={label} label={label} header>
                {label}
              </ResponsiveDataTableCell>
            ))}
          </tr>
        </ResponsiveDataTableHead>
        <ResponsiveDataTableBody>
          {orders.map((order) => (
            <ResponsiveDataTableRow key={order.id}>
              <ResponsiveDataTableCell label="Sipariş">{order.id}</ResponsiveDataTableCell>
              <ResponsiveDataTableCell label="Alıcı">{order.buyer}</ResponsiveDataTableCell>
              <ResponsiveDataTableCell label="Tutar">{order.total}</ResponsiveDataTableCell>
              <ResponsiveDataTableCell label="Durum">{order.state}</ResponsiveDataTableCell>
            </ResponsiveDataTableRow>
          ))}
        </ResponsiveDataTableBody>
      </>
    ),
  },
};
