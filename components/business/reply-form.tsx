"use client";
import { useState } from "react";
export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState(""); const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setState("sending");
    const response = await fetch("/api/integrations/instagram/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId, text, idempotencyKey: `human:${conversationId}:${crypto.randomUUID()}` }) });
    if (response.ok) { setText(""); setState("sent"); location.reload(); } else setState("error");
  }
  return <form onSubmit={submit} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="business-reply">Yanıt</label><input id="business-reply" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} required className="min-w-0 flex-1 rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-sm" placeholder="Yanıtınızı yazın…" /><button disabled={state === "sending"} className="rounded-xl bg-[var(--brand-olive)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{state === "sending" ? "Gönderiliyor…" : "Gönder"}</button>{state === "error" ? <span role="alert" className="self-center text-xs text-rose-700">Gönderilemedi.</span> : null}</form>;
}

