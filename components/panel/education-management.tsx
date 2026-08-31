"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ChevronDown, Pencil, UsersRound } from "lucide-react";

type Person = { id: string; name: string };
type Group = {
  id: string;
  name: string;
  subject: string;
  level: string;
  teacherId: string;
  teacherName: string;
  isActive: boolean;
  capacity: number;
  studentCount: number;
};
type Lesson = {
  id: string;
  title: string;
  startsAt: string;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  groupName: string;
  teacherName: string;
};

async function patch(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
}

function localInput(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function EducationManagement({
  groups,
  lessons,
  teachers,
}: {
  groups: Group[];
  lessons: Lesson[];
  teachers: Person[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(id: string, action: () => Promise<void>, success: string) {
    setBusy(id);
    setMessage("");
    try {
      await action();
      setMessage(success);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Grup yönetimi</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Meta bilgileri güncelle, detay ekrandan öğrenci yönet.</p>
          </div>
          <span className="text-xs font-bold text-[var(--site-muted)]">{groups.length} grup</span>
        </div>
        <div className="mt-3 space-y-2">
          {groups.map((group) => (
            <details key={group.id} className="group rounded-[14px] border border-[var(--site-line)] bg-white shadow-[var(--panel-card-shadow)]">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${group.isActive ? "bg-[#e5efe2] text-[#365630]" : "bg-slate-100 text-slate-500"}`}>
                  <UsersRound size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-bold text-[var(--site-ink)]">{group.name}</span>
                    {!group.isActive ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">Kapalı</span> : null}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-[var(--site-muted)]">
                    {group.subject} · {group.teacherName} · {group.studentCount}/{group.capacity}
                  </span>
                </span>
                <ChevronDown size={16} className="text-[var(--site-muted)] transition group-open:rotate-180" />
              </summary>

              <form
                className="border-t border-[var(--site-line)] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void run(
                    group.id,
                    () =>
                      patch(`/api/panel/groups/${group.id}`, {
                        action: "UPDATE_META",
                        name: data.get("name"),
                        subject: data.get("subject"),
                        level: data.get("level"),
                      }),
                    "Grup bilgileri güncellendi.",
                  );
                }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="name" required defaultValue={group.name} className="panel-input" aria-label="Grup adı" />
                  <input name="subject" required defaultValue={group.subject} className="panel-input" aria-label="Ders" />
                  <input name="level" defaultValue={group.level} className="panel-input" aria-label="Seviye" placeholder="Seviye" />
                  <select name="teacherId" defaultValue={group.teacherId} className="panel-input" aria-label="Öğretmen" disabled>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/panel/yonetim/gruplar/${group.id}`} className="panel-text-link">
                    Grup detayını aç
                  </Link>
                  <button disabled={busy === group.id} className="panel-quick-action panel-quick-action-primary">
                    <Pencil size={14} />
                    {busy === group.id ? "Kaydediliyor" : "Kaydet"}
                  </button>
                </div>
              </form>
            </details>
          ))}
          {!groups.length ? <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-6 text-center text-sm text-[var(--site-muted)]">Henüz grup yok.</p> : null}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Ders yönetimi</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Tek ders veya seri kapsamıyla güncelle</p>
          </div>
          <span className="text-xs font-bold text-[var(--site-muted)]">{lessons.length} ders</span>
        </div>
        <div className="mt-3 space-y-2">
          {lessons.map((lesson) => (
            <details key={lesson.id} className="group rounded-[14px] border border-[var(--site-line)] bg-white shadow-[var(--panel-card-shadow)]">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f2fa] text-[#24527c]">
                  <CalendarClock size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[var(--site-ink)]">{lesson.title}</span>
                  <span className="mt-1 block truncate text-[11px] text-[var(--site-muted)]">
                    {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(lesson.startsAt))} · {lesson.groupName}
                  </span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${lesson.status === "CANCELLED" ? "bg-rose-50 text-rose-700" : lesson.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                  {lesson.status === "CANCELLED" ? "İptal" : lesson.status === "COMPLETED" ? "Tamamlandı" : "Planlı"}
                </span>
                <ChevronDown size={16} className="text-[var(--site-muted)] transition group-open:rotate-180" />
              </summary>
              <form
                className="border-t border-[var(--site-line)] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const action = String(data.get("action") || "UPDATE");
                  const scope = String(data.get("scope") || "ONE");
                  const willCancel = action === "CANCEL" || (lesson.status !== "CANCELLED" && data.get("status") === "CANCELLED");
                  if (willCancel && !window.confirm("Bu ders iptal edilsin mi?")) return;
                  void run(
                    lesson.id,
                    async () => {
                      if (action === "CANCEL") {
                        await patch(`/api/panel/lessons/${lesson.id}`, { action: "CANCEL", scope });
                        return;
                      }
                      if (action === "RESCHEDULE") {
                        await patch(`/api/panel/lessons/${lesson.id}`, {
                          action: "RESCHEDULE",
                          scope,
                          startsAt: new Date(String(data.get("startsAt"))).toISOString(),
                        });
                        return;
                      }
                      if (action === "SUBSTITUTE") {
                        await patch(`/api/panel/lessons/${lesson.id}`, {
                          action: "SUBSTITUTE",
                          scope,
                          teacherId: data.get("substituteTeacherId"),
                        });
                        return;
                      }
                      if (action === "MAKE_UP") {
                        await patch(`/api/panel/lessons/${lesson.id}`, {
                          action: "MAKE_UP",
                          startsAt: new Date(String(data.get("startsAt"))).toISOString(),
                          teacherId: data.get("substituteTeacherId") || undefined,
                          title: data.get("title"),
                          meetingUrl: data.get("meetingUrl"),
                        });
                        return;
                      }
                      await patch(`/api/panel/lessons/${lesson.id}`, {
                        action: "UPDATE",
                        scope,
                        title: data.get("title"),
                        startsAt: new Date(String(data.get("startsAt"))).toISOString(),
                        status: data.get("status"),
                        meetingUrl: data.get("meetingUrl"),
                      });
                    },
                    "Ders güncellendi.",
                  );
                }}
              >
                <input name="title" required defaultValue={lesson.title} className="panel-input" aria-label="Ders başlığı" />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input name="startsAt" required type="datetime-local" defaultValue={localInput(lesson.startsAt)} className="panel-input" aria-label="Ders zamanı" />
                  <select name="status" defaultValue={lesson.status} className="panel-input" aria-label="Ders durumu">
                    <option value="PLANNED">Planlı</option>
                    <option value="COMPLETED">Tamamlandı</option>
                    <option value="CANCELLED">İptal</option>
                  </select>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <select name="action" defaultValue="UPDATE" className="panel-input" aria-label="İşlem türü">
                    <option value="UPDATE">Genel güncelleme</option>
                    <option value="RESCHEDULE">Saat değiştir</option>
                    <option value="CANCEL">İptal et</option>
                    <option value="SUBSTITUTE">Öğretmen değiştir</option>
                    <option value="MAKE_UP">Telafi dersi aç</option>
                  </select>
                  <select name="scope" defaultValue="ONE" className="panel-input" aria-label="Kapsam">
                    <option value="ONE">Sadece bu ders</option>
                    <option value="FOLLOWING">Bu ve sonraki dersler</option>
                  </select>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input name="meetingUrl" type="url" className="panel-input" placeholder="https:// toplantı linki" aria-label="Toplantı linki" />
                  <select name="substituteTeacherId" className="panel-input" aria-label="Yeni öğretmen">
                    <option value="">Öğretmen seç</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[10.5px] text-[var(--site-muted)]">{lesson.teacherName}</p>
                  <button disabled={busy === lesson.id} className="panel-quick-action panel-quick-action-primary">
                    <Pencil size={14} />
                    {busy === lesson.id ? "Kaydediliyor" : "Dersi güncelle"}
                  </button>
                </div>
              </form>
            </details>
          ))}
          {!lessons.length ? <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-6 text-center text-sm text-[var(--site-muted)]">Ders bulunmuyor.</p> : null}
        </div>
      </section>

      {message ? <p aria-live="polite" className="xl:col-span-2 rounded-2xl bg-[var(--brand-olive-soft)] px-4 py-3 text-sm font-bold text-[var(--brand-olive)]">{message}</p> : null}
    </div>
  );
}
