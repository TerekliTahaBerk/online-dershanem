"use client";

import { signOut } from "next-auth/react";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={`inline-flex rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-soft ${className}`.trim()}
    >
      Çıkış Yap
    </button>
  );
}
