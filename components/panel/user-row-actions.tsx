"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Pause, Play, Trash2 } from "lucide-react";
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
  const [pending, setPending] = useState<"reset" | "status" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  async function deleteAccount() {
    setError(null);
    setPending("delete");
    try {
      const r = await fetch(`/api/panel/users/${userId}`, { method: "DELETE" });
      const d = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) {
        setError(d?.error ?? "Hesap silinemedi.");
        return;
      }
      setDeleteConfirmOpen(false);
      router.refresh();
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
    <>
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
          <>
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

            <button
              type="button"
              onClick={() => {
                setError(null);
                setDeleteConfirmOpen(true);
              }}
              disabled={pending !== null}
              className={`${btn} border-rose-200 text-rose-700 hover:border-rose-300 hover:text-rose-800`}
            >
              {pending === "delete" ? (
                <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Trash2 size={12} aria-hidden="true" />
              )}
              Hesabı sil
            </button>
          </>
        )}
        </div>

        {error ? (
          <p role="alert" className="text-[11.5px] text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-[280] flex items-center justify-center bg-[#10150d]/35 px-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && pending !== "delete") setDeleteConfirmOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Hesap silme onayı"
            className="w-full max-w-[460px] rounded-[14px] border border-white/60 bg-white p-5 shadow-[0_30px_90px_-30px_rgba(20,20,15,.55)]"
          >
            <h3 className="text-[15px] font-bold text-[var(--site-ink)]">Hesabı kalıcı olarak sil</h3>
            <p className="mt-2 text-[13px] leading-6 text-[var(--site-body)]">
              <span className="font-semibold">{fullName || email}</span> hesabı geri alınamaz şekilde silinecek.
              Bağlı kritik kayıtlar varsa işlem reddedilir.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={pending === "delete"}
                className="rounded-[10px] border border-[var(--site-line)] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)] disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={pending === "delete"}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-rose-600 px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {pending === "delete" ? (
                  <Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Trash2 size={13} aria-hidden="true" />
                )}
                {pending === "delete" ? "Siliniyor..." : "Hesabı sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
