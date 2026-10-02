"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--site-line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--site-ink)] transition-colors hover:bg-[var(--site-bg-warm)]"
    >
      <ArrowLeft className="h-4 w-4" />
      Geri Dön
    </button>
  );
}
