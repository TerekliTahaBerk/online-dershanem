"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock3, Loader2 } from "lucide-react";

type Status = "TODO" | "IN_PROGRESS" | "DONE";
type Assignment = { id: string; title: string; description: string; dueAt: string; groupName: string; subject: string; status: Status };

const statusCopy: Record<Status, string> = { TODO: "Başlanmadı", IN_PROGRESS: "Çalışıyorum", DONE: "Tamamlandı" };

export function StudentAssignmentList({ assignments }: { assignments: Assignment[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: Status) {
    setBusy(id);
    const response = await fetch(`/api/panel/assignments/${id}/progress`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => null);
    setBusy(null);
    if (response?.ok) router.refresh();
  }

  return <div className="grid gap-4 lg:grid-cols-2">{assignments.map((assignment) => { const overdue = assignment.status !== "DONE" && new Date(assignment.dueAt) < new Date(); return <article key={assignment.id} className="rounded-[24px] border border-[var(--site-line)] bg-white p-5 shadow-[var(--panel-card-shadow)]"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-olive)]">{assignment.groupName} · {assignment.subject}</span><span className={`rounded-full px-2.5 py-1 text-[9.5px] font-extrabold ${assignment.status === "DONE" ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>{overdue ? "Süresi geçti" : statusCopy[assignment.status]}</span></div><h2 className="mt-4 text-base font-extrabold text-[var(--site-ink)]">{assignment.title}</h2><p className="mt-2 min-h-10 text-sm leading-6 text-[var(--site-body)]">{assignment.description || "Öğretmenin açıklama eklemedi."}</p><p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--site-muted)]"><Clock3 size={13} /> {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(assignment.dueAt))}</p><div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-[var(--site-bg-warm)] p-1">{(["TODO", "IN_PROGRESS", "DONE"] as Status[]).map((status) => <button key={status} type="button" disabled={busy === assignment.id} aria-pressed={assignment.status === status} onClick={() => void setStatus(assignment.id, status)} className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-bold transition ${assignment.status === status ? "bg-[var(--brand-olive)] text-white shadow-sm" : "text-[var(--site-muted)] hover:bg-white"}`}>{busy === assignment.id && assignment.status !== status ? <Loader2 size={11} className="animate-spin" /> : status === "DONE" ? <Check size={11} /> : status === "IN_PROGRESS" ? <Clock3 size={11} /> : <Circle size={11} />}{statusCopy[status]}</button>)}</div></article>; })}{!assignments.length ? <div className="rounded-[24px] border border-dashed border-[var(--site-line)] p-10 text-center text-sm text-[var(--site-muted)] lg:col-span-2">Aktif ödeviniz yok. Güzel bir nefes arası!</div> : null}</div>;
}
