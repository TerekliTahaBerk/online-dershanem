"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="site-btn site-btn-secondary site-btn-lg"
    >
      <ArrowLeft size={17} aria-hidden="true" />
      Geri dön
    </button>
  );
}
