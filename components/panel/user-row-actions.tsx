"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Pause, Play } from "lucide-react";
import type { UserStatus } from "@prisma/client";
import { TempPasswordReveal } from "@/components/panel/temp-password-reveal";

export function UserRowActions({
  userId,
  email,
  fullName,
  phone,
  status,
  isSelf,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  status: UserStatus;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"reset" | "status" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function resetPassword() {
    // Yıkıcı olmayan ama etkisi büyük: kullanıcının açık oturumları kapanır.
    if (!confirm(`${email} için yeni geçici parola oluşturulacak ve açık oturumları kapanacak. Devam edilsin mi?`)) return;
    setError(null);
    setPending("reset");
    try {
      const r = await fetch(`/api/panel/users/${userId}/reset-password`, { method: "POST" });
      const d = (await r.json()) as { tempPassword?: string; error?: string };
      if (!r.ok || !d.tempPassword) {
        setError(d.error ?? "Parola sıfırlanamadı.");
      } else {
        setTempPassword(d.tempPassword);
        router.refresh();
      }
    } catch {
      setError("Bağlantı kurulamadı.");
    }
    setPending(null);
  }

  async function toggleStatus() {
    const next: UserStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (next === "SUSPENDED" && !confirm(`${email} askıya alınacak ve anında çıkış yapacak. Devam edilsin mi?`)) return;
    setError(null);
    setPending("status");
    try {
      const r = await fetch(`/api/panel/users/${userId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) setError(d.error ?? "Durum değiştirilemedi.");
      else { setCurrentStatus(next); router.refresh(); }
    } catch {
      setError("Bağlantı kurulamadı.");
    }
    setPending(null);
  }

  if (tempPassword) {
    return (
      <TempPasswordReveal
        email={email}
        fullName={fullName}
        phone={phone}
        tempPassword={tempPassword}
        onDone={() => setTempPassword(null)}
      />
    );
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--site-line)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)] disabled:opacity-50";

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={resetPassword} disabled={pending !== null} className={btn}>
          {pending === "reset" ? (
            <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <KeyRound size={12} aria-hidden="true" />
          )}
          Parola ver
        </button>

        {/* Kendini askıya alma butonu hiç gösterilmez — sunucu da reddeder. */}
        {isSelf ? null : (
          <button type="button" onClick={toggleStatus} disabled={pending !== null} className={btn}>
            {pending === "status" ? (
              <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : currentStatus === "ACTIVE" ? (
              <Pause size={12} aria-hidden="true" />
            ) : (
              <Play size={12} aria-hidden="true" />
            )}
            {currentStatus === "ACTIVE" ? "Askıya al" : "Aktifleştir"}
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-[11.5px] text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
