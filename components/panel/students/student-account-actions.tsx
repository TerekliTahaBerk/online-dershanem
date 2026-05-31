"use client";
/**
 * Phase 3 / Session 1 — Student account action buttons (client widget).
 *
 * Client component because each action triggers a server action and we need to
 * surface the returned invite URL / temporary password in the UI for the admin
 * to copy. No business logic here — all decisions in `_actions.ts`.
 */
import { useState, useTransition } from "react";
import {
  createStudentAccountAction,
  regenerateStudentInviteAction,
  revokeStudentInviteAction,
  disableStudentAccountAction,
  enableStudentAccountAction,
  forceStudentPasswordChangeAction,
} from "@/app/panel/admin/ogrenciler/_actions";
import type { UserAccountState } from "@/lib/panel/account-onboarding-shared";

type Props = {
  studentId: string;
  hasAccount: boolean;
  accountState: UserAccountState;
};

export function StudentAccountActions({ studentId, hasAccount, accountState }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const run = (label: string, fn: () => Promise<unknown>) => {
    setMessage(null);
    setSecret(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res && typeof res === "object") {
          const obj = res as { url?: string; tempPassword?: string };
          if (obj.url) {
            setSecret(obj.url);
            setMessage(`${label}: davet linki kopyalanmaya hazır.`);
            return;
          }
          if (obj.tempPassword) {
            setSecret(obj.tempPassword);
            setMessage(`${label}: geçici şifre kopyalanmaya hazır. Bir daha gösterilmeyecek!`);
            return;
          }
        }
        setMessage(`${label}: tamam.`);
      } catch (err) {
        setMessage(`Hata: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setMessage("Panoya kopyalandı.");
    } catch {
      setMessage("Kopyalama başarısız — manuel olarak seçip kopyalayın.");
    }
  };

  return (
    <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!hasAccount ? (
          <>
            <button
              type="button"
              className="od-btn od-btn-primary od-btn-sm"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.append("mode", "invite");
                run("Davet üret", () => createStudentAccountAction(studentId, fd));
              }}
            >
              Davet linki üret
            </button>
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.append("mode", "tempPassword");
                run("Geçici şifre oluştur", () => createStudentAccountAction(studentId, fd));
              }}
            >
              Geçici şifre ver
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              disabled={pending}
              onClick={() => run("Davet yenile", () => regenerateStudentInviteAction(studentId))}
            >
              Davet linki yenile
            </button>
            {accountState === "INVITE_PENDING" || accountState === "INVITE_EXPIRED" ? (
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                disabled={pending}
                onClick={() => run("Davet iptal", () => revokeStudentInviteAction(studentId))}
              >
                Daveti iptal et
              </button>
            ) : null}
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              disabled={pending}
              onClick={() => run("Şifre değişimi zorunlu", () => forceStudentPasswordChangeAction(studentId))}
            >
              Şifre değişimi zorunlu kıl
            </button>
            {accountState === "DISABLED" ? (
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                disabled={pending}
                onClick={() => run("Hesap aktifleştir", () => enableStudentAccountAction(studentId))}
              >
                Hesabı aktifleştir
              </button>
            ) : (
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                disabled={pending}
                onClick={() => run("Hesap devre dışı", () => disableStudentAccountAction(studentId))}
              >
                Hesabı devre dışı bırak
              </button>
            )}
          </>
        )}
      </div>

      {message ? (
        <div style={{ fontSize: 13, color: "var(--od-muted)" }}>{message}</div>
      ) : null}
      {secret ? (
        <div style={{ display: "grid", gap: 6 }}>
          <code
            style={{
              display: "block",
              padding: 8,
              background: "var(--od-surface-alt)",
              borderRadius: 6,
              fontSize: 12,
              wordBreak: "break-all",
            }}
          >
            {secret}
          </code>
          <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={copy}>
            Panoya kopyala
          </button>
        </div>
      ) : null}
    </div>
  );
}
