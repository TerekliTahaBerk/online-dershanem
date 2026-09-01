"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Smartphone } from "lucide-react";

const TOTP_ACCOUNT_NAME = "Online Dershanem";
const TOTP_ISSUER = "Online Dershanem";

function formatSecret(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return coarse;
}

function TotpQrCode({ uri }: { uri: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(uri, { margin: 1, width: 208 }).then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!src) return <div className="mx-auto h-[208px] w-[208px] animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />;

  return (
    <img
      src={src}
      alt="Doğrulama uygulaması QR kodu — yalnızca başka bir cihazla okutun"
      className="mx-auto rounded-xl border border-slate-200 bg-white p-2"
      width={208}
      height={208}
    />
  );
}

export function TotpEnrollmentSetup({
  secret,
  otpauthUri,
  code,
  onCodeChange,
  onSubmit,
  pending,
}: {
  secret: string;
  otpauthUri: string;
  code: string;
  onCodeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  pending: boolean;
}) {
  const coarsePointer = useCoarsePointer();
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {coarsePointer ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          <p className="flex items-start gap-2 font-bold">
            <Smartphone size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Aynı telefondan kuruyorsunuz
          </p>
          <p className="mt-2">
            QR kod okutamazsınız — doğrulama uygulamasında <strong>“Anahtarı gir”</strong> /
            <strong> “Enter a setup key”</strong> seçeneğini kullanın.
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px]">
            <li>Google Authenticator veya Microsoft Authenticator uygulamasını açın.</li>
            <li>“+” → “Anahtarı gir” seçeneğine dokunun (QR okutmayın).</li>
            <li>Hesap: <strong>{TOTP_ACCOUNT_NAME}</strong> · Sağlayıcı: <strong>{TOTP_ISSUER}</strong></li>
            <li>Aşağıdaki anahtarı kopyalayıp yapıştırın; tür olarak “Zamana dayalı” seçin.</li>
            <li>Uygulamadaki 6 haneli kodu bu sayfaya girin.</li>
          </ol>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Telefonunuzdaki doğrulama uygulamasıyla <strong>QR kodu okutun</strong>. Aynı cihazdaysanız
            aşağıdaki anahtarı manuel girin.
          </p>
          <div className="hidden md:block">
            <TotpQrCode uri={otpauthUri} />
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Kurulum anahtarı</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <p className="flex-1 break-all rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm leading-6">
            {formatSecret(secret)}
          </p>
          <button
            type="button"
            onClick={() => void copySecret()}
            className="site-btn site-btn-secondary min-h-11 shrink-0 px-4"
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "Kopyalandı" : "Anahtarı kopyala"}
          </button>
        </div>
      </div>

      {coarsePointer && otpauthUri ? (
        <a
          href={otpauthUri}
          className="site-btn site-btn-secondary w-full"
        >
          <ExternalLink size={16} aria-hidden="true" /> Doğrulama uygulamasında aç
        </a>
      ) : null}

      <div>
        <label htmlFor="totp-enroll-code" className="block text-sm font-semibold">
          Uygulamadaki 6 haneli kod
        </label>
        <input
          id="totp-enroll-code"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          className="mt-2 w-full rounded-xl border px-4 py-3.5 text-center text-lg tracking-[0.35em]"
          required
        />
      </div>

      <button type="submit" disabled={pending || code.length !== 6} className="site-btn site-btn-primary w-full min-h-12">
        Kurulumu doğrula
      </button>
    </form>
  );
}

export function MfaCodeInput({
  id,
  label,
  recovery,
  code,
  onCodeChange,
  pending,
  onSubmit,
}: {
  id: string;
  label: string;
  recovery: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  pending: boolean;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        value={code}
        onChange={(event) =>
          onCodeChange(
            recovery
              ? event.target.value.toUpperCase()
              : event.target.value.replace(/\D/g, "").slice(0, 6),
          )
        }
        autoComplete="one-time-code"
        inputMode={recovery ? "text" : "numeric"}
        autoCapitalize={recovery ? "characters" : "off"}
        spellCheck={false}
        required
        className="w-full rounded-xl border px-4 py-3.5 text-center text-lg tracking-[0.2em]"
        placeholder={recovery ? "XXXX-XXXX-XXXX-XXXX" : "000000"}
      />
      <button type="submit" disabled={pending} className="site-btn site-btn-secondary w-full min-h-12">
        {pending ? "Doğrulanıyor..." : "Kodu doğrula"}
      </button>
    </form>
  );
}
