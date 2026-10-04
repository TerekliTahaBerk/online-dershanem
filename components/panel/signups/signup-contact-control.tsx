"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CONTACT_STATUS_OPTIONS } from "@/lib/account/dictionaries";

/** Yeni kayıt satırı: iletişim durumu + kısa not. */
export function SignupContactControl({
  userId,
  status,
  note,
}: {
  userId: string;
  status: string;
  note: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [text, setText] = useState(note ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/panel/signups/${encodeURIComponent(userId)}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactStatus: value, contactNote: text }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kaydedilemedi.");
      setMessage("Kaydedildi.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`contact-status-${userId}`}>
          İletişim durumu
        </label>
        <select
          id={`contact-status-${userId}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="rounded-lg border border-dc-line bg-white px-2.5 py-1.5 text-[13px] text-dc-ink"
        >
          {CONTACT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-dc-brand-strong px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          Kaydet
        </button>
        {message ? (
          <span role="status" className="text-[12px] text-dc-ink-muted">
            {message}
          </span>
        ) : null}
      </div>
      <label className="sr-only" htmlFor={`contact-note-${userId}`}>
        İletişim notu
      </label>
      <input
        id={`contact-note-${userId}`}
        value={text}
        maxLength={1000}
        onChange={(event) => setText(event.target.value)}
        placeholder="Görüşme notu (isteğe bağlı)"
        className="w-full rounded-lg border border-dc-line bg-white px-2.5 py-1.5 text-[13px] text-dc-ink"
      />
    </div>
  );
}
