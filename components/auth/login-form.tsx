"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type LoginFormProps = {
  callbackUrl?: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      callbackUrl,
    });

    if (!result || result.error) {
      setError("E-posta veya şifre hatalı.");
      setIsSubmitting(false);
      return;
    }

    // Oturumdan rolü çekip ilgili panele yönlendir.
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role as
        | "ADMIN"
        | "TEACHER"
        | "STUDENT"
        | "PARENT"
        | undefined;
      const mustChange = !!session?.user?.mustChangePassword;
      const segment =
        role === "ADMIN" ? "admin" :
        role === "TEACHER" ? "ogretmen" :
        role === "PARENT" ? "veli" : "ogrenci";
      const destination = mustChange
        ? "/panel/sifre-degistir"
        : (callbackUrl ?? `/panel/${segment}`);
      window.location.href = destination;
    } catch {
      window.location.href = callbackUrl ?? "/panel/ogrenci";
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta"
        required
        className="w-full rounded-xl border border-transparent bg-[#1B1B1E] px-4 py-3.5 text-[15px] text-white placeholder:text-[#7A7A80] outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]"
      />

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
          required
          className="w-full rounded-xl border border-transparent bg-[#1B1B1E] px-4 py-3.5 pr-12 text-[15px] text-white placeholder:text-[#7A7A80] outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]"
        />
        <button
          type="button"
          aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute inset-y-0 right-3 inline-flex items-center text-[#7A7A80] transition hover:text-white"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-[#3A1F22] px-3 py-2 text-[13px] font-medium text-[#F5A8A8]">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-[#1B1B1E] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#26262A]"
        >
          Ana sayfa
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl bg-[#22A06B] px-7 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(34,160,107,0.55)] transition hover:bg-[#1E8C5C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </div>

      <div className="pt-6 text-center">
        <Link
          href="/sifremi-unuttum"
          className="text-[14px] font-medium text-white transition hover:text-[#9A9AA0]"
        >
          Şifremi unuttum
        </Link>
      </div>
    </form>
  );
}
