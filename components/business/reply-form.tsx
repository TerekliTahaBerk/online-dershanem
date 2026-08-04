"use client";
import { useState } from "react";
export function ReplyForm({ conversationId, initialText = "" }: { conversationId: string; initialText?: string }) {
  const [text, setText] = useState(initialText); const [state, setState] = useState<"idle" | "sending" | "queued" | "error">("idle");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setState("sending");
    const response = await fetch("/api/integrations/instagram/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId, text, idempotencyKey: `human:${conversationId}:${crypto.randomUUID()}` }) });
    if (response.ok) { setText(""); setState("queued"); setTimeout(() => location.reload(), 450); } else setState("error");
  }
  return <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2"><label className="sr-only" htmlFor={`business-reply-${initialText ? "suggestion" : "manual"}`}>Yanıt</label><input id={`business-reply-${initialText ? "suggestion" : "manual"}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} required className="min-w-0 flex-1 rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-sm" placeholder="Yanıtınızı yazın…" /><button disabled={state === "sending"} className="rounded-xl bg-[var(--brand-olive)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{state === "sending" ? "Gönderiliyor…" : state === "queued" ? "Kuyruğa alındı" : "Gönder"}</button>{state === "error" ? <span role="alert" className="self-center text-xs text-rose-700">Gönderilemedi. Sistem tekrar denemeyi planlayabilir.</span> : null}</form>;
}
