"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Clock3, Sparkles, UserCheck } from "lucide-react";

type Attendance = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type Student = { id: string; name: string; note: string; attendance: Attendance };
type LessonData = {
  id: string;
  groupName: string;
  subject: string;
  title: string;
  timeLabel: string;
  topic: string;
  note: string;
  nextGoal: string;
  homework: string;
  previousGoal: string | null;
  students: Student[];
};

const attendanceOptions: { value: Attendance; label: string; active: string }[] = [
  { value: "PRESENT", label: "Burada", active: "bg-emerald-700 text-white" },
  { value: "LATE", label: "Geç", active: "bg-amber-700 text-white" },
  { value: "ABSENT", label: "Yok", active: "bg-rose-700 text-white" },
  { value: "EXCUSED", label: "Mazeret", active: "bg-sky-700 text-white" },
];

export function TeacherLessonWorkspace({ lesson }: { lesson: LessonData }) {
  const [form, setForm] = useState(lesson);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/panel/lessons/${lesson.id}/notes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          note: form.note,
          nextGoal: form.nextGoal,
          homework: form.homework,
          students: form.students.map((student) => ({ studentId: student.id, note: student.note, attendance: student.attendance })),
        }),
      }).catch(() => null);
      setSaveState(response?.ok ? "saved" : "error");
    }, 850);
    return () => window.clearTimeout(timer);
  }, [form, lesson.id]);

  function patchStudent(id: string, patch: Partial<Student>) {
    setForm((current) => ({ ...current, students: current.students.map((student) => student.id === id ? { ...student, ...patch } : student) }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-[28px] border border-[var(--site-line)] bg-white shadow-[0_18px_55px_-35px_rgba(20,20,15,.28)]">
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
          {form.previousGoal ? (
            <button type="button" onClick={() => setForm((current) => ({ ...current, topic: current.topic || current.previousGoal || "" }))} className="group flex w-full items-start gap-3 rounded-2xl border border-[#eadf9e] bg-[#fff9dc] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="rounded-xl bg-white p-2 text-amber-700"><Sparkles size={17} /></span>
              <span><span className="block text-xs font-bold uppercase tracking-[.06em] text-amber-800">Geçen dersten akıllı öneri</span><span className="mt-1 block text-sm leading-6 text-amber-950">{form.previousGoal}</span></span>
            </button>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="panel-label">Bugün ne işlediniz?</span>
              <input value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} className="panel-input mt-2 text-base font-semibold" placeholder="Örn. Üslü ifadelerde dört işlem" />
            </label>
            <label>
              <span className="panel-label">Gruba ortak kısa not</span>
              <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="panel-input mt-2 min-h-28 resize-y" placeholder="Neyi iyi yaptılar, nerede takıldılar?" />
            </label>
            <label>
              <span className="panel-label">Bir sonraki hedef</span>
              <textarea value={form.nextGoal} onChange={(event) => setForm({ ...form, nextGoal: event.target.value })} className="panel-input mt-2 min-h-28 resize-y" placeholder="Sonraki öğretmene ve öğrenciye net yön..." />
            </label>
            <label className="sm:col-span-2">
              <span className="panel-label">Çalışma / ödev</span>
              <input value={form.homework} onChange={(event) => setForm({ ...form, homework: event.target.value })} className="panel-input mt-2" placeholder="Örn. 36–48. sorular, yanlışları işaretle" />
            </label>
          </div>
        </div>
      </section>

      <aside className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div><p className="text-sm font-bold text-[var(--site-ink)]">Öğrenciler</p><p className="mt-0.5 text-xs text-[var(--site-muted)]">Sadece farklıysa not ekleyin</p></div>
          <span className="flex items-center gap-1 rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-olive)]"><UserCheck size={13} /> {form.students.length}/4</span>
        </div>
        {form.students.map((student, index) => (
          <div key={student.id} className="rounded-[22px] border border-[var(--site-line)] bg-white p-4 shadow-[0_10px_35px_-30px_rgba(20,20,15,.35)]">
            <div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold ${["bg-[#dceaf6] text-[#1e3a5f]", "bg-[#fcedb4] text-[#6b5310]", "bg-[#e6e0f0] text-[#3f3463]", "bg-[#d7e5d5] text-[#2f4a2a]"][index % 4]}`}>{student.name.charAt(0)}</span><p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--site-ink)]">{student.name}</p></div>
            <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-[var(--site-bg-warm)] p-1">
              {attendanceOptions.map((option) => <button key={option.value} type="button" aria-label={`${student.name}: ${option.label}`} aria-pressed={student.attendance === option.value} onClick={() => patchStudent(student.id, { attendance: option.value })} className={`rounded-lg px-1 py-2 text-[10px] font-bold transition ${student.attendance === option.value ? option.active : "text-[var(--site-muted)] hover:bg-white"}`}>{option.label}</button>)}
            </div>
            <textarea aria-label={`${student.name} için özel not`} value={student.note} onChange={(event) => patchStudent(student.id, { note: event.target.value })} className="panel-input mt-3 min-h-20 resize-none text-xs" placeholder="Farklı bir durum yoksa boş bırakın…" />
          </div>
        ))}
      </aside>
    </div>
  );
}
