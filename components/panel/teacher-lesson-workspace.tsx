"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, CircleAlert, ClipboardPlus, Clock3, Eye, Save, Sparkles, Trash2, UserCheck, UsersRound } from "lucide-react";
import { sendPanelEvent } from "@/lib/panel-event-client";
import { OutcomePicker, type OutcomeOption, type SelectedOutcome } from "@/components/panel/outcome-picker";
import { useOfflineSync } from "@/components/panel/offline-sync-provider";

type Attendance = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type Student = { id: string; name: string; note: string; attendance: Attendance; supportLabels: string[] };
type NoteTemplate = { id: string; title: string; note: string; nextGoal: string; homework: string };
type LessonData = {
  id: string;
  groupId: string;
  groupName: string;
  subject: string;
  title: string;
  timeLabel: string;
  topic: string;
  note: string;
  nextGoal: string;
  homework: string;
  previousGoal: string | null;
  previousContext: { topic: string | null; nextGoal: string | null; homework: string | null } | null;
  closeVersion: number;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  templates: NoteTemplate[];
  students: Student[];
  outcomeLinks: SelectedOutcome[];
  outcomeSkipReason: "CATALOG_MISSING" | "COMPLETE_LATER" | "NOT_APPLICABLE" | null;
};

function noteSnapshot(value: LessonData): string {
  return JSON.stringify({ topic: value.topic, note: value.note, nextGoal: value.nextGoal, homework: value.homework, students: value.students, outcomeLinks: value.outcomeLinks, outcomeSkipReason: value.outcomeSkipReason });
}

const attendanceOptions: { value: Attendance; label: string; active: string }[] = [
  { value: "PRESENT", label: "Burada", active: "bg-emerald-700 text-white" },
  { value: "LATE", label: "Geç", active: "bg-amber-700 text-white" },
  { value: "ABSENT", label: "Yok", active: "bg-rose-700 text-white" },
  { value: "EXCUSED", label: "Mazeret", active: "bg-sky-700 text-white" },
];

export function TeacherLessonWorkspace({ lesson, baselineMetricsEnabled, learningOutcomesEnabled, quickLessonCloseEnabled, outcomes }: { lesson: LessonData; baselineMetricsEnabled: boolean; learningOutcomesEnabled: boolean; quickLessonCloseEnabled: boolean; outcomes: OutcomeOption[] }) {
  const { submitMutation } = useOfflineSync();
  const [form, setForm] = useState(lesson);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [completed, setCompleted] = useState(lesson.status === "COMPLETED");
  const [actionMessage, setActionMessage] = useState("");
  const [templates, setTemplates] = useState(lesson.templates);
  const [templateTitle, setTemplateTitle] = useState("");
  const [showStudentExceptions, setShowStudentExceptions] = useState(!quickLessonCloseEnabled);
  const [assignmentPreview, setAssignmentPreview] = useState(false);
  const [assignmentRecipients, setAssignmentRecipients] = useState<string[]>([]);
  const first = useRef(true);
  const closeVersion = useRef(lesson.closeVersion);
  const closeIdempotencyKey = useRef<string | null>(null);
  const lastSaved = useRef(noteSnapshot(lesson));
  const telemetry = useRef({
    startedAt: null as number | null,
    interactionCount: 0,
    draftSaveCount: 0,
    templateApplied: false,
    previousGoalUsed: false,
  });
  const dirty = noteSnapshot(form) !== lastSaved.current;
  const exceptionCount = form.students.filter((student) => student.attendance !== "PRESENT" || student.note.trim()).length;

  function recordInteraction() {
    if (!baselineMetricsEnabled) return;
    telemetry.current.interactionCount = Math.min(1000, telemetry.current.interactionCount + 1);
    if (telemetry.current.startedAt !== null) return;
    telemetry.current.startedAt = performance.now();
    if (lesson.status === "COMPLETED") {
      sendPanelEvent({ name: "lesson_close_reopened", properties: { groupSize: lesson.students.length } });
    } else {
      sendPanelEvent({ name: "lesson_close_started", properties: { groupSize: lesson.students.length, initialStatus: "PLANNED" } });
    }
  }

  function patchSharedForm(patch: Partial<Pick<LessonData, "topic" | "note" | "nextGoal" | "homework">>) {
    recordInteraction();
    setForm((current) => ({ ...current, ...patch }));
  }

  const save = useCallback(async (complete: boolean) => {
    if (baselineMetricsEnabled && !complete) telemetry.current.draftSaveCount = Math.min(100, telemetry.current.draftSaveCount + 1);
    setSaveState("saving");
    if (complete && quickLessonCloseEnabled && !closeIdempotencyKey.current) closeIdempotencyKey.current = crypto.randomUUID();
    const assignmentDraft = complete && quickLessonCloseEnabled && assignmentPreview && form.homework.trim() && assignmentRecipients.length ? { title: `${form.topic || form.title} çalışması`, description: form.homework, dueAt: new Date(Date.now() + 7 * 86400000).toISOString(), studentIds: assignmentRecipients } : null;
    const requestBody = { topic: form.topic, note: form.note, nextGoal: form.nextGoal, homework: form.homework, complete, students: form.students.map((student) => ({ studentId: student.id, note: student.note, attendance: student.attendance })), outcomes: learningOutcomesEnabled ? form.outcomeLinks : [], outcomeSkipReason: learningOutcomesEnabled ? form.outcomeSkipReason : null, expectedVersion: quickLessonCloseEnabled ? closeVersion.current : undefined, idempotencyKey: complete && quickLessonCloseEnabled ? closeIdempotencyKey.current : undefined, assignmentDraft };
    const result = await submitMutation({ kind: "LESSON_CLOSE", method: "PUT", url: `/api/panel/lessons/${lesson.id}/notes`, body: requestBody, coalesceKey: `lesson:${lesson.id}` });
    const responseBody = result.body as { error?: string; version?: number; replayed?: boolean; assignmentCreated?: boolean };
    const saved = result.state === "synced";
    const queued = result.state === "queued";
    setSaveState(saved || queued ? "saved" : "error");
    if (!saved && !queued && baselineMetricsEnabled) {
      sendPanelEvent({ name: "lesson_autosave_failed", properties: { groupSize: lesson.students.length, completionAttempt: complete } });
    }
    if (saved || queued) {
      lastSaved.current = noteSnapshot(form);
      if (saved && typeof responseBody?.version === "number") closeVersion.current = responseBody.version;
    }
    if (!saved && !queued && complete) setActionMessage(responseBody?.error || "Ders kapatılamadı; değişiklikleriniz taslakta korunuyor.");
    if (queued) setActionMessage(complete ? "Bağlantı yok; ders kapanışı bu cihazda en fazla 24 saat güvenle bekliyor." : "Bağlantı yok; ders taslağı bu cihazda güvenle bekliyor.");
    if (saved && complete) {
      setCompleted(true);
      setActionMessage(responseBody?.replayed ? "Bu kapanış daha önce güvenle tamamlandı; çift kayıt oluşturulmadı." : responseBody?.assignmentCreated ? `Ders tamamlandı; ödev ${assignmentRecipients.length} öğrenciye gönderildi.` : "Ders tamamlandı; öğrenci ve veli özeti hazır.");
      if (baselineMetricsEnabled) {
        const initialStudents = new Map(lesson.students.map((student) => [student.id, student]));
        const changedStudentCount = form.students.filter((student) => {
          const initial = initialStudents.get(student.id);
          return !initial || initial.note !== student.note || initial.attendance !== student.attendance;
        }).length;
        sendPanelEvent({
          name: "lesson_close_completed",
          properties: {
            durationMs: Math.min(8 * 60 * 60 * 1000, Math.round(telemetry.current.startedAt === null ? 0 : performance.now() - telemetry.current.startedAt)),
            groupSize: form.students.length,
            changedStudentCount,
            privateNoteCount: form.students.filter((student) => student.note.trim()).length,
            filledSharedFieldCount: [form.topic, form.note, form.nextGoal, form.homework].filter((value) => value.trim()).length,
            draftSaveCount: telemetry.current.draftSaveCount,
            interactionCount: telemetry.current.interactionCount,
            templateApplied: telemetry.current.templateApplied,
            previousGoalUsed: telemetry.current.previousGoalUsed,
            quickCloseEnabled: quickLessonCloseEnabled,
            exceptionCount,
            assignmentRecipientCount: assignmentDraft?.studentIds.length || 0,
          },
        });
      }
    }
    return saved;
  }, [assignmentPreview, assignmentRecipients, baselineMetricsEnabled, exceptionCount, form, learningOutcomesEnabled, lesson.id, lesson.students, quickLessonCloseEnabled, submitMutation]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => void save(false), 850);
    return () => window.clearTimeout(timer);
  }, [save]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || saveState === "saving" || saveState === "error") event.preventDefault(); };
    const guardLink = (event: MouseEvent) => {
      if (!dirty && saveState !== "saving" && saveState !== "error") return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      if (!window.confirm("Notlarda henüz güvenli biçimde kaydedilmemiş değişiklikler var. Yine de ayrılmak istiyor musunuz?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardLink, true); };
  }, [dirty, saveState]);

  useEffect(() => {
    const url = `/api/panel/lessons/${lesson.id}/notes`;
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; url: string; body?: { version?: number }; requestBody?: { complete?: boolean } }>).detail;
      if (detail?.kind !== "LESSON_CLOSE" || detail.url !== url) return;
      if (typeof detail.body?.version === "number") closeVersion.current = detail.body.version;
      setSaveState("saved");
      if (detail.requestBody?.complete) { setCompleted(true); setActionMessage("Cihazda bekleyen ders kapanışı güvenle eşitlendi."); }
      else setActionMessage("Cihazda bekleyen ders taslağı güvenle eşitlendi.");
    };
    const conflicted = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; url: string }>).detail;
      if (detail?.kind !== "LESSON_CLOSE" || detail.url !== url) return;
      setSaveState("error"); setActionMessage("Ders başka yerde değişti. Son kaydı açıp cihazdaki değişiklikleri yeniden uygulayın.");
    };
    window.addEventListener("panel-offline-synced", synced); window.addEventListener("panel-offline-conflict", conflicted);
    return () => { window.removeEventListener("panel-offline-synced", synced); window.removeEventListener("panel-offline-conflict", conflicted); };
  }, [lesson.id]);

  async function createAssignment() {
    if (!form.homework.trim()) return setActionMessage("Önce çalışma alanını doldurun.");
    if (!await save(false)) return;
    const response = await fetch("/api/panel/assignments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId: form.groupId, lessonId: form.id, title: `${form.topic || form.title} çalışması`, description: form.homework, dueAt: new Date(Date.now() + 7 * 86400000).toISOString(), outcomeIds: learningOutcomesEnabled ? form.outcomeLinks.map((item) => item.outcomeId) : [], outcomeSkipReason: learningOutcomesEnabled ? form.outcomeSkipReason : null }) });
    setActionMessage(response.ok ? "Çalışma ödeve dönüştürüldü ve öğrencilere gönderildi." : "Ödev oluşturulamadı.");
  }

  function patchStudent(id: string, patch: Partial<Student>) {
    recordInteraction();
    setForm((current) => ({ ...current, students: current.students.map((student) => student.id === id ? { ...student, ...patch } : student) }));
  }

  function markEveryonePresent() {
    recordInteraction();
    setForm((current) => ({ ...current, students: current.students.map((student) => ({ ...student, attendance: "PRESENT" as const })) }));
  }

  function toggleAssignmentPreview() {
    if (!form.homework.trim()) return setActionMessage("Ödev önizlemesi için önce çalışma alanını doldurun.");
    setAssignmentPreview((current) => {
      if (!current && !assignmentRecipients.length) setAssignmentRecipients(form.students.filter((student) => student.attendance === "PRESENT" || student.attendance === "LATE").map((student) => student.id));
      return !current;
    });
  }

  function applyTemplate(template: Pick<NoteTemplate, "note" | "nextGoal" | "homework">) {
    recordInteraction();
    telemetry.current.templateApplied = true;
    setForm((current) => ({ ...current, note: template.note, nextGoal: template.nextGoal, homework: template.homework }));
  }

  function usePreviousGoal() {
    recordInteraction();
    telemetry.current.previousGoalUsed = true;
    setForm((current) => ({ ...current, topic: current.topic || current.previousGoal || "" }));
  }

  async function saveTemplate() {
    if (templateTitle.trim().length < 2) return setActionMessage("Şablona kısa bir ad verin.");
    const response = await fetch("/api/panel/teacher/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: templateTitle, note: form.note, nextGoal: form.nextGoal, homework: form.homework }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setActionMessage(body.error || "Şablon kaydedilemedi.");
    setTemplates((current) => [{ id: body.id, title: body.title, note: body.note || "", nextGoal: body.nextGoal || "", homework: body.homework || "" }, ...current]);
    setTemplateTitle(""); setActionMessage("Kişisel not şablonu kaydedildi.");
  }

  async function deleteTemplate(id: string) {
    const response = await fetch(`/api/panel/teacher/templates/${id}`, { method: "DELETE" });
    if (response.ok) setTemplates((current) => current.filter((template) => template.id !== id));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-[14px] border border-[var(--site-line)] bg-white shadow-[0_18px_55px_-35px_rgba(20,20,15,.28)]">
        <div className="flex flex-col gap-4 border-b border-[var(--site-line)] bg-[linear-gradient(135deg,#f7f8f1_0%,#fff_58%,#fff8dd_100%)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--brand-olive)]">
              <span className="rounded-full bg-[var(--brand-olive-soft)] px-3 py-1">{form.groupName}</span>
              <span className="flex items-center gap-1.5"><Clock3 size={13} /> {form.timeLabel}</span>
            </div>
            <h1 className="mt-3 text-[clamp(1.45rem,3vw,2.15rem)] font-semibold tracking-[-.04em] text-[var(--site-ink)]">{form.title}</h1>
            <p className="mt-1 text-sm text-[var(--site-body)]">{form.subject} · 60 dakikalık ders özeti</p>
          </div>
          <div aria-live="polite" className={`flex min-w-[118px] items-center justify-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold ${saveState === "error" ? "bg-rose-50 text-rose-700" : "bg-white/85 text-[var(--site-body)] shadow-sm"}`}>
            {saveState === "saving" ? <><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />Kaydediliyor</> : null}
            {saveState === "saved" ? <><Check size={14} className="text-emerald-600" />Kaydedildi</> : null}
            {saveState === "error" ? <><CircleAlert size={14} />Tekrar deneyin</> : null}
            {saveState === "idle" ? "Otomatik kayıt açık" : null}
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => applyTemplate({ note: "Grup konuyu genel olarak kavradı; temel kazanımlar pekişiyor.", nextGoal: "Yeni nesil sorularda doğru stratejiyi seçmek.", homework: "Konu tarama çalışmasını tamamla ve yanlışlarını işaretle." })} className="panel-quick-action"><Sparkles size={14} /> Dengeli ders şablonu</button><button type="button" onClick={() => applyTemplate({ note: "Temel adımlarda desteğe ihtiyaç var; birlikte örnek çözümü sürdüreceğiz.", nextGoal: "Temel işlem basamaklarını hatasız uygulamak.", homework: "Kolay düzey 15 soru çöz; takıldığın soruları işaretle." })} className="panel-quick-action">Destek şablonu</button><button type="button" onClick={() => applyTemplate({ note: "Kazanımlar güçlü; hız ve farklı çözüm yollarına odaklanabiliriz.", nextGoal: "Zorlayıcı sorularda süreyi kontrollü kullanmak.", homework: "Orta-zor düzey 20 soru ve süre analizi." })} className="panel-quick-action">İleri seviye</button>{templates.map((template) => <span key={template.id} className="inline-flex overflow-hidden rounded-xl border border-[var(--site-line)]"><button type="button" onClick={() => applyTemplate(template)} className="bg-white px-3 py-2 text-xs font-bold text-[var(--site-body)]">{template.title}</button><button type="button" onClick={() => void deleteTemplate(template.id)} aria-label={`${template.title} şablonunu sil`} className="border-l border-[var(--site-line)] bg-white px-2 text-rose-600"><Trash2 size={12} /></button></span>)}</div>
          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-[var(--site-line)] p-3 sm:flex-row"><input value={templateTitle} onChange={(event) => setTemplateTitle(event.target.value)} className="panel-input flex-1" maxLength={60} placeholder="Mevcut notları şablon olarak adlandır" aria-label="Yeni şablon adı" /><button type="button" onClick={() => void saveTemplate()} className="panel-quick-action"><Save size={14} /> Şablonu kaydet</button></div>
          {form.previousGoal ? (
            <button type="button" onClick={usePreviousGoal} className="group flex w-full items-start gap-3 rounded-2xl border border-[#eadf9e] bg-[#fff9dc] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="rounded-xl bg-white p-2 text-amber-700"><Sparkles size={17} /></span>
              <span><span className="block text-xs font-bold uppercase tracking-[.06em] text-amber-800">Geçen dersten akıllı öneri</span><span className="mt-1 block text-sm leading-6 text-amber-950">{form.previousGoal}</span></span>
            </button>
          ) : null}
          {quickLessonCloseEnabled ? <div className="grid gap-3 rounded-2xl border border-[#dfe7c4] bg-[#f7f9ef] p-4 sm:grid-cols-3" aria-label="Kapanış varsayımları"><div><p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">Grup varsayımı</p><p className="mt-1 text-sm font-bold">Herkes burada</p></div><div><p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">Önceki bağlam</p><p className="mt-1 line-clamp-2 text-sm">{form.previousContext?.nextGoal || "İlk ders; önceki hedef yok"}</p></div><div><p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">Çalışma biçimi</p><p className="mt-1 text-sm">Yalnız farklı olanı düzenleyin</p></div></div> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="panel-label">Bugün ne işlediniz?</span>
              <input value={form.topic} onChange={(event) => patchSharedForm({ topic: event.target.value })} className="panel-input mt-2 text-base font-semibold" placeholder="Örn. Üslü ifadelerde dört işlem" />
            </label>
            <label>
              <span className="panel-label">Gruba ortak kısa not</span>
              <textarea value={form.note} onChange={(event) => patchSharedForm({ note: event.target.value })} className="panel-input mt-2 min-h-28 resize-y" placeholder="Neyi iyi yaptılar, nerede takıldılar?" />
            </label>
            <label>
              <span className="panel-label">Bir sonraki hedef</span>
              <textarea value={form.nextGoal} onChange={(event) => patchSharedForm({ nextGoal: event.target.value })} className="panel-input mt-2 min-h-28 resize-y" placeholder="Sonraki öğretmene ve öğrenciye net yön..." />
            </label>
            <label className="sm:col-span-2">
              <span className="panel-label">Çalışma / ödev</span>
              <input value={form.homework} onChange={(event) => patchSharedForm({ homework: event.target.value })} className="panel-input mt-2" placeholder="Örn. 36–48. sorular, yanlışları işaretle" />
            </label>
          </div>
          {learningOutcomesEnabled ? <><OutcomePicker outcomes={outcomes} value={form.outcomeLinks} onChange={(outcomeLinks) => { recordInteraction(); setForm((current) => ({ ...current, outcomeLinks, outcomeSkipReason: outcomeLinks.length ? null : current.outcomeSkipReason })); }} withEvidence />{!form.outcomeLinks.length ? <label className="block"><span className="panel-label">Kazanım seçmeden devam etme nedeni</span><select value={form.outcomeSkipReason || ""} onChange={(event) => setForm((current) => ({ ...current, outcomeSkipReason: (event.target.value || null) as LessonData["outcomeSkipReason"] }))} className="panel-input mt-2" aria-label="Kazanım erteleme nedeni"><option value="">Dersi tamamlamadan önce seçin</option><option value="COMPLETE_LATER">Sonra tamamlayacağım</option><option value="CATALOG_MISSING">Katalogda uygun kazanım yok</option><option value="NOT_APPLICABLE">Bu ders için uygulanabilir değil</option></select></label> : null}</> : null}
          {quickLessonCloseEnabled && assignmentPreview ? <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4"><div className="flex items-start gap-3"><Eye size={17} className="mt-0.5 text-violet-700" /><div><p className="text-sm font-extrabold text-violet-950">Ödev önizlemesi</p><p className="mt-1 text-xs leading-5 text-violet-900">{form.homework} · 7 gün · yalnız seçilen öğrencilere</p></div></div><div className="mt-3 flex flex-wrap gap-2">{form.students.map((student) => <label key={student.id} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold"><input type="checkbox" checked={assignmentRecipients.includes(student.id)} onChange={() => setAssignmentRecipients((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} />{student.name}</label>)}</div>{!assignmentRecipients.length ? <p className="mt-2 text-xs font-bold text-rose-700">Göndermek için en az bir öğrenci seçin.</p> : null}</div> : null}
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4 sm:flex-row sm:items-center sm:justify-between"><p aria-live="polite" className="text-xs font-bold text-[var(--brand-olive)]">{actionMessage || (completed ? "Bu ders tamamlandı." : "Notlar taslak olarak kaydolur; hazır olduğunuzda tek işlemle kapatın.")}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => quickLessonCloseEnabled ? toggleAssignmentPreview() : void createAssignment()} className="panel-quick-action"><ClipboardPlus size={14} /> {quickLessonCloseEnabled ? (assignmentPreview ? "Ödevi çıkar" : "Ödev taslağını önizle") : "Ödeve dönüştür"}</button><button type="button" disabled={completed || saveState === "saving" || Boolean(quickLessonCloseEnabled && assignmentPreview && !assignmentRecipients.length)} onClick={() => { recordInteraction(); void save(true); }} className="panel-quick-action panel-quick-action-primary"><CheckCircle2 size={14} /> {completed ? "Ders tamamlandı" : quickLessonCloseEnabled ? "Dersi güvenle kapat" : "Dersi tamamla"}</button></div></div>
        </div>
      </section>

      <aside className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div><p className="text-sm font-bold text-[var(--site-ink)]">Öğrenciler</p><p className="mt-0.5 text-xs text-[var(--site-muted)]">{quickLessonCloseEnabled ? `${exceptionCount} istisna · diğerleri burada` : "Sadece farklıysa not ekleyin"}</p></div>
          <span className="flex items-center gap-1 rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-olive)]"><UserCheck size={13} /> {form.students.length}/{form.students.length}</span>
        </div>
        {quickLessonCloseEnabled ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={markEveryonePresent} className="panel-quick-action justify-center"><UsersRound size={14} /> Tümü burada</button><button type="button" onClick={() => setShowStudentExceptions((current) => !current)} className="panel-quick-action justify-center">{showStudentExceptions ? "İstisnaları gizle" : "İstisna ekle"}</button></div> : null}
        {(!quickLessonCloseEnabled || showStudentExceptions || exceptionCount > 0) ? form.students.map((student, index) => (
          <div key={student.id} className="rounded-[14px] border border-[var(--site-line)] bg-white p-4 shadow-[0_10px_35px_-30px_rgba(20,20,15,.35)]">
            <div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold ${["bg-[#dceaf6] text-[#1e3a5f]", "bg-[#fcedb4] text-[#6b5310]", "bg-[#e6e0f0] text-[#3f3463]", "bg-[#d7e5d5] text-[#2f4a2a]"][index % 4]}`}>{student.name.charAt(0)}</span><p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--site-ink)]">{student.name}</p></div>{student.supportLabels.length ? <ul aria-label={`${student.name} işlevsel destekleri`} className="mt-2 flex flex-wrap gap-1">{student.supportLabels.map((label) => <li key={label} className="rounded-full bg-sky-50 px-2 py-1 text-[9px] font-bold text-sky-900">{label}</li>)}</ul> : null}
            <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-[var(--site-bg-warm)] p-1">
              {attendanceOptions.map((option) => <button key={option.value} type="button" aria-label={`${student.name}: ${option.label}`} aria-pressed={student.attendance === option.value} onClick={() => patchStudent(student.id, { attendance: option.value })} className={`rounded-lg px-1 py-2 text-[10px] font-bold transition ${student.attendance === option.value ? option.active : "text-[var(--site-muted)] hover:bg-white"}`}>{option.label}</button>)}
            </div>
            <textarea aria-label={`${student.name} için özel not`} value={student.note} onChange={(event) => patchStudent(student.id, { note: event.target.value })} className="panel-input mt-3 min-h-20 resize-none text-xs" placeholder="Farklı bir durum yoksa boş bırakın…" />
          </div>
        )) : <div className="rounded-[14px] border border-dashed border-[#cbd7a8] bg-[#f8faef] p-5 text-center"><CheckCircle2 size={20} className="mx-auto text-emerald-700" /><p className="mt-2 text-sm font-bold">Grup varsayımı hazır</p><p className="mt-1 text-xs text-[var(--site-muted)]">Farklı bir durum yoksa öğrenci kartlarını açmanız gerekmez.</p></div>}
      </aside>
    </div>
  );
}
