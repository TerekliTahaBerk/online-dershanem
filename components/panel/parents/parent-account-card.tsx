"use client";

/**
 * Phase 3 / Session 3 — D3: Parent account lifecycle card (client).
 *
 * Operational widget for the parent detail page. Wraps the unified
 * `User`-flow account actions (Session 1–2 helpers) bound to a parent.
 *
 * No business logic — every decision lives in `_actions.ts`.
 */

import { useState, useTransition } from "react";
import { Badge } from "@/components/panel/ui/badge";
import {
  createParentAccountAction,
  regenerateParentUserInviteAction,
  revokeParentUserInviteAction,
  disableParentAccountAction,
  enableParentAccountAction,
  forceParentPasswordChangeAction,
  resetParentTempPasswordAction,
} from "@/app/panel/admin/veliler/_actions";
import {
  getUserAccountStateLabel,
  getUserAccountStateTone,
  type UserAccountState,
} from "@/lib/panel/account-onboarding-shared";
import { useToast } from "@/components/ui/toast";

type Props = {
  parentId: string;
  email: string | null;
  hasAccount: boolean;
  accountState: UserAccountState;
  user: {
    email: string;
    lastLoginAt: Date | null;
    userInviteSentAt: Date | null;
    userInviteTokenExpiresAt: Date | null;
    mustChangePassword: boolean;
    passwordChangedAt: Date | null;
    accountDisabledAt: Date | null;
  } | null;
};

function toneToBadgeTone(t: ReturnType<typeof getUserAccountStateTone>): "ok" | "warn" | "bad" | "neutral" {
  return t === "good" ? "ok" : t;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ParentAccountCard({
  parentId,
  email,
  hasAccount,
  accountState,
  user,
}: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [secret, setSecret] = useState<{ kind: "url" | "tempPassword"; value: string } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  const run = (
    label: string,
    fn: () => Promise<unknown>,
    opts?: { clearsSecret?: boolean },
  ) => {
    if (opts?.clearsSecret ?? true) setSecret(null);
    setSecretCopied(false);
    startTransition(async () => {
      try {
        const res = (await fn()) as
          | { url?: string; tempPassword?: string; expiresAt?: Date }
          | undefined;
        if (res?.url) {
          setSecret({ kind: "url", value: res.url });
          toast.success(`${label}: davet linki hazır`);
          return;
        }
        if (res?.tempPassword) {
          setSecret({ kind: "tempPassword", value: res.tempPassword });
          toast.success(`${label}: geçici şifre hazır (yalnızca bir kez gösterilir)`);
          return;
        }
        toast.success(`${label}: tamam`);
      } catch (err) {
        toast.error(`Hata: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.value);
      setSecretCopied(true);
      toast.success("Panoya kopyalandı");
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı — manuel seçip kopyalayın");
    }
  };

  const tone = toneToBadgeTone(getUserAccountStateTone(accountState));
  const label = getUserAccountStateLabel(accountState);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Badge tone={tone}>{label}</Badge>
        {hasAccount ? (
          <span style={{ fontSize: 12, color: "var(--od-muted)" }}>
            Giriş email&apos;i: <code>{user?.email}</code>
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--od-muted)" }}>Henüz hesap yok</span>
        )}
      </div>

      {/* Status grid */}
      <div
        className="od-grid g-2"
        style={{ gap: 8, fontSize: 12, color: "var(--od-muted)" }}
      >
        <Kv k="Son giriş" v={fmtDate(user?.lastLoginAt)} />
        <Kv k="Davet gönderildi" v={fmtDate(user?.userInviteSentAt)} />
        <Kv k="Davet süresi" v={fmtDate(user?.userInviteTokenExpiresAt)} />
        <Kv k="Şifre değişimi" v={fmtDate(user?.passwordChangedAt)} />
        <Kv
          k="Şifre değiştirme zorunlu"
          v={user?.mustChangePassword ? "Evet" : "Hayır"}
        />
        <Kv k="Devre dışı tarihi" v={fmtDate(user?.accountDisabledAt)} />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!hasAccount ? (
          <>
            <button
              type="button"
              className="od-btn od-btn-primary od-btn-sm"
              disabled={pending || !email}
              title={!email ? "Email gerekli" : undefined}
              onClick={() => {
                const fd = new FormData();
                fd.append("mode", "invite");
                run("Davet üret", () => createParentAccountAction(parentId, fd));
              }}
            >
              Hesap aç + davet üret
            </button>
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              disabled={pending || !email}
              title={!email ? "Email gerekli" : undefined}
              onClick={() => {
                const fd = new FormData();
                fd.append("mode", "tempPassword");
                run("Geçici şifre", () => createParentAccountAction(parentId, fd));
              }}
            >
              Hesap aç + geçici şifre
            </button>
            {!email ? (
              <span style={{ fontSize: 12, color: "var(--pd-warn, #b45309)" }}>
                Önce velinin email&apos;ini doldurun.
              </span>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              disabled={pending}
              onClick={() =>
                run("Davet yenilendi", () => regenerateParentUserInviteAction(parentId))
              }
            >
              Davet linkini yenile
            </button>
            {accountState === "INVITE_PENDING" || accountState === "INVITE_EXPIRED" ? (
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                disabled={pending}
                onClick={() =>
                  run("Davet iptal", () => revokeParentUserInviteAction(parentId))
                }
              >
                Daveti iptal et
              </button>
            ) : null}
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              disabled={pending}
              onClick={() =>
                run("Geçici şifre", () => resetParentTempPasswordAction(parentId))
              }
            >
              Geçici şifre ver
            </button>
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              disabled={pending}
              onClick={() =>
                run("Şifre değişimi zorunlu", () =>
                  forceParentPasswordChangeAction(parentId),
                )
              }
            >
              Şifre değişimi zorunlu kıl
            </button>
            {accountState === "DISABLED" ? (
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                disabled={pending}
                onClick={() =>
                  run("Hesap aktifleştir", () => enableParentAccountAction(parentId))
                }
              >
                Hesabı aktifleştir
              </button>
            ) : (
              <button
                type="button"
                className="od-btn od-btn-ghost od-btn-sm"
                style={{ color: "var(--pd-bad)" }}
                disabled={pending}
                onClick={() =>
                  run("Hesap devre dışı", () => disableParentAccountAction(parentId))
                }
              >
                Hesabı devre dışı bırak
              </button>
            )}
          </>
        )}
      </div>

      {/* Secret reveal */}
      {secret ? (
        <div
          style={{
            padding: 12,
            border: `1px solid ${secret.kind === "tempPassword" ? "var(--pd-bad, #b91c1c)" : "var(--pd-line)"}`,
            borderRadius: 8,
            background: "var(--pd-bg-subtle, var(--pd-bg))",
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--od-muted)" }}>
            {secret.kind === "url" ? "Davet linki" : "Geçici şifre — yalnızca bir kez gösterilir"}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              wordBreak: "break-all",
            }}
          >
            <code style={{ flex: 1 }}>{secret.value}</code>
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              onClick={copy}
            >
              {secretCopied ? "✓ Kopyalandı" : "Kopyala"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>{k}</span>
      <span style={{ color: "var(--pd-ink-1, var(--od-text))", fontSize: 13 }}>{v}</span>
    </div>
  );
}
