"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COACHING_RESCHEDULE_REASONS } from "@/lib/coaching-experience";
import { buttonClass } from "@/components/panel/primitives";
type Session = { id: string; version: number; scheduledAt: string; meetingUrl: string | null; rescheduleRequestedAt: string | null; rescheduleReason: keyof typeof COACHING_RESCHEDULE_REASONS | null; proposedAt: string | null };
const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
export function CoachingSessionControls({ session, role }: { session: Session; role: "STUDENT" | "PARENT" | "TEACHER" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const last = useRef<{ payload: string; key: string } | null>(null);
  async function submit(payload: Record<string, unknown>) {
    if (busy) return;
    const body = { ...payload, expectedVersion: session.version };
    const serialized = JSON.stringify(body);
    if (last.current?.payload !== serialized) last.current = { payload: serialized, key: crypto.randomUUID() };
    setBusy(true);
    try {
      const response = await fetch(`/api/panel/coaching-sessions/${session.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, idempotencyKey: last.current!.key }) });
      const result = await response.json();
      setMessage(response.ok ? "Görüşme bilgisi kaydedildi." : result.error || "Görüşme kaydedilemedi.");
      if (response.ok || response.status === 409) router.refresh();
    } catch { setMessage("Bağlantı kurulamadı. Tekrar deneyebilirsiniz."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Görüşme saati" className="space-y-3 border-b border-pn-border py-4 first:pt-0">
    <p className="font-semibold">{new Date(session.scheduledAt) < new Date() ? "Yeni saat bekleniyor" : DATE.format(new Date(session.scheduledAt))}</p>
    {session.meetingUrl && !session.proposedAt && new Date(session.scheduledAt) >= new Date() && <a className={buttonClass("primary", "md")} href={session.meetingUrl} target="_blank" rel="noreferrer">Görüşmeye katıl</a>}
    {session.rescheduleRequestedAt && <p className="text-sm">Saat değişikliği talebiniz alındı. {session.rescheduleReason ? COACHING_RESCHEDULE_REASONS[session.rescheduleReason] : ""}</p>}
    {session.proposedAt && <p className="text-sm">Önerilen saat: {DATE.format(new Date(session.proposedAt))}</p>}
    {role === "STUDENT" && session.proposedAt && <button disabled={busy} className={buttonClass("primary", "md")} onClick={() => submit({ action: "ACCEPT" })}>Yeni saati onayla</button>}
    {role !== "TEACHER" && !session.rescheduleRequestedAt && <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit({ action: "REQUEST", reason: data.get("reason") }); }}>
      <label className="text-sm">Saat değişikliği nedeni<select name="reason" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1">{Object.entries(COACHING_RESCHEDULE_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button disabled={busy} className={buttonClass("secondary", "md")}>Saat değiştir</button>
    </form>}
    {role === "TEACHER" && <>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit({ action: "SAVE", scheduledAt: `${data.get("date")}:00+03:00`, meetingUrl: data.get("meetingUrl") || null }); }}>
        <label className="block text-sm">{session.rescheduleRequestedAt ? "Yeni saat önerisi" : "Görüşme saati"}<input required name="date" type="datetime-local" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" defaultValue={new Date(new Date(session.scheduledAt).getTime() + 3 * 3_600_000).toISOString().slice(0, 16)} /></label>
        <label className="block text-sm">Katılım bağlantısı<input name="meetingUrl" type="url" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" defaultValue={session.meetingUrl ?? ""} placeholder="https://" /></label>
        <button disabled={busy} className={buttonClass("secondary", "md")}>{session.rescheduleRequestedAt ? "Yeni saati öner" : "Görüşmeyi güncelle"}</button>
      </form>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const decisions = [1, 2, 3].filter((index) => data.get(`decision${index}`)).map((index) => ({ title: data.get(`decision${index}`), scheduledFor: `${data.get(`day${index}`)}T12:00:00+03:00`, durationMinutes: Number(data.get(`minutes${index}`)) })); void submit({ action: "COMPLETE", focus: data.get("focus") || "", sharedNote: data.get("sharedNote") || "", privateNote: data.get("privateNote") || "", decisions }); }}>
        <label className="block text-sm">Haftanın odağı<input name="focus" maxLength={300} className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label>
        <label className="block text-sm">Paylaşılan koç notu<textarea name="sharedNote" maxLength={4000} className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label>
        <label className="block text-sm">Özel koç notu<textarea name="privateNote" maxLength={4000} className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label>
        <p className="text-sm">Bu haftanın en fazla üç kararı. Eklenen çalışmalar koç onayından sonra öğrenciye görünür.</p>
        {[1, 2, 3].map((index) => <fieldset key={index} className="grid gap-2 sm:grid-cols-3"><legend className="text-sm">Karar {index}</legend><label className="text-sm">Çalışma<input name={`decision${index}`} maxLength={160} className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label><label className="text-sm">Gün<input name={`day${index}`} type="date" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label><label className="text-sm">Süre (dakika)<input name={`minutes${index}`} type="number" min={5} max={480} className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label></fieldset>)}
        <button disabled={busy} className={buttonClass("primary", "md")}>Görüşmeyi tamamla</button>
      </form>
    </>}
    <p role="status" className="text-sm">{message}</p>
  </section>;
}
export function CoachingSessionCreate({ studentId }: { studentId: string }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null);
  return <form className="mt-4 space-y-3" onSubmit={async (event) => { event.preventDefault(); if (busy) return; setBusy(true); key.current ??= crypto.randomUUID(); const data = new FormData(event.currentTarget); try {
    const response = await fetch("/api/panel/coaching-sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, scheduledAt: `${data.get("date")}:00+03:00`, meetingUrl: data.get("meetingUrl") || null, idempotencyKey: key.current }) });
    const result = await response.json(); setMessage(response.ok ? "Görüşme planlandı." : result.error || "Görüşme planlanamadı."); if (response.ok) { key.current = null; router.refresh(); }
  } catch { setMessage("Bağlantı kurulamadı. Tekrar deneyebilirsiniz."); } finally { setBusy(false); } }}>
    <label className="block text-sm">Görüşme saati<input required name="date" type="datetime-local" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label>
    <label className="block text-sm">Katılım bağlantısı<input name="meetingUrl" type="url" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" placeholder="https://" /></label>
    <button disabled={busy} className={buttonClass("primary", "md")}>Görüşme planla</button><p role="status" className="text-sm">{message}</p>
  </form>;
}
