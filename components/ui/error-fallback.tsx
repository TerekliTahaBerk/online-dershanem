"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export function ErrorFallback({
  error,
  reset,
  title = "Bir şeyler ters gitti",
  description = "Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50/50 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            <p className="text-sm text-stone-600">{description}</p>
            {error.digest && (
              <p className="text-xs text-stone-400 font-mono pt-1">Referans: {error.digest}</p>
            )}
            <div className="pt-3 flex gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Tekrar dene
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                Ana sayfa
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
