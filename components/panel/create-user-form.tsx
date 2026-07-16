"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { TempPasswordReveal } from "@/components/panel/temp-password-reveal";

type Created = { email: string; fullName: string | null; tempPassword: string; phone: string | null };

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: "STUDENT", label: "Öğrenci", hint: "Dersini, çalışma yönünü ve ödevlerini görür." },
  { value: "PARENT", label: "Veli", hint: "Bağlı olduğu öğrencinin gelişim özetini görür." },
  { value: "TEACHER", label: "Öğretmen", hint: "Gruplarını yönetir, ders sonrası not yazar." },
  { value: "ADMIN", label: "Yönetici", hint: "Hesap açar, grup ve ders planlar. Her şeyi görür." },
];

export function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/panel/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, phone, role }),
      });
      const data = (await response.json()) as {
        user?: { email: string; fullName: string | null };
        tempPassword?: string;
        error?: string;
      };

      if (!response.ok || !data.tempPassword || !data.user) {
        setError(data.error ?? "Hesap açılamadı.");
        setPending(false);
        return;
      }

      setCreated({
        email: data.user.email,
        fullName: data.user.fullName,
        tempPassword: data.tempPassword,
        phone: phone || null,
      });
      setEmail("");
      setFullName("");
      setPhone("");
      setPending(false);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı. Tekrar deneyin.");
      setPending(false);
    }
  }

  const field =
    "rounded-[10px] border border-[var(--site-line)] bg-white px-3.5 py-2.5 text-[14px] text-[var(--site-ink)] outline-none transition-colors focus-visible:border-[var(--brand-olive)] focus-visible:ring-2 focus-visible:ring-[var(--brand-olive-soft)] disabled:opacity-60";

  if (created) {
    return (
      <TempPasswordReveal
        email={created.email}
        fullName={created.fullName}
        phone={created.phone}
        tempPassword={created.tempPassword}
        onDone={() => setCreated(null)}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-email" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
            E-posta <span className="text-[var(--site-muted)]">(giriş için)</span>
          </label>
          <input
            id="new-email"
            type="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className={field}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-name" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
            Ad soyad
          </label>
          <input
            id="new-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={pending}
            className={field}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-phone" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
            Telefon <span className="text-[var(--site-muted)]">(parolayı buradan ileteceksiniz)</span>
          </label>
          <input
            id="new-phone"
            type="tel"
            inputMode="tel"
            placeholder="5xx xxx xx xx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
            className={field}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-role" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
            Rol
          </label>
          <select
            id="new-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={pending}
            aria-describedby="role-hint"
            className={field}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p id="role-hint" className="text-[12px] leading-5 text-[var(--site-muted)]">
            {ROLE_OPTIONS.find((o) => o.value === role)?.hint}
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="site-btn site-btn-primary site-btn-sm disabled:opacity-70">
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Açılıyor
            </>
          ) : (
            <>
              <UserPlus size={15} aria-hidden="true" />
              Hesabı aç
            </>
          )}
        </button>
        <p className="text-[12px] text-[var(--site-muted)]">
          Geçici parola otomatik üretilir ve bir kez gösterilir.
        </p>
      </div>
    </form>
  );
}
