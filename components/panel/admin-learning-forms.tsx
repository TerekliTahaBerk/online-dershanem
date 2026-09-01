"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Link2, UsersRound } from "lucide-react";

type Person = { id: string; name: string };
type Student = Person;
type Group = Person & { subject: string };

type SeriesPreview = {
  count: number;
  hasConflicts: boolean;
  conflicts: Array<{ occurrenceIndex: number; message: string }>;
  occurrences: Array<{ startsAt: string; label: string }>;
};

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
  return result;
}

export function AdminLearningForms({
  teachers,
  students,
  parents,
  groups,
}: {
  teachers: Person[];
  students: Student[];
  parents: Person[];
  groups: Group[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [targetType, setTargetType] = useState<"GROUP" | "STUDENT">("GROUP");
  const [preview, setPreview] = useState<SeriesPreview | null>(null);

  async function submit(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      setPreview(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  function buildLessonPayload(data: FormData) {
    const local = String(data.get("startsAt"));
    const weekdays = data
      .getAll("weekdays")
      .map((value) => Number(value))
      .filter((n) => n >= 1 && n <= 7);
    const mode = weekdays.length || Number(data.get("repeatWeeks")) > 1 ? "SERIES" : "SINGLE";
    const starts = new Date(local);
    const time = `${String(starts.getHours()).padStart(2, "0")}:${String(starts.getMinutes()).padStart(2, "0")}`;
    return {
      targetType,
      groupId: targetType === "GROUP" ? data.get("groupId") : undefined,
      studentId: targetType === "STUDENT" ? data.get("studentId") : undefined,
      teacherId: targetType === "STUDENT" ? data.get("teacherId") : undefined,
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
    };
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <form
        id="yeni-grup"
        className="panel-action-card scroll-mt-28"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const selected = data.getAll("studentIds").map(String);
          void submit(
            () =>
              post("/api/panel/groups", {
                name: data.get("name"),
                subject: data.get("subject"),
                level: data.get("level"),
                teacherId: data.get("teacherId"),
                studentIds: selected,
              }),
            "Grup hazır.",
          );
        }}
      >
        <span className="panel-action-icon bg-[#eaf1e8] text-[#2f4a2a]">
          <UsersRound size={19} />
        </span>
        <h2 className="panel-card-title">Yeni grup</h2>
        <p className="panel-card-copy">En fazla dört öğrenciyi aynı öğretmenle eşleştirin.</p>
        <input name="name" required className="panel-input mt-4" placeholder="Grup adı" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input name="subject" required className="panel-input" placeholder="Ders" />
          <input name="level" className="panel-input" placeholder="Seviye" />
        </div>
        <select name="teacherId" required className="panel-input mt-2">
          <option value="">Öğretmen seçin</option>
          {teachers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="mt-3 grid gap-1.5">
          {students.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--site-line)] px-3 py-2 text-xs"
            >
              <input type="checkbox" name="studentIds" value={item.id} />
              {item.name}
            </label>
          ))}
        </div>
        <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">
          Grubu kur
        </button>
      </form>

      <form
        id="ders-planla"
        className="panel-action-card scroll-mt-28"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void submit(() => post("/api/panel/lessons", buildLessonPayload(data)), "Ders takvime eklendi.");
        }}
      >
        <span className="panel-action-icon bg-[#ecf3fa] text-[#1e3a5f]">
          <CalendarPlus size={19} />
        </span>
        <h2 className="panel-card-title">Ders planla</h2>
        <p className="panel-card-copy">Grup veya bireysel öğrenci. Seri için önizleme alın.</p>
        <div className="mt-4 flex gap-2 text-xs font-semibold">
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 ${targetType === "GROUP" ? "border-dc-brand bg-dc-brand-soft" : "border-[var(--site-line)]"}`}
            onClick={() => {
              setTargetType("GROUP");
              setPreview(null);
            }}
          >
            Grup
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 ${targetType === "STUDENT" ? "border-dc-brand bg-dc-brand-soft" : "border-[var(--site-line)]"}`}
            onClick={() => {
              setTargetType("STUDENT");
              setPreview(null);
            }}
          >
            Öğrenci
          </button>
        </div>
        {targetType === "GROUP" ? (
          <select name="groupId" required className="panel-input mt-2">
            <option value="">Grup seçin</option>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.subject}
              </option>
            ))}
          </select>
        ) : (
          <>
            <select name="studentId" required className="panel-input mt-2">
              <option value="">Öğrenci seçin</option>
              {students.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select name="teacherId" required className="panel-input mt-2">
              <option value="">Öğretmen seçin</option>
              {teachers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </>
        )}
        <input name="title" required className="panel-input mt-2" placeholder="Ders başlığı" />
        <input name="startsAt" required type="datetime-local" className="panel-input mt-2" />
        <input
          name="meetingUrl"
          type="url"
          className="panel-input mt-2"
          placeholder="Canlı ders bağlantısı (opsiyonel)"
        />
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
            <label
              key={String(value)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--site-line)] px-2 py-1"
            >
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
        <button
          type="button"
          disabled={busy}
          className="site-btn site-btn-secondary site-btn-sm mt-3 w-full"
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (!form) return;
            const data = new FormData(form);
            setBusy(true);
            setMessage("");
            void post("/api/panel/lessons/preview-series", buildLessonPayload(data))
              .then((result) => setPreview(result as SeriesPreview))
              .catch((error) =>
                setMessage(error instanceof Error ? error.message : "Önizleme alınamadı."),
              )
              .finally(() => setBusy(false));
          }}
        >
          Seriyi önizle
        </button>
        {preview ? (
          <div className="mt-3 rounded-xl border border-[var(--site-line)] bg-white p-3 text-xs">
            <p className="font-bold text-[var(--site-ink)]">
              {preview.count} ders oluşacak
              {preview.hasConflicts ? " · çakışma var" : " · çakışma yok"}
            </p>
            <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-[var(--site-muted)]">
              {preview.occurrences.slice(0, 8).map((item) => (
                <li key={item.startsAt}>{item.label}</li>
              ))}
            </ul>
            {preview.conflicts.length ? (
              <p className="mt-2 font-semibold text-[#b42318]">
                {preview.conflicts[0]?.message}
              </p>
            ) : null}
          </div>
        ) : null}
        <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">
          Dersi planla
        </button>
      </form>

      <form
        className="panel-action-card"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void submit(
            () =>
              post("/api/panel/relationships", {
                parentId: data.get("parentId"),
                studentId: data.get("studentId"),
                relationship: data.get("relationship"),
                primaryContact: data.get("primaryContact") === "on",
                canViewAcademic: data.get("canViewAcademic") === "on",
                canViewPayments: data.get("canViewPayments") === "on",
              }),
            "Veli bağlantısı hazır.",
          );
        }}
      >
        <span className="panel-action-icon bg-[#f1edf8] text-[#3f3463]">
          <Link2 size={19} />
        </span>
        <h2 className="panel-card-title">Veli bağla</h2>
        <p className="panel-card-copy">Anne ve baba aynı öğrenciye ayrı ayrı bağlanabilir.</p>
        <select name="parentId" required className="panel-input mt-4">
          <option value="">Veli seçin</option>
          {parents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="studentId" required className="panel-input mt-2">
          <option value="">Öğrenci seçin</option>
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="relationship" className="panel-input mt-2" defaultValue="Anne">
          <option value="Anne">Anne</option>
          <option value="Baba">Baba</option>
          <option value="Vasi">Vasi</option>
          <option value="Diğer">Diğer</option>
        </select>
        <label className="mt-2 flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" name="primaryContact" /> Birincil iletişim
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" name="canViewAcademic" defaultChecked /> Akademik görünüm
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" name="canViewPayments" /> Ödeme görünümü
        </label>
        <button disabled={busy} className="site-btn site-btn-primary site-btn-sm mt-4 w-full">
          Bağlantıyı kur
        </button>
      </form>
      {message ? (
        <p
          aria-live="polite"
          className="xl:col-span-3 rounded-xl bg-[var(--brand-olive-soft)] px-4 py-3 text-sm font-semibold text-[var(--brand-olive)]"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
