"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { getPanelDestination } from "@/lib/panel-access";

type LoginFormProps = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl
    });

    if (!result || result.error) {
      setError("E-posta adresi veya şifre eşleşmedi.");
      setIsSubmitting(false);
      return;
    }

    // Fetch session to determine role-based redirect
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    window.location.href = getPanelDestination(session?.user, callbackUrl ?? result.url);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-[#3f342d]">
          E-posta
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#ddd3c4] bg-[#f0e9dd] px-4 py-3 text-sm text-[#201a17] outline-none transition focus:border-[#b96641] focus:bg-[#f5efe5] focus:ring-2 focus:ring-[#ead7c8]"
            placeholder="ornek@email.com"
            required
          />
        </label>

        <label className="block text-sm font-medium text-[#3f342d]">
          Şifre
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#ddd3c4] bg-[#f0e9dd] px-4 py-3 text-sm text-[#201a17] outline-none transition focus:border-[#b96641] focus:bg-[#f5efe5] focus:ring-2 focus:ring-[#ead7c8]"
            placeholder="••••••••"
            required
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#201a17] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#312823] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Bilgiler kontrol ediliyor..." : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
}
