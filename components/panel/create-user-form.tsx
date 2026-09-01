"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import type { ProductCode, UserRole } from "@prisma/client";
import { productLabel } from "@/lib/auth/roles";
import { InviteLinkReveal } from "@/components/panel/temp-password-reveal";

type Created = {
  email: string;
  fullName: string | null;
  phone: string | null;
  inviteUrl: string;
  inviteMessage: string;
  inviteExpiresAt: string;
};

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: "STUDENT", label: "Öğrenci", hint: "Dersini, çalışma yönünü ve ödevlerini görür." },
  { value: "PARENT", label: "Veli", hint: "Bağlı olduğu öğrencinin gelişim özetini görür." },
  { value: "TEACHER", label: "Öğretmen", hint: "Gruplarını yönetir, ders sonrası not yazar." },
  { value: "ADMIN", label: "Yönetici", hint: "Hesap açar, grup ve ders planlar. Aynı zamanda kendi öğretmen paneline geçebilir." },
];

export function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [products, setProducts] = useState<ProductCode[]>(["OD"]);
  const [classLevel, setClassLevel] = useState("");
  const [examType, setExamType] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [subjects, setSubjects] = useState("");
  const [maxStudentCapacity, setMaxStudentCapacity] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
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
        body: JSON.stringify({
          email,
          fullName,
          phone,
          role,
          products,
          ...(role === "STUDENT"
            ? { classLevel, examType, schoolName }
            : {}),
          ...(role === "TEACHER"
            ? {
                subjects: subjects
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                maxStudentCapacity: maxStudentCapacity
                  ? Number(maxStudentCapacity)
                  : null,
                internalNotes,
              }
            : {}),
        }),
      });
      const data = (await response.json()) as {
        user?: { email: string; fullName: string | null };
        invite?: { url: string; message: string; expiresAt: string };
        error?: string;
      };

      if (!response.ok || !data.user || !data.invite) {
        setError(data.error ?? "Hesap açılamadı.");
        setPending(false);
        return;
      }

      setCreated({
        email: data.user.email,
        fullName: data.user.fullName,
        phone: phone || null,
        inviteUrl: data.invite.url,
        inviteMessage: data.invite.message,
        inviteExpiresAt: data.invite.expiresAt,
      });
      setEmail("");
      setFullName("");
      setPhone("");
      setProducts(role === "ADMIN" || role === "TEACHER" ? ["OD", "OK", "ODK"] : ["OD"]);
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
      <InviteLinkReveal
        email={created.email}
        fullName={created.fullName}
        phone={created.phone}
        inviteUrl={created.inviteUrl}
        inviteMessage={created.inviteMessage}
        inviteExpiresAt={created.inviteExpiresAt}
        onDone={() => setCreated(null)}
      />
    );
  }

  return (
    <form id="yeni-hesap" onSubmit={onSubmit} className="flex flex-col gap-4 scroll-mt-28" noValidate>
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
            onChange={(e) => { const next = e.target.value as UserRole; setRole(next); setProducts(next === "ADMIN" || next === "TEACHER" ? ["OD", "OK", "ODK"] : ["OD"]); }}
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

      {role === "STUDENT" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-class" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
              Sınıf
            </label>
            <input
              id="new-class"
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              disabled={pending}
              className={field}
              placeholder="Örn. 11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-exam" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
              Sınav türü
            </label>
            <select
              id="new-exam"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              disabled={pending}
              className={field}
            >
              <option value="">Seçin (opsiyonel)</option>
              <option value="LGS">LGS</option>
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
              <option value="TYT_AYT">TYT + AYT</option>
              <option value="OTHER">Diğer</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-school" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
              Okul
            </label>
            <input
              id="new-school"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              disabled={pending}
              className={field}
              placeholder="İsteğe bağlı"
            />
          </div>
        </div>
      ) : null}

      {role === "TEACHER" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-subjects" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
              Branşlar
            </label>
            <input
              id="new-subjects"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              disabled={pending}
              className={field}
              placeholder="Matematik, Türkçe"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-cap" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
              Maks. öğrenci kapasitesi
            </label>
            <input
              id="new-cap"
              type="number"
              min={1}
              max={200}
              value={maxStudentCapacity}
              onChange={(e) => setMaxStudentCapacity(e.target.value)}
              disabled={pending}
              className={field}
              placeholder="İsteğe bağlı"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="new-notes" className="text-[12.5px] font-semibold text-[var(--site-ink)]">
              Dahili çalışma notları
            </label>
            <textarea
              id="new-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              disabled={pending}
              className={field}
              rows={2}
              placeholder="Yalnız yönetim görür"
            />
          </div>
        </div>
      ) : null}

      <fieldset className="rounded-[14px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
        <legend className="px-1 text-[12.5px] font-semibold text-[var(--site-ink)]">Ürün erişimi</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {(["OD", "OK", "ODK"] as ProductCode[]).map((product) => <label key={product} className="inline-flex items-center gap-2 rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-xs font-bold text-[var(--site-body)]"><input type="checkbox" checked={products.includes(product)} disabled={pending || role === "ADMIN" || role === "TEACHER"} onChange={(event) => setProducts((current) => event.target.checked ? [...new Set([...current, product])] : current.filter((item) => item !== product))} />{productLabel(product)}</label>)}
        </div>
        <p className="mt-2 text-[11.5px] leading-5 text-[var(--site-muted)]">Yönetici ve öğretmenler görev gereği üç ürüne de erişir. Öğrenci ve velide en az bir ürün seçilmelidir.</p>
      </fieldset>

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
          Hesap açıldığında tek kullanımlık davet bağlantısı üretilir.
        </p>
      </div>
    </form>
  );
}
