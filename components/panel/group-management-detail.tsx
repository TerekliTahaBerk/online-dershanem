"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Teacher = { id: string; name: string };
type Member = { id: string; name: string; email: string };
type GroupOption = { id: string; name: string; subject: string; filled: number; capacity: number };
type Candidate = { id: string; name: string; email: string; activeGroups: Array<{ id: string; name: string }> };

type GroupPayload = {
  id: string;
  name: string;
  subject: string;
  level: string;
  teacherId: string;
  teacherName: string;
  isActive: boolean;
  capacity: number;
  activeStudentCount: number;
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

export function GroupManagementDetail({
  group,
  teachers,
  members,
  targetGroups,
}: {
  group: GroupPayload;
  teachers: Teacher[];
  members: Member[];
  targetGroups: GroupOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>({});

  const seatLabel = `${group.activeStudentCount}/${group.capacity}`;
  const selectedTeacher = useMemo(() => teachers.find((item) => item.id === group.teacherId)?.id || group.teacherId, [group.teacherId, teachers]);

  async function run(key: string, action: () => Promise<void>, success: string) {
    setBusy(key);
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

  async function searchStudents(nextQuery: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    const response = await fetch(`/api/panel/groups/${group.id}/students?${params.toString()}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Öğrenciler getirilemedi.");
    setCandidates(Array.isArray(body.students) ? body.students : []);
  }

  return (
    <div className="space-y-5">
      <section className="panel-surface p-5">
        <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Grup ayarları</h2>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(
              "meta",
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
          <input name="name" required defaultValue={group.name} className="panel-input" aria-label="Grup adı" />
          <input name="subject" required defaultValue={group.subject} className="panel-input" aria-label="Ders" />
          <input name="level" defaultValue={group.level} className="panel-input" aria-label="Seviye" placeholder="Seviye" />
          <button disabled={busy === "meta"} className="panel-quick-action panel-quick-action-primary justify-center sm:justify-start">
            {busy === "meta" ? "Kaydediliyor" : "Grubu güncelle"}
          </button>
        </form>

        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(
              "teacher",
              () =>
                patch(`/api/panel/groups/${group.id}`, {
                  action: "CHANGE_TEACHER",
                  teacherId: data.get("teacherId"),
                }),
              "Öğretmen değiştirildi.",
            );
          }}
        >
          <select name="teacherId" defaultValue={selectedTeacher} className="panel-input min-w-[220px]" aria-label="Öğretmen">
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <button disabled={busy === "teacher"} className="panel-quick-action panel-quick-action-primary">
            {busy === "teacher" ? "Kaydediliyor" : "Öğretmeni değiştir"}
          </button>
        </form>

        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextState = !group.isActive;
            if (!nextState && !window.confirm("Bu grup kapatılsın mı?")) return;
            void run(
              "active",
              () =>
                patch(`/api/panel/groups/${group.id}`, {
                  action: "SET_ACTIVE",
                  isActive: nextState,
                }),
              nextState ? "Grup tekrar açıldı." : "Grup kapatıldı.",
            );
          }}
        >
          <button disabled={busy === "active"} className="panel-quick-action">
            {busy === "active" ? "İşleniyor" : group.isActive ? "Grubu kapat" : "Grubu tekrar aç"}
          </button>
        </form>
      </section>

      <section className="panel-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Öğrenci yönetimi</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Doluluk: {seatLabel}</p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="panel-input"
              placeholder="Öğrenci ara"
              aria-label="Öğrenci ara"
            />
            <button
              type="button"
              className="panel-quick-action"
              onClick={() => void run("search", () => searchStudents(query), "Arama güncellendi.")}
              disabled={busy === "search"}
            >
              {busy === "search" ? "Aranıyor" : "Ara"}
            </button>
          </div>
        </div>

        {candidates.length ? (
          <div className="mt-3 space-y-2">
            {candidates.map((student) => (
              <div key={student.id} className="rounded-xl border border-[var(--site-line)] p-3">
                <p className="text-xs font-bold text-[var(--site-ink)]">{student.name}</p>
                <p className="text-[11px] text-[var(--site-muted)]">{student.email}</p>
                {student.activeGroups.length ? <p className="mt-1 text-[10.5px] text-[var(--site-muted)]">Aktif gruplar: {student.activeGroups.map((item) => item.name).join(", ")}</p> : null}
                <button
                  type="button"
                  className="panel-quick-action mt-2"
                  onClick={() =>
                    void run(
                      `add-${student.id}`,
                      () =>
                        patch(`/api/panel/groups/${group.id}`, {
                          action: "ADD_STUDENT",
                          studentId: student.id,
                        }),
                      `${student.name} gruba eklendi.`,
                    )
                  }
                  disabled={busy === `add-${student.id}`}
                >
                  {busy === `add-${student.id}` ? "Ekleniyor" : "Gruba ekle"}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-xl border border-[var(--site-line)] p-3">
              <p className="text-xs font-bold text-[var(--site-ink)]">{member.name}</p>
              <p className="text-[11px] text-[var(--site-muted)]">{member.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="panel-quick-action"
                  onClick={() =>
                    void run(
                      `remove-${member.id}`,
                      () =>
                        patch(`/api/panel/groups/${group.id}`, {
                          action: "REMOVE_STUDENT",
                          studentId: member.id,
                        }),
                      `${member.name} gruptan çıkarıldı.`,
                    )
                  }
                  disabled={busy === `remove-${member.id}`}
                >
                  {busy === `remove-${member.id}` ? "Çıkarılıyor" : "Gruptan çıkar"}
                </button>
                <select
                  value={transferTarget[member.id] || ""}
                  onChange={(event) => setTransferTarget((current) => ({ ...current, [member.id]: event.target.value }))}
                  className="panel-input min-w-[220px]"
                >
                  <option value="">Hedef grup seç</option>
                  {targetGroups.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name} · {target.filled}/{target.capacity}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="panel-quick-action panel-quick-action-primary"
                  onClick={() => {
                    const targetGroupId = transferTarget[member.id];
                    if (!targetGroupId) return setMessage("Önce hedef grup seçin.");
                    void run(
                      `transfer-${member.id}`,
                      () =>
                        patch(`/api/panel/groups/${group.id}`, {
                          action: "TRANSFER_STUDENT",
                          studentId: member.id,
                          targetGroupId,
                        }),
                      `${member.name} başka gruba taşındı.`,
                    );
                  }}
                  disabled={busy === `transfer-${member.id}`}
                >
                  {busy === `transfer-${member.id}` ? "Taşınıyor" : "Başka gruba taşı"}
                </button>
              </div>
            </div>
          ))}
          {!members.length ? <p className="text-xs text-[var(--site-muted)]">Aktif öğrenci yok.</p> : null}
        </div>
      </section>

      {message ? <p className="rounded-xl bg-[var(--brand-olive-soft)] px-3 py-2 text-xs font-bold text-[var(--brand-olive)]">{message}</p> : null}
    </div>
  );
}
