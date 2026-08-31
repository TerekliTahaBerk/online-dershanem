"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, KeyRound, Loader2, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import type { UserStatus } from "@prisma/client";
import { InviteLinkReveal } from "@/components/panel/temp-password-reveal";

type DeletePreview = {
  canDelete: boolean;
  blockers: Array<{ code: string; label: string; count: number }>;
  suggestedAction: "DELETE" | "SUSPEND" | "ARCHIVE";
};

export function UserRowActions({
  userId,
  email,
  fullName,
  phone,
  status,
  inviteAcceptedAt,
  isSelf,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  status: UserStatus;
  inviteAcceptedAt: string | null;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"invite" | "status" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ url: string; message: string; expiresAt: string } | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [loadingDeletePreview, setLoadingDeletePreview] = useState(false);

  async function refreshInvite() {
    if (!confirm(`${email} için davet bağlantısı yenilenecek ve açık oturumlar kapanacak. Devam edilsin mi?`)) return;
    setError(null);
    setPending("invite");
    try {
      const r = await fetch(`/api/panel/users/${userId}/reset-password`, { method: "POST" });
      const d = (await r.json()) as {
        invite?: { url: string; message: string; expiresAt: string };
        error?: string;
      };
      if (!r.ok || !d.invite) {
        setError(d.error ?? "Davet yenilenemedi.");
      } else {
        setInvite(d.invite);
        router.refresh();
      }
    } catch {
      setError("Bağlantı kurulamadı.");
    }
    setPending(null);
  }

  async function setStatus(next: UserStatus) {
    if (next === "SUSPENDED" && !confirm(`${email} askıya alınacak ve anında çıkış yapacak. Devam edilsin mi?`)) return;
    if (next === "ARCHIVED" && !confirm(`${email} arşivlenecek ve panele erişimi kapanacak. Devam edilsin mi?`)) return;
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
    } finally {
      setPending(null);
    }
  }

  async function loadDeletePreview() {
    setLoadingDeletePreview(true);
    try {
      const r = await fetch(`/api/panel/users/${userId}`);
      const d = (await r.json().catch(() => null)) as DeletePreview | { error?: string } | null;
      if (!r.ok || !d || !("canDelete" in d)) {
        setError((d && "error" in d && d.error) || "Silme etkisi okunamadı.");
        setDeletePreview(null);
        return;
      }
      setDeletePreview(d);
    } catch {
      setError("Silme etkisi okunamadı.");
      setDeletePreview(null);
    } finally {
      setLoadingDeletePreview(false);
    }
  }

  if (invite) {
    return (
      <InviteLinkReveal
        email={email}
        fullName={fullName}
        phone={phone}
        inviteUrl={invite.url}
        inviteMessage={invite.message}
        inviteExpiresAt={invite.expiresAt}
        onDone={() => setInvite(null)}
      />
    );
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--site-line)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)] disabled:opacity-50";

  const inviteButtonText = inviteAcceptedAt ? "Daveti yenile" : "Daveti gönder";
  const canSuspend = currentStatus === "ACTIVE";
  const canActivate = currentStatus === "SUSPENDED";
  const canArchive = currentStatus !== "ARCHIVED";

  return (
    <>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={refreshInvite} disabled={pending !== null} className={btn}>
          {pending === "invite" ? (
            <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <KeyRound size={12} aria-hidden="true" />
          )}
          {inviteButtonText}
        </button>

        {/* Kendini askıya alma butonu hiç gösterilmez — sunucu da reddeder. */}
        {isSelf ? null : (
          <>
            {canSuspend ? (
              <button
                type="button"
                onClick={() => void setStatus("SUSPENDED")}
                disabled={pending !== null}
                className={btn}
              >
                {pending === "status" ? (
                  <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Pause size={12} aria-hidden="true" />
                )}
                Askıya al
              </button>
            ) : null}

            {canActivate ? (
              <button
                type="button"
                onClick={() => void setStatus("ACTIVE")}
                disabled={pending !== null}
                className={btn}
              >
                {pending === "status" ? (
                  <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Play size={12} aria-hidden="true" />
                )}
                Aktifleştir
              </button>
            ) : null}

            {currentStatus === "ARCHIVED" ? (
              <button
                type="button"
                onClick={() => void setStatus("ACTIVE")}
                disabled={pending !== null}
                className={btn}
              >
                {pending === "status" ? (
                  <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <RotateCcw size={12} aria-hidden="true" />
                )}
                Arşivden çıkar
              </button>
            ) : null}

            {canArchive ? (
              <button
                type="button"
                onClick={() => void setStatus("ARCHIVED")}
                disabled={pending !== null}
                className={btn}
              >
                {pending === "status" ? (
                  <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Archive size={12} aria-hidden="true" />
                )}
                Arşivle
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setError(null);
                setDeletePreview(null);
                setDeleteConfirmOpen(true);
                void loadDeletePreview();
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
            {loadingDeletePreview ? (
              <p className="mt-3 text-[12.5px] text-[var(--site-muted)]">Silme etkisi hesaplanıyor…</p>
            ) : deletePreview ? (
              deletePreview.canDelete ? (
                <p className="mt-3 text-[12.5px] font-semibold text-emerald-700">
                  Bu hesap için kalıcı silme engeli görünmüyor.
                </p>
              ) : (
                <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[12.5px] font-semibold text-amber-800">
                    Bu hesap silinemez; önce arşivleyin veya güvenli aksiyon askıya alma.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[12.5px] text-amber-900">
                    {deletePreview.blockers.map((blocker) => (
                      <li key={blocker.code}>
                        • {blocker.label}
                        {blocker.count > 0 ? ` (${blocker.count})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : null}
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
                disabled={
                  pending === "delete" || loadingDeletePreview || (deletePreview !== null && !deletePreview.canDelete)
                }
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
