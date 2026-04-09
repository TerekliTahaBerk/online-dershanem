"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/giris" })}
      className="inline-flex items-center justify-center rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
    >
      Çıkış Yap
    </button>
  );
}
