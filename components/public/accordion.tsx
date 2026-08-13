import { Plus } from "lucide-react";
import type { ReactNode } from "react";

export function PublicAccordion({ items }: { items: Array<{ title: string; content: ReactNode }> }) {
  return (
    <div className="public-accordion">
      {items.map((item) => (
        <details key={item.title} className="group">
          <summary>{item.title}<Plus aria-hidden="true" size={20} /></summary>
          <div className="public-accordion-content">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
