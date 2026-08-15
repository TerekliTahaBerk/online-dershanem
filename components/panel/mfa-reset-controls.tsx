"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";

/**
 * ÇİFT KONTROLLÜ YÖNETİCİ MFA SIFIRLAMA — arayüz.
 *
 * Sunucu tarafı (`/api/panel/users/[id]/mfa-reset` ve
 * `/api/panel/mfa-resets/[id]/approve`) hazırdı fakat hiçbir ekrandan
 * çağrılmıyordu: canlıda yöneticilerin MFA kaydı zorunlu olduğu için cihaz
 * kaybında kurtarma yolu fiilen yoktu.
 *
 * Kural sunucuda: isteği açan ve hedef yönetici onaylayamaz, istek 30 dakika
 * geçerlidir, onay taze bir yönetici step-up doğrulaması ister. Buradaki
 * arayüz bu kuralları TEKRARLAMAZ; hata mesajlarını olduğu gibi gösterir.
 */

function useSubmit() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (url: string, body?: unknown) => {
    setPending(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; status?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "İşlem tamamlanamadı.");
        return false;
      }
      setDone(json?.status === "COMPLETED" ? "MFA sıfırlandı; yönetici yeniden kayıt yapacak." : "İstek oluşturuldu; ikinci yönetici onayı bekleniyor.");
      router.refresh();
      return true;
    } catch {
      setError("Bağlantı kurulamadı.");
      return false;
    } finally {
      setPending(false);
    }
  };

  return { run, pending, error, done };
}

export function RequestMfaResetForm({ userId }: { userId: string }) {
  const { run, pending, error, done } = useSubmit();
  const [reason, setReason] = useState("");

  return (
    <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-[13px] font-bold text-amber-900">
        <ShieldAlert size={15} aria-hidden="true" /> MFA sıfırlama talebi
      </p>
      <p className="mt-1.5 text-[12.5px] leading-5 text-amber-950">
        Yalnız cihaz kaybı gibi durumlarda kullanın. Talebi ikinci bir yönetici
        onaylamadan hiçbir doğrulama yöntemi silinmez.
      </p>
      <label htmlFor={`mfa-reason-${userId}`} className="mt-3 block text-[12px] font-semibold text-amber-950">
        Operasyon gerekçesi (en az 10 karakter)
      </label>
      <textarea
        id={`mfa-reason-${userId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={2}
        maxLength={500}
        className="mt-1.5 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-[13px] text-[var(--site-ink)] outline-none focus:border-amber-500"
        placeholder="Ör. yönetici telefonunu kaybetti, kimliği telefonla doğrulandı."
      />
      <button
        type="button"
        disabled={pending || reason.trim().length < 10}
        onClick={() => void run(`/api/panel/users/${userId}/mfa-reset`, { reason: reason.trim() })}
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3.5 py-2 text-[12.5px] font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <KeyRound size={14} aria-hidden="true" />
        {pending ? "Gönderiliyor..." : "Sıfırlama talebi aç"}
      </button>
      {error ? <p role="alert" className="mt-2 text-[12.5px] text-rose-700">{error}</p> : null}
      {done ? <p role="status" className="mt-2 text-[12.5px] text-emerald-800">{done}</p> : null}
    </div>
  );
}

export function ApproveMfaResetButton({ requestId }: { requestId: string }) {
  const { run, pending, error, done } = useSubmit();

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => void run(`/api/panel/mfa-resets/${requestId}/approve`)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-[12.5px] font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Onaylanıyor..." : "Onayla ve sıfırla"}
      </button>
      {error ? <p role="alert" className="text-[12px] text-rose-700">{error}</p> : null}
      {done ? <p role="status" className="text-[12px] text-emerald-800">{done}</p> : null}
    </div>
  );
}
