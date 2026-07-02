"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";

export type PasswordSetupAction = (formData: FormData) => Promise<
  { ok: true; redirectTo: string } | { ok: false; message: string }
>;

type Props = {
  /** Server action invoked on submit. Receives the raw FormData. */
  action: PasswordSetupAction;
  /** When set, renders a "current password" field at the top. Required for the
   * `/panel/sifre-degistir` flow; omitted for invite acceptance. */
  requireCurrentPassword?: boolean;
  submitLabel?: string;
  /** Optional hidden inputs — e.g. the invite token. */
  hidden?: Record<string, string>;
};

/**
 * Reusable password setup / change form. Used by:
 *  - `/davet/[token]`              → invite acceptance (no current password).
 *  - `/panel/sifre-degistir`       → forced change (requires current).
 *
 * Validation:
 *  - newPassword + confirmPassword required.
 *  - newPassword must match confirmPassword.
 *  - Length is re-checked server-side via `validateNewPassword`; we also
 *    nudge the user client-side with a min-length hint.
 */
export function PasswordSetupForm({
  action,
  requireCurrentPassword,
  submitLabel,
  hidden,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    const fd = new FormData();
    if (requireCurrentPassword) fd.set("currentPassword", currentPassword);
    fd.set("newPassword", newPassword);
    fd.set("confirmPassword", confirmPassword);
    if (hidden) for (const [k, v] of Object.entries(hidden)) fd.set(k, v);

    startTransition(async () => {
      const res = await action(fd);
      if (res.ok) {
        // Middleware reads the JWT cookie directly. Refresh the NextAuth
        // session once so the DB-backed mustChangePassword=false value is
        // encoded before navigating away from the forced-change page.
        await fetch("/api/auth/session", { cache: "no-store" });
        window.location.href = res.redirectTo;
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {requireCurrentPassword ? (
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Mevcut şifre"
            required
            className="w-full rounded-xl border border-transparent bg-[#1B1B1E] px-4 py-3.5 pr-12 text-[15px] text-white placeholder:text-[#7A7A80] outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]"
          />
          <button
            type="button"
            aria-label={showCurrent ? "Şifreyi gizle" : "Şifreyi göster"}
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute inset-y-0 right-3 inline-flex items-center text-[#7A7A80] transition hover:text-white"
          >
            {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      ) : null}

      <div className="relative">
        <input
          type={showNew ? "text" : "password"}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Yeni şifre (en az 8 karakter)"
          minLength={8}
          required
          className="w-full rounded-xl border border-transparent bg-[#1B1B1E] px-4 py-3.5 pr-12 text-[15px] text-white placeholder:text-[#7A7A80] outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]"
        />
        <button
          type="button"
          aria-label={showNew ? "Şifreyi gizle" : "Şifreyi göster"}
          onClick={() => setShowNew((v) => !v)}
          className="absolute inset-y-0 right-3 inline-flex items-center text-[#7A7A80] transition hover:text-white"
        >
          {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <input
        type={showNew ? "text" : "password"}
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Yeni şifre (tekrar)"
        minLength={8}
        required
        className="w-full rounded-xl border border-transparent bg-[#1B1B1E] px-4 py-3.5 text-[15px] text-white placeholder:text-[#7A7A80] outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]"
      />

      {error ? (
        <p className="rounded-lg bg-[#3A1F22] px-3 py-2 text-[13px] font-medium text-[#F5A8A8]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#22A06B] px-7 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(34,160,107,0.55)] transition hover:bg-[#1E8C5C] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : (submitLabel ?? "Şifreyi Belirle")}
      </button>
    </form>
  );
}
