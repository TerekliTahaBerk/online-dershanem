"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CheckCircle2, ClipboardPlus } from "lucide-react";
import { OutcomePicker, type OutcomeOption, type SelectedOutcome } from "@/components/panel/outcome-picker";

type Group = { id: string; name: string; subject: string };
type Lesson = { id: string; groupId: string; title: string; startsAt: string };
type Assignment = { id: string; groupId: string; groupName: string; title: string; description: string; dueAt: string; isActive: boolean; done: number; total: number; outcomes?: string[] };

async function request(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
}

function AssignmentOutcomeBackfill({ assignment, outcomes, onSaved }: { assignment: Assignment; outcomes: OutcomeOption[]; onSaved: () => void }) {
  const [selected, setSelected] = useState<SelectedOutcome[]>([]);
  const [reason, setReason] = useState<"CATALOG_MISSING" | "COMPLETE_LATER" | "NOT_APPLICABLE" | "">("COMPLETE_LATER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <details className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3"><summary className="cursor-pointer text-[10.5px] font-extrabold text-amber-900">Kazanım etiketi bekliyor · tamamla</summary><div className="mt-3"><OutcomePicker outcomes={outcomes} value={selected} onChange={(value) => { setSelected(value); if (value.length) setReason(""); }} />{!selected.length ? <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="panel-input mt-2 text-xs" aria-label={`${assignment.title} erteleme nedeni`}><option value="COMPLETE_LATER">Sonra tamamlayacağım</option><option value="CATALOG_MISSING">Katalogda uygun kazanım yok</option><option value="NOT_APPLICABLE">Uygulanabilir değil</option></select> : null}<button type="button" disabled={busy} onClick={() => { setBusy(true); setError(""); void request(`/api/panel/assignments/${assignment.id}`, "PATCH", { title: assignment.title, description: assignment.description, dueAt: assignment.dueAt, isActive: assignment.isActive, outcomeIds: selected.map((item) => item.outcomeId), outcomeSkipReason: reason || null }).then(onSaved).catch((caught) => setError(caught instanceof Error ? caught.message : "Kaydedilemedi.")).finally(() => setBusy(false)); }} className="panel-quick-action mt-2">{busy ? "Kaydediliyor" : "Etiketi kaydet"}</button>{error ? <p className="mt-2 text-[10px] font-bold text-rose-700">{error}</p> : null}</div></details>;
}

export function TeacherAssignmentManager({ groups, lessons, assignments, outcomes = [], learningOutcomesEnabled = false }: { groups: Group[]; lessons: Lesson[]; assignments: Assignment[]; outcomes?: OutcomeOption[]; learningOutcomesEnabled?: boolean }) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedOutcomes, setSelectedOutcomes] = useState<SelectedOutcome[]>([]);
  const [outcomeSkipReason, setOutcomeSkipReason] = useState<"CATALOG_MISSING" | "COMPLETE_LATER" | "NOT_APPLICABLE" | "">("");
  const groupLessons = useMemo(() => lessons.filter((lesson) => lesson.groupId === groupId), [groupId, lessons]);

  async function run(id: string, action: () => Promise<void>, success: string) {
    setBusy(id); setMessage("");
    try { await action(); setMessage(success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı."); } finally { setBusy(null); }
  }

  return <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
    <form className="panel-surface h-fit p-5" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run("create", () => request("/api/panel/assignments", "POST", { groupId: data.get("groupId"), lessonId: data.get("lessonId") || null, title: data.get("title"), description: data.get("description"), dueAt: new Date(String(data.get("dueAt"))).toISOString(), outcomeIds: selectedOutcomes.map((item) => item.outcomeId), outcomeSkipReason: outcomeSkipReason || null }), "Ödev öğrencilere gönderildi."); }}>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><ClipboardPlus size={19} /></span>
      <h2 className="mt-4 text-base font-extrabold text-[var(--site-ink)]">Yeni ödev</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Gruba gönderdiğiniz anda öğrenci ve veli panelinde görünür.</p>
      <select name="groupId" value={groupId} onChange={(event) => setGroupId(event.target.value)} required className="panel-input mt-4"><option value="">Grup seçin</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.subject}</option>)}</select>
      <select name="lessonId" className="panel-input mt-2"><option value="">Belirli bir derse bağlı değil</option>{groupLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(lesson.startsAt))} · {lesson.title}</option>)}</select>
      <input name="title" required maxLength={140} className="panel-input mt-2" placeholder="Ödev başlığı" />
      <textarea name="description" maxLength={2000} className="panel-input mt-2 min-h-28 resize-y" placeholder="Yapılacak çalışma, soru aralığı ve kısa yönlendirme" />
      <input name="dueAt" type="datetime-local" required className="panel-input mt-2" aria-label="Teslim zamanı" />
      {learningOutcomesEnabled ? <div className="mt-3"><OutcomePicker outcomes={outcomes} value={selectedOutcomes} onChange={(value) => { setSelectedOutcomes(value); if (value.length) setOutcomeSkipReason(""); }} />{!selectedOutcomes.length ? <select value={outcomeSkipReason} onChange={(event) => setOutcomeSkipReason(event.target.value as typeof outcomeSkipReason)} className="panel-input mt-2 text-xs" aria-label="Ödev kazanım erteleme nedeni"><option value="">Kazanım seçin veya neden belirtin</option><option value="COMPLETE_LATER">Sonra tamamlayacağım</option><option value="CATALOG_MISSING">Katalogda uygun kazanım yok</option><option value="NOT_APPLICABLE">Bu ödev için uygulanabilir değil</option></select> : null}</div> : null}
      <button disabled={busy === "create" || !groups.length} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">{busy === "create" ? "Gönderiliyor" : "Ödevi gönder"}</button>
      {message ? <p aria-live="polite" className="mt-3 rounded-xl bg-[var(--brand-olive-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-olive)]">{message}</p> : null}
    </form>

    <section>
      <div className="flex items-end justify-between gap-3"><div><h2 className="text-sm font-extrabold text-[var(--site-ink)]">Aktif ödevler</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Tamamlanma durumunu grup bazında izleyin.</p></div><span className="text-xs font-bold text-[var(--site-muted)]">{assignments.filter((item) => item.isActive).length} aktif</span></div>
      <div className="mt-3 space-y-3">{assignments.map((assignment) => { const percent = assignment.total ? Math.round((assignment.done / assignment.total) * 100) : 0; return <article key={assignment.id} className={`rounded-[22px] border border-[var(--site-line)] bg-white p-5 shadow-[var(--panel-card-shadow)] ${assignment.isActive ? "" : "opacity-60"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[9.5px] font-bold text-[var(--brand-olive)]">{assignment.groupName}</span>{!assignment.isActive ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9.5px] font-bold text-slate-600">Arşiv</span> : null}</div><h3 className="mt-3 text-sm font-extrabold text-[var(--site-ink)]">{assignment.title}</h3><p className="mt-1 text-xs leading-5 text-[var(--site-body)]">{assignment.description || "Açıklama eklenmedi."}</p>{assignment.outcomes?.length ? <div className="mt-2 flex flex-wrap gap-1">{assignment.outcomes.map((outcome) => <span key={outcome} className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">{outcome}</span>)}</div> : null}{learningOutcomesEnabled && !assignment.outcomes?.length ? <AssignmentOutcomeBackfill assignment={assignment} outcomes={outcomes} onSaved={() => router.refresh()} /> : null}<p className="mt-3 text-[10.5px] font-bold text-[var(--site-muted)]">Son tarih: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(assignment.dueAt))}</p></div><div className="shrink-0 sm:w-36"><div className="flex items-center justify-between text-[10.5px] font-bold text-[var(--site-muted)]"><span>Tamamlandı</span><span>{assignment.done}/{assignment.total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--site-bg-warm)]"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} /></div>{assignment.isActive ? <button type="button" disabled={busy === assignment.id} onClick={() => void run(assignment.id, () => request(`/api/panel/assignments/${assignment.id}`, "PATCH", { title: assignment.title, description: assignment.description, dueAt: assignment.dueAt, isActive: false }), "Ödev arşivlendi.")} className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--site-muted)] hover:text-rose-700"><Archive size={12} /> Arşivle</button> : <span className="mt-3 flex items-center gap-1 text-[10.5px] font-bold text-emerald-700"><CheckCircle2 size={12} /> Kayıt korunuyor</span>}</div></div></article>; })}{!assignments.length ? <p className="rounded-[22px] border border-dashed border-[var(--site-line)] p-8 text-center text-sm text-[var(--site-muted)]">Henüz ödev oluşturmadınız.</p> : null}</div>
    </section>
  </div>;
}
