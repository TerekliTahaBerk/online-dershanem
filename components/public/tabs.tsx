"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type PublicTab = { label: string; content: ReactNode };

export function PublicTabs({ items, label, className }: { items: PublicTab[]; label: string; className?: string }) {
  const [active, setActive] = useState(0);
  const id = useId();

  return (
    <div className={cn("public-tabs", className)}>
      <div className="public-tab-list" role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.label}
            id={`${id}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (active + direction + items.length) % items.length;
              setActive(next);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div key={item.label} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} tabIndex={0}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
