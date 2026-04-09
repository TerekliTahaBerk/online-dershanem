"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  callbackUrl: string;
};

const errorMessage =
  "Giriş bilgileri doğrulanamadı. Veritabanında oluşturduğun admin hesabını ve şifreyi kontrol et.";

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (!result?.ok) {
      setError(errorMessage);
      setIsSubmitting(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-ink">
        Yönetici E-posta
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="mt-1.5 w-full rounded-2xl border border-line-strong px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          placeholder="yonetim@onlinedershanem.com"
          required
        />
      </label>

      <label className="block text-sm font-medium text-ink">
        Şifre
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-2xl border border-line-strong px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          placeholder="Güçlü admin şifresi"
          required
        />
      </label>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-anchor px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Giriş doğrulanıyor..." : "Yönetim Paneline Gir"}
      </button>
    </form>
  );
}
