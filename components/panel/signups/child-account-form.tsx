"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { InviteLinkReveal } from "@/components/panel/temp-password-reveal";

type Created = {
  email: string;
  fullName: string;
  linkedExisting: boolean;
  invite: { url: string; message: string; expiresAt: string } | null;
  provisioning: Array<{ orderId: string; product: string; outcome: string }>;
  studentId: string;
};

/**
 * "Öğrenci hesabı aç": velinin bildirdiği çocuk için öğrenci hesabı açar,
 * veliye bağlar ve ödenmiş siparişlerin erişimini açar. Ardından öğretmen
 * ataması için öğrenci detayına yönlendirir.
 */
export function ChildAccountForm({
  childId,
  defaultEmail,
  defaultName,
  parentPhone,
}: {
  childId: string;
  defaultEmail: string | null;
  defaultName: string;
  parentPhone: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [fullName, setFullName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; stepUp?: boolean } | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/panel/signups/children/${encodeURIComponent(childId)}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        student?: { id: string; email: string; fullName: string; linkedExisting: boolean };
        invite?: Created["invite"];
        provisioning?: Created["provisioning"];
      };
      if (!response.ok || !data.student) {
        setError({ message: data.error ?? "Hesap açılamadı.", stepUp: data.code === "STEP_UP_REQUIRED" });
        return;
      }
      setCreated({
        email: data.student.email,
        fullName: data.student.fullName,
        linkedExisting: data.student.linkedExisting,
        invite: data.invite ?? null,
        provisioning: data.provisioning ?? [],
        studentId: data.student.id,
      });
    } catch {
      setError({ message: "Bağlantı kurulamadı." });
    } finally {
      setPending(false);
    }
  }

  if (created) {
    const failed = created.provisioning.filter((item) => !item.outcome.startsWith("succeeded"));
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
          {created.fullName} için öğrenci hesabı {created.linkedExisting ? "mevcut hesaba bağlandı" : "açıldı"} ve veliye bağlandı.
          {created.provisioning.length ? ` ${created.provisioning.length - failed.length}/${created.provisioning.length} siparişin erişimi açıldı.` : ""}
        </p>
        {failed.length ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            Bazı siparişler tamamlanamadı; sipariş ekranından yeniden deneyin: {failed.map((item) => item.orderId).join(", ")}
          </p>
        ) : null}
        {created.invite ? (
          <InviteLinkReveal
            email={created.email}
            fullName={created.fullName}
            phone={parentPhone}
            inviteUrl={created.invite.url}
            inviteMessage={created.invite.message}
            inviteExpiresAt={created.invite.expiresAt}
            onDone={() => router.refresh()}
          />
        ) : null}
        <Link
          href={`/panel/yonetim/kullanicilar/${created.studentId}`}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-dc-brand-strong px-3 py-2 text-[13px] font-semibold text-white"
        >
          Öğretmen / koç ata
        </Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-dc-brand-strong px-3 py-2 text-[13px] font-semibold text-white"
      >
        <UserPlus size={14} aria-hidden="true" /> Öğrenci hesabı aç
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-dc-line bg-dc-surface-soft p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-dc-ink">
          Öğrenci ad soyad
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="rounded-lg border border-dc-line bg-white px-2.5 py-1.5 text-[13px] font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-dc-ink">
          Öğrenci e-postası
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-lg border border-dc-line bg-white px-2.5 py-1.5 text-[13px] font-normal"
          />
        </label>
      </div>
      <p className="text-[12px] text-dc-ink-muted">
        E-posta mevcut bir öğrenci hesabına aitse o hesap bağlanır; değilse davet bağlantısıyla yeni hesap açılır.
      </p>
      {error ? (
        <p role="alert" className="text-[12.5px] text-rose-700">
          {error.message}{" "}
          {error.stepUp ? (
            <Link href="/panel/guvenlik" className="font-semibold underline">
              Kimliğini doğrula
            </Link>
          ) : null}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-dc-brand-strong px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          Hesabı aç ve bağla
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-dc-line bg-white px-3 py-2 text-[13px] font-semibold text-dc-ink">
          Vazgeç
        </button>
      </div>
    </form>
  );
}
