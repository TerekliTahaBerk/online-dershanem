"use client";

/**
 * ParentInviteCard — Phase 1.5 D3.
 *
 * Renders the parent's onboarding state (Aktif / Davet bekliyor / Davet
 * gönderilmemiş / Şifre belirlenmemiş / Telefon eksik) and exposes two
 * admin-only actions: generate-or-rotate the invite link, and revoke it.
 *
 * Important constraint: this UI does NOT send emails or WhatsApp. The link
 * is shown for manual copy/paste; the admin shares it through their existing
 * channel. The audit trail records `PARENT_INVITE_GENERATE` /
 * `PARENT_INVITE_REVOKE`.
 */

import { useState, useTransition } from "react";
import {
  deriveParentOnboardingState,
  getParentOnboardingLabel,
  getParentOnboardingTone,
} from "@/lib/parents";

type ParentOnboardingInput = {
  userId?: string | null;
  phone?: string | null;
  lastLoginAt?: Date | null;
  hasPassword?: boolean | null;
  parentInviteToken?: string | null;
  parentInviteTokenExpiresAt?: Date | null;
  parentInviteSentAt?: Date | null;
};

type Props = {
  parent: ParentOnboardingInput & { id: string };
  /** Pre-existing invite link if token still valid (built server-side). */
  initialInviteUrl: string | null;
  regenerateAction: () => Promise<{ ok: true; token: string; url: string; expiresAt: Date }>;
  revokeAction: () => Promise<{ ok: true }>;
};

const toneStyle = (tone: ReturnType<typeof getParentOnboardingTone>): React.CSSProperties => {
  const map: Record<typeof tone, { bg: string; fg: string }> = {
    good: { bg: "color-mix(in srgb, var(--pd-good) 14%, transparent)", fg: "var(--pd-good)" },
    warn: { bg: "color-mix(in srgb, var(--pd-warn) 16%, transparent)", fg: "var(--pd-warn)" },
    bad:  { bg: "color-mix(in srgb, var(--pd-bad)  14%, transparent)", fg: "var(--pd-bad)"  },
    neutral: { bg: "var(--pd-soft)", fg: "var(--pd-ink)" },
  };
  const c = map[tone];
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 999,
    fontSize: 12, fontWeight: 600,
    background: c.bg, color: c.fg,
  };
};

export function ParentInviteCard({ parent, initialInviteUrl, regenerateAction, revokeAction }: Props) {
  const [url, setUrl] = useState<string | null>(initialInviteUrl);
  const [expiresAt, setExpiresAt] = useState<Date | null>(parent.parentInviteTokenExpiresAt ?? null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-derive onboarding state from the local "url present?" so the badge
  // updates instantly after regenerate/revoke without a full router refresh.
  const liveState = deriveParentOnboardingState({
    ...parent,
    parentInviteToken: url ? "present" : null,
    parentInviteTokenExpiresAt: expiresAt,
  });
  const tone = getParentOnboardingTone(liveState);
  const label = getParentOnboardingLabel(liveState);

  const onRegenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await regenerateAction();
        setUrl(res.url);
        setExpiresAt(new Date(res.expiresAt));
        setCopied(false);
      } catch (e) { setError((e as Error).message); }
    });
  };

  const onRevoke = () => {
    setError(null);
    startTransition(async () => {
      try {
        await revokeAction();
        setUrl(null);
        setExpiresAt(null);
        setCopied(false);
      } catch (e) { setError((e as Error).message); }
    });
  };

  const onCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some Safari iframes block clipboard; fall back silently.
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Onboarding durumu</span>
          <span style={toneStyle(tone)}>{label}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="od-btn od-btn-primary od-btn-sm"
            onClick={onRegenerate}
            disabled={pending}
          >
            {url ? "Linki yenile" : "Davet linki oluştur"}
          </button>
          {url ? (
            <button
              type="button"
              className="od-btn od-btn-ghost od-btn-sm"
              onClick={onRevoke}
              disabled={pending}
              style={{ color: "var(--pd-bad)" }}
            >
              İptal et
            </button>
          ) : null}
        </div>
      </div>

      {url ? (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 12px", borderRadius: 8,
            background: "var(--pd-soft)", border: "1px solid var(--pd-line)",
          }}
        >
          <code style={{ flex: 1, fontSize: 12, wordBreak: "break-all", color: "var(--pd-ink)" }}>{url}</code>
          <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={onCopy}>
            {copied ? "✓ Kopyalandı" : "Kopyala"}
          </button>
        </div>
      ) : null}

      {expiresAt && url ? (
        <div className="od-muted" style={{ fontSize: 12 }}>
          Son kullanma: {new Date(expiresAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
          {" · "}Bu link sadece veli ilk şifresini belirleyene kadar geçerli.
        </div>
      ) : null}

      {!url ? (
        <div className="od-muted" style={{ fontSize: 12 }}>
          Veli henüz hesabını aktive etmediyse, bir davet linki oluşturup WhatsApp veya e-posta üzerinden iletebilirsiniz.
          E-posta/WhatsApp gönderimi bu sürümde otomatik yapılmıyor; linki kopyalayıp manuel paylaşın.
        </div>
      ) : null}

      {error ? (
        <div style={{ fontSize: 12, color: "var(--pd-bad)" }}>{error}</div>
      ) : null}
    </div>
  );
}
