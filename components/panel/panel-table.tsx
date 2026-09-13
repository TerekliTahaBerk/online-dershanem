"use client";

import { Children, createContext, useContext, type ReactNode } from "react";

type PanelTableContextValue = {
  columns: readonly string[];
  caption?: string;
};

const PanelTableContext = createContext<PanelTableContextValue | null>(null);
/**
 * Hücrenin satır içindeki sütun sırası. Sıra bir zamanlar render sırasında
 * mutasyonla (`ref.current++`) sayılıyordu; StrictMode/eşzamanlı render
 * bileşeni iki kez çağırdığında sayaç kayıyor ve mobil kart görünümündeki
 * `data-label` etiketleri yanlış sütuna kayıyordu. Sıra artık render'dan
 * bağımsız: `Children.map` konumundan geliyor.
 */
const PanelTableCellIndexContext = createContext<number | null>(null);

function usePanelTable() {
  const ctx = useContext(PanelTableContext);
  if (!ctx)
    throw new Error(
      "PanelTable bileşenleri PanelTable içinde kullanılmalıdır.",
    );
  return ctx;
}

/**
 * Izgara tablo — mobilde kart görünümüne döner.
 *
 * Masaüstünde klasik tablo; dar ekranda her satır kart olur ve sütun
 * başlıkları hücre etiketi olarak gösterilir. Mevcut PanelTableRow /
 * PanelTableCell kullanımını değiştirmeye gerek yoktur.
 */
export function PanelTable({
  columns,
  children,
  caption,
}: {
  columns: readonly string[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <PanelTableContext.Provider value={{ columns, caption }}>
      <div className="panel-table-shell mt-5">
        <p
          className="panel-table-scroll-hint mb-2 text-[11.5px] font-semibold text-dc-ink-faint lg:hidden"
          aria-hidden="true"
        >
          Detaylar aşağıda kart olarak listelenir.
        </p>
        <div className="overflow-x-auto rounded-[14px] border border-dc-line bg-white lg:overflow-visible">
          <table className="panel-table-responsive w-full border-collapse text-left lg:min-w-[720px]">
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead className="max-lg:sr-only">
              <tr className="border-b border-dc-line bg-dc-panel-head">
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 text-[12.5px] font-bold text-dc-ink-muted first:pl-[18px]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
    </PanelTableContext.Provider>
  );
}

export function PanelTableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="panel-table-row border-b border-dc-line-soft text-[13.5px] font-medium text-[var(--pd-ink-3)] last:border-0">
      {Children.map(children, (child, index) => (
        <PanelTableCellIndexContext.Provider value={index}>
          {child}
        </PanelTableCellIndexContext.Provider>
      ))}
    </tr>
  );
}

export function PanelTableCell({
  children,
  tone,
  label,
}: {
  children: ReactNode;
  tone?: "default" | "ok" | "warn";
  /** Mobil kart görünümünde sütun etiketi; verilmezse tablo başlığı kullanılır. */
  label?: string;
}) {
  const { columns } = usePanelTable();
  const index = useContext(PanelTableCellIndexContext);
  if (index === null) {
    throw new Error(
      "PanelTableCell yalnızca PanelTableRow içinde kullanılmalıdır.",
    );
  }
  const columnLabel = label ?? columns[index] ?? "";
  const color =
    tone === "ok"
      ? "text-dc-brand-hover"
      : tone === "warn"
        ? "text-[var(--pd-pastel-yellow-ink)]"
        : "";

  return (
    <td
      data-label={columnLabel}
      className={`panel-table-cell px-4 py-3.5 first:pl-[18px] ${color}`}
    >
      {children}
    </td>
  );
}
