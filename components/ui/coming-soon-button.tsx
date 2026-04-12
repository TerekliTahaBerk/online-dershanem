"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function ComingSoonButton() {
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
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine transition-all duration-200 hover:bg-brand hover:text-paper"
      >
        Deneme Kulübüne Katıl
      </button>

      {isMounted
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  className="fixed inset-0 z-[130] flex items-center justify-center bg-anchor/45 p-4 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                >
                  <motion.div
                    className="w-full max-w-lg rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-7"
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="deneme-kulubu-title"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Çok Yakında</p>
                        <h3 id="deneme-kulubu-title" className="mt-2 text-2xl font-bold text-ink">
                          Deneme Kulübü Yakında
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="rounded-full border border-line p-2 text-muted/80 transition hover:bg-soft"
                        aria-label="Popup kapat"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      Deneme Kulübü çok yakında sizlerle. <span className="font-semibold text-ink">onlinedershanem.</span> sistemine
                      entegre olarak yayında olacak.
                    </p>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="mt-5 inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-pine"
                    >
                      Tamam
                    </button>
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
