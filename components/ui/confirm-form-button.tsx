"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

type ConfirmFormButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  hiddenFields?: Array<{ name: string; value: string }>;
  className?: string;
  children: React.ReactNode;
};

export function ConfirmFormButton({
  action,
  title,
  description,
  confirmLabel = "Sil",
  cancelLabel = "Vazgeç",
  hiddenFields = [],
  className,
  children
}: ConfirmFormButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen]);

  return (
    <>
      <button type="button" className={className} onClick={() => setIsOpen(true)}>
        {children}
      </button>

      {isMounted
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  className="fixed inset-0 z-[130] flex items-center justify-center bg-[var(--pd-ink)]/45 p-4 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                >
                  <motion.div
                    className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-xl"
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">Dikkat</p>
                        <h3 id="confirm-dialog-title" className="mt-2 text-xl font-semibold text-[var(--pd-ink)]">
                          {title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg border border-stone-200 p-2 text-stone-500 transition hover:bg-stone-50"
                        aria-label="Kapat"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>

                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                      >
                        {cancelLabel}
                      </button>
                      <form action={action}>
                        {hiddenFields.map((field) => (
                          <input key={field.name} type="hidden" name={field.name} value={field.value} />
                        ))}
                        <button
                          type="submit"
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                          {confirmLabel}
                        </button>
                      </form>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
