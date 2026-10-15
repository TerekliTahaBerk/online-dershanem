"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ApplicationMenuItem } from "./application-menu-item";
import styles from "./applications-menu.module.css";
import { applicationProducts } from "@/lib/application-products";

export function ApplicationsMenu({ isActive }: { isActive: (href: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent | FocusEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    }
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("focusin", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("focusin", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div ref={wrapper} className="relative">
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14.5px] font-semibold ${open || applicationProducts.some(p => isActive(p.href)) ? "text-(--site-ink)" : "text-(--site-body) hover:text-(--site-ink)"}`}>
      Uygulamalar <ChevronDown size={13} aria-hidden="true" strokeWidth={2.2} className={`text-(--dc-ink-faint) transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id={id} className={`${styles.panel} absolute left-0 top-[calc(100%+10px)] z-50 w-[320px] rounded-(--dc-radius-card-sm) border border-(--dc-line) bg-white p-2 shadow-dc-sticky`}>
      <ul className="flex flex-col">
        {applicationProducts.map(product => <li key={product.href} className="my-1">
          <ApplicationMenuItem product={product} active={isActive(product.href)} onNavigate={() => setOpen(false)} />
        </li>)}
      </ul>
    </div>}
  </div>;
}
