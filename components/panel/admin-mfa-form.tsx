"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

type Purpose = "AUTHENTICATE" | "STEP_UP";

async function json(response: Response) {
  return response.json() as Promise<{ error?: string; redirect?: string; recoveryCodes?: string[]; options?: PublicKeyCredentialCreationOptionsJSON | PublicKeyCredentialRequestOptionsJSON; challengeId?: string }>;
}

export function AdminMfaForm({ purpose, passkeyCount, totpEnabled, allowRecovery = true }: { purpose: Purpose; passkeyCount: number; totpEnabled: boolean; allowRecovery?: boolean }) {
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function passkey() {
    setPending(true); setError(null);
    try {
      const optionsResponse = await fetch("/api/auth/mfa/passkey/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose }) });
      const optionsData = await json(optionsResponse);
      if (!optionsResponse.ok || !optionsData.options || !optionsData.challengeId) throw new Error(optionsData.error || "Geçiş anahtarı başlatılamadı.");
      const response = await startAuthentication({ optionsJSON: optionsData.options as PublicKeyCredentialRequestOptionsJSON });
      const verifyResponse = await fetch("/api/auth/mfa/passkey/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose, challengeId: optionsData.challengeId, response }) });
      const verified = await json(verifyResponse);
      if (!verifyResponse.ok || !verified.redirect) throw new Error(verified.error || "Geçiş anahtarı doğrulanamadı.");
      window.location.replace(purpose === "STEP_UP" ? "/panel/yonetim" : verified.redirect);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Geçiş anahtarı doğrulanamadı."); setPending(false); }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(null);
    const response = await fetch("/api/auth/mfa/code/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose, code, method: recovery ? "RECOVERY" : "TOTP" }) });
    const data = await json(response);
    if (!response.ok || !data.redirect) { setError(data.error || "Kod doğrulanamadı."); setPending(false); return; }
    window.location.replace(purpose === "STEP_UP" ? "/panel/yonetim" : data.redirect);
  }

  return <div className="space-y-5">
    {passkeyCount > 0 ? <button type="button" onClick={passkey} disabled={pending} className="site-btn site-btn-primary site-btn-lg w-full"><KeyRound size={18} /> Geçiş anahtarıyla doğrula</button> : null}
    {totpEnabled ? <form onSubmit={verifyCode} className="space-y-3">
      <label htmlFor="mfa-code" className="block text-sm font-semibold">{recovery ? "Kurtarma kodu" : "Doğrulama uygulaması kodu"}</label>
      <input id="mfa-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode={recovery ? "text" : "numeric"} required className="w-full rounded-xl border px-4 py-3" placeholder={recovery ? "XXXX-XXXX-XXXX-XXXX" : "000000"} />
      <button disabled={pending} className="site-btn site-btn-secondary w-full">{pending ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />} Kodu doğrula</button>
      {allowRecovery && purpose === "AUTHENTICATE" ? <button type="button" onClick={() => { setRecovery(!recovery); setCode(""); }} className="w-full text-sm underline">{recovery ? "Uygulama kodu kullan" : "Cihazımı kaybettim — kurtarma kodu kullan"}</button> : null}
    </form> : null}
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
  </div>;
}

export function AdminMfaEnrollment() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function enrollPasskey() {
    setPending(true); setError(null);
    try {
      const optionResponse = await fetch("/api/auth/mfa/passkey/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose: "ENROLL" }) });
      const optionData = await json(optionResponse);
      if (!optionResponse.ok || !optionData.options || !optionData.challengeId) throw new Error(optionData.error || "Kurulum başlatılamadı.");
      const response = await startRegistration({ optionsJSON: optionData.options as PublicKeyCredentialCreationOptionsJSON });
      const verifyResponse = await fetch("/api/auth/mfa/passkey/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose: "ENROLL", challengeId: optionData.challengeId, response }) });
      const verified = await json(verifyResponse);
      if (!verifyResponse.ok || !verified.recoveryCodes) throw new Error(verified.error || "Geçiş anahtarı kaydedilemedi.");
      setRecoveryCodes(verified.recoveryCodes); setPending(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Geçiş anahtarı kaydedilemedi."); setPending(false); }
  }

  async function beginTotp() {
    setPending(true); setError(null);
    const response = await fetch("/api/auth/mfa/totp/enroll", { method: "PUT" });
    const data = await response.json() as { secret?: string; error?: string };
    if (!response.ok || !data.secret) setError(data.error || "TOTP kurulumu başlatılamadı."); else setSecret(data.secret);
    setPending(false);
  }

  async function confirmTotp(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(null);
    const response = await fetch("/api/auth/mfa/totp/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await json(response);
    if (!response.ok || !data.recoveryCodes) setError(data.error || "Kod doğrulanamadı."); else setRecoveryCodes(data.recoveryCodes);
    setPending(false);
  }

  if (recoveryCodes) return <div className="space-y-4"><div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h2 className="font-bold">Kurtarma kodlarını şimdi kaydedin</h2><p className="mt-1 text-sm">Bu kodlar yalnızca bir kez gösterilir ve her biri bir kez kullanılabilir.</p><pre className="mt-4 grid gap-2 whitespace-pre-wrap font-mono text-sm">{recoveryCodes.join("\n")}</pre></div><button onClick={() => window.location.replace("/panel")} className="site-btn site-btn-primary w-full">Güvenli alana devam et</button></div>;

  return <div className="space-y-6"><div><p className="mb-3 text-sm text-slate-600">Önerilen: cihazınızın biyometrik doğrulamasını kullanan bir geçiş anahtarı.</p><button type="button" onClick={enrollPasskey} disabled={pending} className="site-btn site-btn-primary site-btn-lg w-full"><KeyRound size={18} /> Geçiş anahtarı kaydet</button></div><div className="border-t pt-5"><p className="mb-3 text-sm text-slate-600">Geçiş anahtarı kullanamıyorsanız doğrulama uygulamasını yedek yöntem olarak kurun.</p>{!secret ? <button type="button" onClick={beginTotp} disabled={pending} className="site-btn site-btn-secondary w-full">TOTP kurulumu başlat</button> : <form onSubmit={confirmTotp} className="space-y-3"><p className="break-all rounded-lg bg-slate-100 p-3 font-mono text-sm">{secret}</p><p className="text-xs text-slate-600">Bu anahtarı doğrulama uygulamanıza ekleyin; sunucu anahtarı yalnızca şifreli saklar.</p><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="w-full rounded-xl border px-4 py-3" required /><button disabled={pending} className="site-btn site-btn-secondary w-full">Kurulumu doğrula</button></form>}</div>{error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}</div>;
}
