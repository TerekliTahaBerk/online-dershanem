"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock3, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/components/panel/offline-sync-provider";

type Status = "TODO" | "IN_PROGRESS" | "DONE";
type Submission = { id: string; attemptNumber: number; status: "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED"; textEvidence: string; feedback: string | null; scores: { criterionId: string; level: "NEEDS_WORK" | "DEVELOPING" | "MEETS" }[] };
type Assignment = { id: string; title: string; description: string; dueAt: string; groupName: string; subject: string; status: Status; version: number; evidenceRequired: boolean; criteria: { id: string; label: string }[]; submissions: Submission[] };

const statusCopy: Record<Status, string> = { TODO: "Başlanmadı", IN_PROGRESS: "Çalışıyorum", DONE: "Tamamlandı" };

const rubricCopy = { NEEDS_WORK: "Bir adım daha", DEVELOPING: "Gelişiyor", MEETS: "Karşılıyor" } as const;
export function StudentAssignmentList({ assignments, evidenceEnabled = false }: { assignments: Assignment[]; evidenceEnabled?: boolean }) {
  const router = useRouter();
  const offline = useOfflineSync();
  const [busy, setBusy] = useState<string | null>(null);
  const [items, setItems] = useState(assignments);
  const [message, setMessage] = useState("");
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  useEffect(() => setItems(assignments), [assignments]);
  useEffect(() => {
    const synced = (event: Event) => { const detail = (event as CustomEvent<{ kind: string }>).detail; if (detail?.kind === "ASSIGNMENT_PROGRESS") { setMessage("Cihazda bekleyen ödev durumu güvenle eşitlendi."); router.refresh(); } };
    const conflicted = (event: Event) => { const detail = (event as CustomEvent<{ kind: string }>).detail; if (detail?.kind === "ASSIGNMENT_PROGRESS") setMessage("Ödev durumu başka yerde değişti; son durumu görüp yeniden seçin."); };
    window.addEventListener("panel-offline-synced", synced); window.addEventListener("panel-offline-conflict", conflicted);
    return () => { window.removeEventListener("panel-offline-synced", synced); window.removeEventListener("panel-offline-conflict", conflicted); };
  }, [router]);

  async function submitEvidence(id: string) {
    setBusy(id); setMessage("");
    const idempotencyKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replaceAll("-", "_") : `evidence_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const response = await fetch(`/api/panel/assignments/${id}/submissions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ textEvidence: evidence[id] || "", idempotencyKey }) });
    const body = await response.json().catch(() => ({})); setBusy(null);
    if (!response.ok) { setMessage(body.error || "Kanıt gönderilemedi."); return; }
    setMessage(body.attemptNumber > 1 ? "Yeni denemen öğretmenine gönderildi." : "Kanıtın öğretmen değerlendirmesine gönderildi."); router.refresh();
  }

  async function setStatus(id: string, status: Status) {
    setBusy(id);
    const current = items.find((item) => item.id === id);
    const result = await offline.submitMutation({ kind: "ASSIGNMENT_PROGRESS", method: "PATCH", url: `/api/panel/assignments/${id}/progress`, body: { status, expectedVersion: current?.version || 0, mutationKey: crypto.randomUUID() }, coalesceKey: `assignment:${id}` });
    setBusy(null);
    if (result.state === "synced" || result.state === "queued") {
      setItems((rows) => rows.map((item) => item.id === id ? { ...item, status, version: result.state === "synced" && typeof result.body.version === "number" ? result.body.version : item.version } : item));
      setMessage(result.state === "queued" ? "Bağlantı yok; ödev durumu bu cihazda güvenle bekliyor." : status === "DONE" ? "Harika! Çalışma tamamlandı, serin büyüyor." : "İlerlemen kaydedildi.");
      if (status === "DONE" && result.state === "synced") {
        const banner = document.createElement("div");
        banner.className = "panel-celebration";
        banner.setAttribute("role", "status");
        banner.textContent = "🎉 Bir adım daha tamam! ⭐";
        document.body.append(banner);
        window.setTimeout(() => banner.remove(), 2200);
      }
      if (result.state === "synced") router.refresh();
    } else if (result.state === "conflict") {
      setMessage("Ödev durumu başka bir sekmede değişti. Sayfayı yenileyip yeniden seçin.");
    } else {
      setMessage(String(result.body.error || "Durum kaydedilemedi. Lütfen yeniden deneyin."));
    }
  }

  return <><p aria-live="polite" className="mb-3 min-h-5 text-xs font-bold text-[var(--brand-olive)]">{message}</p><div className="grid gap-4 lg:grid-cols-2">{items.map((assignment) => { const overdue = assignment.status !== "DONE" && new Date(assignment.dueAt) < new Date(); const latest = assignment.submissions[0]; const canSubmit = evidenceEnabled && assignment.evidenceRequired && (!latest || latest.status === "CHANGES_REQUESTED"); return <article key={assignment.id} className="rounded-[24px] border border-[var(--site-line)] bg-white p-5 shadow-[var(--panel-card-shadow)]"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-olive)]">{assignment.groupName} · {assignment.subject}</span><span className={`rounded-full px-2.5 py-1 text-[9.5px] font-extrabold ${assignment.status === "DONE" ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>{overdue ? "Süresi geçti" : statusCopy[assignment.status]}</span></div><h2 className="mt-4 text-base font-extrabold text-[var(--site-ink)]">{assignment.title}</h2><p className="mt-2 min-h-10 text-sm leading-6 text-[var(--site-body)]">{assignment.description || "Öğretmenin açıklama eklemedi."}</p><p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--site-muted)]"><Clock3 size={13} /> {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(assignment.dueAt))}</p>{assignment.evidenceRequired && evidenceEnabled ? <div className="mt-4 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"><p className="text-xs font-extrabold">Kanıtlı teslim · ölçütler</p><ul className="mt-2 space-y-1 text-xs text-[var(--site-body)]">{assignment.criteria.map((criterion) => <li key={criterion.id}>• {criterion.label}{latest?.scores.find((score) => score.criterionId === criterion.id) ? ` · ${rubricCopy[latest.scores.find((score) => score.criterionId === criterion.id)!.level]}` : ""}</li>)}</ul>{latest ? <div className="mt-3 rounded-xl bg-white p-3 text-xs"><p className="font-extrabold">{latest.attemptNumber}. deneme · {latest.status === "SUBMITTED" ? "Öğretmeninde" : latest.status === "APPROVED" ? "Onaylandı" : "Yeniden deneyebilirsin"}</p>{latest.feedback ? <p className="mt-2 leading-5">Geri bildirim: {latest.feedback}</p> : null}</div> : null}{canSubmit ? <div className="mt-3"><label className="text-[11px] font-bold" htmlFor={`evidence-${assignment.id}`}>{latest ? "Yeni denemende neyi değiştirdin?" : "Çözüm yolunu ve kontrolünü kısaca açıkla"}</label><textarea id={`evidence-${assignment.id}`} value={evidence[assignment.id] || ""} onChange={(event) => setEvidence((current) => ({ ...current, [assignment.id]: event.target.value }))} maxLength={2000} className="panel-input mt-2 min-h-24 resize-y" /><button type="button" disabled={busy === assignment.id || (evidence[assignment.id]?.trim().length || 0) < 20} onClick={() => void submitEvidence(assignment.id)} className="panel-quick-action panel-quick-action-primary mt-2">{latest ? "Yeni denemeyi gönder" : "Kanıtı gönder"}</button><p className="mt-2 text-[10px] text-[var(--site-muted)]">Fotoğraf/PDF, güvenli tarama ve metadata temizleme servisi açılana kadar kabul edilmez.</p></div> : null}</div> : <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-[var(--site-bg-warm)] p-1">{(["TODO", "IN_PROGRESS", "DONE"] as Status[]).map((status) => <button key={status} type="button" disabled={busy === assignment.id} aria-pressed={assignment.status === status} onClick={() => void setStatus(assignment.id, status)} className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-bold transition ${assignment.status === status ? "bg-[var(--brand-olive)] text-white shadow-sm" : "text-[var(--site-muted)] hover:bg-white"}`}>{busy === assignment.id && assignment.status !== status ? <Loader2 size={11} className="animate-spin" /> : status === "DONE" ? <Check size={11} /> : status === "IN_PROGRESS" ? <Clock3 size={11} /> : <Circle size={11} />}{statusCopy[status]}</button>)}</div>}</article>; })}{!items.length ? <div className="rounded-[24px] border border-dashed border-[var(--site-line)] p-10 text-center text-sm text-[var(--site-muted)] lg:col-span-2">Aktif ödeviniz yok. Güzel bir nefes arası!</div> : null}</div></>;
}
