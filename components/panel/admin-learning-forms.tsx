"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Link2, UsersRound } from "lucide-react";

type Person = { id: string; name: string };
type Student = Person;
type Group = Person & { subject: string };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
}

export function AdminLearningForms({ teachers, students, parents, groups }: { teachers: Person[]; students: Student[]; parents: Person[]; groups: Group[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(action: () => Promise<void>, success: string) {
    setBusy(true); setMessage("");
    try { await action(); setMessage(success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı."); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <form id="yeni-grup" className="panel-action-card scroll-mt-28" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const selected = data.getAll("studentIds").map(String); void submit(() => post("/api/panel/groups", { name: data.get("name"), subject: data.get("subject"), level: data.get("level"), teacherId: data.get("teacherId"), studentIds: selected }), "Grup hazır."); }}>
        <span className="panel-action-icon bg-[#eaf1e8] text-[#2f4a2a]"><UsersRound size={19} /></span><h2 className="panel-card-title">Yeni grup</h2><p className="panel-card-copy">En fazla dört öğrenciyi aynı öğretmenle eşleştirin.</p>
        <input name="name" required className="panel-input mt-4" placeholder="Grup adı" /><div className="mt-2 grid grid-cols-2 gap-2"><input name="subject" required className="panel-input" placeholder="Ders" /><input name="level" className="panel-input" placeholder="Seviye" /></div>
        <select name="teacherId" required className="panel-input mt-2"><option value="">Öğretmen seçin</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <div className="mt-3 grid gap-1.5">{students.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--site-line)] px-3 py-2 text-xs"><input type="checkbox" name="studentIds" value={item.id} />{item.name}</label>)}</div>
        <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">Grubu kur</button>
      </form>

      <form id="ders-planla" className="panel-action-card scroll-mt-28" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const local = String(data.get("startsAt"));
        const weekdays = data.getAll("weekdays").map((value) => Number(value)).filter((n) => n >= 1 && n <= 7);
        const mode = weekdays.length || Number(data.get("repeatWeeks")) > 1 ? "SERIES" : "SINGLE";
        const starts = new Date(local);
        const time = `${String(starts.getHours()).padStart(2, "0")}:${String(starts.getMinutes()).padStart(2, "0")}`;
        void submit(() => post("/api/panel/lessons", {
          groupId: data.get("groupId"),
          title: data.get("title"),
          startsAt: starts.toISOString(),
          meetingUrl: data.get("meetingUrl"),
          mode,
          repeatWeeks: Number(data.get("repeatWeeks")) || 1,
          weekdays,
          startsAtTime: time,
          durationMinutes: 60,
          totalOccurrences: weekdays.length
            ? Number(data.get("totalOccurrences")) || 8
            : Number(data.get("repeatWeeks")) || 1,
        }), "Ders takvime eklendi.");
      }}>
        <span className="panel-action-icon bg-[#ecf3fa] text-[#1e3a5f]"><CalendarPlus size={19} /></span>
        <h2 className="panel-card-title">Ders planla</h2>
        <p className="panel-card-copy">Tek ders veya belirli günlerde tekrarlayan seri. Saat Europe/Istanbul.</p>
        <select name="groupId" required className="panel-input mt-4"><option value="">Grup seçin</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.subject}</option>)}</select>
        <input name="title" required className="panel-input mt-2" placeholder="Ders başlığı" />
        <input name="startsAt" required type="datetime-local" className="panel-input mt-2" />
        <input name="meetingUrl" type="url" className="panel-input mt-2" placeholder="Canlı ders bağlantısı (opsiyonel)" />
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {[
            [1, "Pzt"],
            [2, "Sal"],
            [3, "Çar"],
            [4, "Per"],
            [5, "Cum"],
            [6, "Cmt"],
            [7, "Paz"],
          ].map(([value, label]) => (
            <label key={String(value)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--site-line)] px-2 py-1">
              <input type="checkbox" name="weekdays" value={String(value)} />
              {label}
            </label>
          ))}
        </div>
        <select name="repeatWeeks" defaultValue="1" className="panel-input mt-2">
          <option value="1">Yalnızca bu ders / seçili gün serisi</option>
          <option value="4">4 hafta tekrarla</option>
          <option value="8">8 hafta tekrarla</option>
          <option value="12">12 hafta tekrarla</option>
        </select>
        <select name="totalOccurrences" defaultValue="8" className="panel-input mt-2">
          <option value="4">4 oluşum</option>
          <option value="8">8 oluşum</option>
          <option value="12">12 oluşum</option>
          <option value="16">16 oluşum</option>
        </select>
        <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">Dersi planla</button>
      </form>

      <form className="panel-action-card" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit(() => post("/api/panel/relationships", { parentId: data.get("parentId"), studentId: data.get("studentId"), relationship: data.get("relationship") }), "Veli bağlantısı hazır."); }}>
        <span className="panel-action-icon bg-[#f1edf8] text-[#3f3463]"><Link2 size={19} /></span><h2 className="panel-card-title">Veli bağla</h2><p className="panel-card-copy">Anne ve baba aynı öğrenciye ayrı ayrı bağlanabilir.</p>
        <select name="parentId" required className="panel-input mt-4"><option value="">Veli seçin</option>{parents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="studentId" required className="panel-input mt-2"><option value="">Öğrenci seçin</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="relationship" className="panel-input mt-2" placeholder="Yakınlık (anne, baba…)" />
        <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">Bağlantıyı kur</button>
      </form>
      {message ? <p aria-live="polite" className="xl:col-span-3 rounded-xl bg-[var(--brand-olive-soft)] px-4 py-3 text-sm font-semibold text-[var(--brand-olive)]">{message}</p> : null}
    </div>
  );
}
