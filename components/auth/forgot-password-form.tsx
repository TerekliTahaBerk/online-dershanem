"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

type Step = "email" | "verify";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setError("Lütfen e-posta adresinizi girin.");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), type: "PASSWORD_RESET" }),
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
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const onCodeKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const onCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  const onVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullCode = code.join("");

    if (fullCode.length < 6) {
      setError("Lütfen 6 haneli kodu eksiksiz girin.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
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
      body: JSON.stringify({ email: email.trim().toLowerCase(), type: "PASSWORD_RESET" }),
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
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="text-base font-semibold text-stone-900">Şifreniz güncellendi!</p>
        <p className="text-sm text-stone-500">Yeni şifrenizle giriş yapabilirsiniz.</p>
        <Link
          href="/giris"
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div>
        <div className="mb-7">
          <h2 className="text-xl font-semibold text-stone-900">Kodu Girin</h2>
          <p className="mt-1.5 text-sm text-stone-500">
            <strong>{email}</strong> adresine 6 haneli bir kod gönderdik. Kodu girin ve yeni şifrenizi belirleyin.
          </p>
        </div>

        <form onSubmit={onVerifySubmit} className="space-y-5">
          <div>
            <p className="mb-3 text-sm font-medium text-stone-700">Doğrulama Kodu</p>
            <div className="flex gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => onCodeInput(i, e.target.value)}
                  onKeyDown={(e) => onCodeKeyDown(i, e)}
                  onPaste={i === 0 ? onCodePaste : undefined}
                  className="h-12 w-full rounded-lg border border-stone-200 bg-stone-50 text-center text-lg font-bold text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              ))}
            </div>
          </div>

          <label className="block text-sm font-medium text-stone-700">
            Yeni Şifre
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              placeholder="En az 6 karakter"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Yeni Şifre Tekrar
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              placeholder="Şifrenizi tekrar girin"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Şifre güncelleniyor..." : "Şifremi Güncelle"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm text-stone-500">
          <button
            type="button"
            onClick={() => { setStep("email"); setError(null); setCode(["", "", "", "", "", ""]); }}
            className="hover:text-stone-700 underline"
          >
            Geri dön
          </button>
          <button
            type="button"
            onClick={resendCode}
            className="hover:text-stone-700 underline"
          >
            Kodu tekrar gönder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-stone-900">Şifremi Unuttum</h2>
        <p className="mt-1.5 text-sm text-stone-500">
          Hesabınızla ilişkili e-posta adresini girin. Sıfırlama kodunu göndereceğiz.
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={onEmailSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-stone-700">
          E-posta
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            placeholder="ornek@email.com"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Kod gönderiliyor..." : "Kod Gönder"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Şifrenizi hatırladınız mı?{" "}
        <Link href="/giris" className="font-semibold text-emerald-700 hover:text-emerald-800">
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}
