"use client";

import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

type Step = "email" | "verify";

const inputBase =
  "w-full rounded-xl border border-transparent bg-[#1B1B1E] px-4 py-3.5 text-[15px] text-white placeholder:text-[#7A7A80] outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]";

const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-[#22A06B] px-7 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(34,160,107,0.55)] transition hover:bg-[#1E8C5C] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex items-center justify-center rounded-xl bg-[#1B1B1E] px-5 py-3 text-[14px] font-medium text-white transition hover:bg-[#26262A]";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [step, setStep] = useState<Step>("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Lütfen e-posta adresini gir.");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        type: "PASSWORD_RESET",
      }),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Kod gönderilemedi.");
      return;
    }
    setStep("verify");
  };

  const onCodeInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError(null);
    if (digit && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const onCodeKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const onCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  const onVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullCode = code.join("");

    if (fullCode.length < 6) {
      setError("6 haneli kodu eksiksiz gir.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: fullCode,
        newPassword,
      }),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Şifre sıfırlanamadı.");
      return;
    }
    setDone(true);
  };

  const resendCode = async () => {
    setError(null);
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        type: "PASSWORD_RESET",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Kod gönderilemedi.");
    } else {
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-[#22A06B]" />
        <p className="text-base font-semibold text-white">Şifren güncellendi.</p>
        <p className="text-sm text-[#9A9AA0]">Yeni şifrenle giriş yapabilirsin.</p>
        <Link href="/giris" className={`${primaryButton} mt-2`}>
          Giriş Yap
        </Link>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form onSubmit={onVerifySubmit} className="space-y-4">
        <p className="text-center text-[14px] text-[#9A9AA0]">
          <span className="text-white">{email}</span> adresine kod gönderdik.
        </p>

        <div className="flex justify-between gap-2">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                codeRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => onCodeInput(i, e.target.value)}
              onKeyDown={(e) => onCodeKeyDown(i, e)}
              onPaste={i === 0 ? onCodePaste : undefined}
              className="h-14 w-12 rounded-xl border border-transparent bg-[#1B1B1E] text-center text-xl font-bold text-white outline-none transition focus:border-[#3A3A40] focus:bg-[#202024]"
            />
          ))}
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Yeni şifre"
            required
            minLength={6}
            className={`${inputBase} pr-12`}
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

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
              setCode(["", "", "", "", "", ""]);
            }}
            className={secondaryButton}
          >
            Geri
          </button>
          <button type="submit" disabled={isSubmitting} className={primaryButton}>
            {isSubmitting ? "Güncelleniyor…" : "Şifremi Yenile"}
          </button>
        </div>

        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={resendCode}
            className="text-[13px] font-medium text-[#9A9AA0] underline-offset-4 transition hover:text-white hover:underline"
          >
            Kodu tekrar gönder
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onEmailSubmit} className="space-y-3">
      <input
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta"
        required
        className={inputBase}
      />

      {error ? (
        <p className="rounded-lg bg-[#3A1F22] px-3 py-2 text-[13px] font-medium text-[#F5A8A8]">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-4">
        <Link href="/giris" className={secondaryButton}>
          Geri
        </Link>
        <button type="submit" disabled={isSubmitting} className={primaryButton}>
          {isSubmitting ? "Gönderiliyor…" : "Kod Gönder"}
        </button>
      </div>
    </form>
  );
}
