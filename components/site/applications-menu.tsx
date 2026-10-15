"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
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
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
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
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14.5px] font-semibold ${applicationProducts.some(p => isActive(p.href)) ? "text-(--site-ink)" : "text-(--site-body)"}`}>
      Uygulamalar <ChevronDown size={13} aria-hidden="true" className={open ? "rotate-180" : ""} />
    </button>
    {open && <div id={id} className="absolute left-0 top-[calc(100%+10px)] z-50 w-[330px] rounded-2xl border border-(--site-line) bg-white p-2 shadow-xl">
      {applicationProducts.map(p => <Link key={p.href} href={p.href} onClick={() => setOpen(false)} aria-current={isActive(p.href) ? "page" : undefined} className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 hover:bg-[#f3f7f2] focus-visible:bg-[#f3f7f2]">
        <span><span className="block text-sm font-bold text-(--site-ink)">{p.name} {p.status === "Yakında" && <span className="ml-1 text-[10px] font-medium text-(--site-muted)">Yakında</span>}</span><span className="mt-1 block text-xs text-(--site-muted)">{p.summary}</span></span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>)}
    </div>}
  </div>;
}
