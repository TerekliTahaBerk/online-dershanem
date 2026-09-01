"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { MfaCodeInput, TotpEnrollmentSetup } from "@/components/panel/totp-enrollment-setup";

type Purpose = "AUTHENTICATE" | "STEP_UP";

async function json(response: Response) {
  return response.json() as Promise<{
    error?: string;
    redirect?: string;
    recoveryCodes?: string[];
    options?: PublicKeyCredentialCreationOptionsJSON | PublicKeyCredentialRequestOptionsJSON;
    challengeId?: string;
  }>;
}

export function AdminMfaForm({
  purpose,
  passkeyCount,
  totpEnabled,
  allowRecovery = true,
}: {
  purpose: Purpose;
  passkeyCount: number;
  totpEnabled: boolean;
  allowRecovery?: boolean;
}) {
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function passkey() {
    setPending(true);
    setError(null);
    try {
      const optionsResponse = await fetch("/api/auth/mfa/passkey/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const optionsData = await json(optionsResponse);
      if (!optionsResponse.ok || !optionsData.options || !optionsData.challengeId) {
        throw new Error(optionsData.error || "Geçiş anahtarı başlatılamadı.");
      }
      const response = await startAuthentication({
        optionsJSON: optionsData.options as PublicKeyCredentialRequestOptionsJSON,
      });
      const verifyResponse = await fetch("/api/auth/mfa/passkey/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, challengeId: optionsData.challengeId, response }),
      });
      const verified = await json(verifyResponse);
      if (!verifyResponse.ok || !verified.redirect) {
        throw new Error(verified.error || "Geçiş anahtarı doğrulanamadı.");
      }
      window.location.replace(purpose === "STEP_UP" ? "/panel/yonetim" : verified.redirect);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Geçiş anahtarı doğrulanamadı.");
      setPending(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/mfa/code/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, code, method: recovery ? "RECOVERY" : "TOTP" }),
    });
    const data = await json(response);
    if (!response.ok) {
      setError(data.error || "Kod doğrulanamadı.");
      setPending(false);
      return;
    }
    window.location.replace(purpose === "STEP_UP" ? "/panel/yonetim" : data.redirect || "/panel");
  }

  return (
    <div className="space-y-5">
      {passkeyCount > 0 ? (
        <button
          type="button"
          onClick={() => void passkey()}
          disabled={pending}
          className="site-btn site-btn-primary site-btn-lg w-full min-h-12"
        >
          {pending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
          Face ID / parmak izi ile doğrula
        </button>
      ) : null}

      {totpEnabled ? (
        <>
          {passkeyCount > 0 ? (
            <p className="text-center text-xs text-slate-500">veya doğrulama uygulaması kodu girin</p>
          ) : null}
          <MfaCodeInput
            id="mfa-code"
            label={recovery ? "Kurtarma kodu" : "Doğrulama uygulaması kodu"}
            recovery={recovery}
            code={code}
            pending={pending}
            onCodeChange={setCode}
            onSubmit={verifyCode}
          />
          {allowRecovery && purpose === "AUTHENTICATE" ? (
            <button
              type="button"
              onClick={() => {
                setRecovery(!recovery);
                setCode("");
              }}
              className="w-full text-sm underline"
            >
              {recovery ? "Uygulama kodu kullan" : "Cihazımı kaybettim — kurtarma kodu kullan"}
            </button>
          ) : null}
        </>
      ) : null}

      {!passkeyCount && !totpEnabled ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Kayıtlı doğrulama yöntemi bulunamadı. Destek ekibinden MFA sıfırlama isteyin.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RecoveryCodesPanel({ recoveryCodes }: { recoveryCodes: string[] }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-bold">Kurtarma kodlarını şimdi kaydedin</h2>
        <p className="mt-1 text-sm">
          Bu kodlar yalnızca bir kez gösterilir ve her biri bir kez kullanılabilir.
        </p>
        <pre className="mt-4 grid gap-2 whitespace-pre-wrap font-mono text-sm">{recoveryCodes.join("\n")}</pre>
        <button type="button" onClick={() => void copyAll()} className="site-btn site-btn-secondary mt-3 w-full">
          {copied ? "Kopyalandı" : "Tüm kodları kopyala"}
        </button>
      </div>
      <button type="button" onClick={() => window.location.replace("/panel")} className="site-btn site-btn-primary w-full min-h-12">
        Güvenli alana devam et
      </button>
    </div>
  );
}

export function AdminMfaEnrollment() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function enrollPasskey() {
    setPending(true);
    setError(null);
    try {
      const optionResponse = await fetch("/api/auth/mfa/passkey/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "ENROLL" }),
      });
      const optionData = await json(optionResponse);
      if (!optionResponse.ok || !optionData.options || !optionData.challengeId) {
        throw new Error(optionData.error || "Kurulum başlatılamadı.");
      }
      const response = await startRegistration({
        optionsJSON: optionData.options as PublicKeyCredentialCreationOptionsJSON,
      });
      const verifyResponse = await fetch("/api/auth/mfa/passkey/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "ENROLL", challengeId: optionData.challengeId, response }),
      });
      const verified = await json(verifyResponse);
      if (!verifyResponse.ok || !verified.recoveryCodes) {
        throw new Error(verified.error || "Geçiş anahtarı kaydedilemedi.");
      }
      setRecoveryCodes(verified.recoveryCodes);
      setPending(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Geçiş anahtarı kaydedilemedi.");
      setPending(false);
    }
  }

  async function beginTotp() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/mfa/totp/enroll", { method: "PUT" });
    const data = (await response.json()) as { secret?: string; otpauthUri?: string; error?: string };
    if (!response.ok || !data.secret || !data.otpauthUri) {
      setError(data.error || "TOTP kurulumu başlatılamadı.");
    } else {
      setSecret(data.secret);
      setOtpauthUri(data.otpauthUri);
      setCode("");
    }
    setPending(false);
  }

  async function confirmTotp(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/mfa/totp/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await json(response);
    if (!response.ok || !data.recoveryCodes) {
      setError(data.error || "Kod doğrulanamadı.");
    } else {
      setRecoveryCodes(data.recoveryCodes);
    }
    setPending(false);
  }

  if (recoveryCodes) return <RecoveryCodesPanel recoveryCodes={recoveryCodes} />;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-900">Mobilde önerilen yöntem</p>
        <p className="mt-1 text-sm leading-6 text-emerald-950">
          Bu telefonun Face ID, parmak izi veya ekran kilidi ile geçiş anahtarı kaydedin. QR kod
          gerekmez; sonraki girişlerde tek dokunuş yeterli olur.
        </p>
        <button
          type="button"
          onClick={() => void enrollPasskey()}
          disabled={pending}
          className="site-btn site-btn-primary site-btn-lg mt-4 w-full min-h-12"
        >
          {pending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
          Bu cihazda geçiş anahtarı kaydet
        </button>
      </div>

      <div className="border-t pt-5">
        <p className="mb-1 text-sm font-semibold text-slate-800">Yedek: doğrulama uygulaması (TOTP)</p>
        <p className="mb-3 text-sm leading-6 text-slate-600">
          Geçiş anahtarı desteklenmiyorsa Google Authenticator gibi bir uygulama kullanın. Aynı
          telefondan kuruyorsanız QR okutmayın — anahtarı manuel girin.
        </p>
        {!secret || !otpauthUri ? (
          <button
            type="button"
            onClick={() => void beginTotp()}
            disabled={pending}
            className="site-btn site-btn-secondary w-full min-h-11"
          >
            {pending ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
            Doğrulama uygulaması kur
          </button>
        ) : (
          <TotpEnrollmentSetup
            secret={secret}
            otpauthUri={otpauthUri}
            code={code}
            pending={pending}
            onCodeChange={setCode}
            onSubmit={confirmTotp}
          />
        )}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
