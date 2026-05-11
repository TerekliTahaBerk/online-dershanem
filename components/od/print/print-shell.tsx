"use client";

import * as React from "react";
import { Printer } from "lucide-react";

export type PrintShellProps = {
  title: string;
  subtitle?: string;
  meta?: string[];
  children: React.ReactNode;
};

/**
 * Print-friendly minimalist layout. Auto-triggers window.print() on mount.
 * Includes a "Yazdır" button for re-printing and a "Kapat" link.
 *
 * Use a `print:` Tailwind variant to keep only the printable content visible.
 */
export function PrintShell({ title, subtitle, meta, children }: PrintShellProps) {
  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="text-sm text-gray-600">
          Önizleme · yazdırmak için tarayıcının yazdır iletişim kutusunu kullan
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Yazdır
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[1100px] px-6 py-8 print:px-0 print:py-0">
        <header className="mb-4 border-b-2 border-black pb-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-700">{subtitle}</p>
          )}
          {meta && meta.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-600">
              {meta.map((m, i) => (
                <li key={i}>· {m}</li>
              ))}
            </ul>
          )}
        </header>
        {children}
        <footer className="mt-6 border-t border-gray-300 pt-2 text-center text-[10px] text-gray-500">
          OnlineDershanem · {new Date().toLocaleDateString("tr-TR")}
        </footer>
      </main>
    </div>
  );
}
