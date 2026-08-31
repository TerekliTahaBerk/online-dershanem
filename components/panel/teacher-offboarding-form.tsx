"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string; email: string };
type Preview = {
  blockers: Array<{ code: string; label: string; count: number }>;
  counts: {
    activeGroups: number;
    upcomingLessons: number;
    pendingLessonClosures: number;
    openHelpRequests: number;
    coachAssignments: number;
    openInterventions: number;
  };
  options: {
    teacherTransfers: Array<Option & { isCoach: boolean }>;
    coachTransfers: Option[];
    interventionOwners: Array<Option & { role: "ADMIN" | "TEACHER" }>;
  };
};

export function TeacherOffboardingForm({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [transferTeacherId, setTransferTeacherId] = useState("");
  const [transferCoachTeacherId, setTransferCoachTeacherId] = useState("");
  const [transferInterventionOwnerId, setTransferInterventionOwnerId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const response = await fetch(`/api/panel/users/${teacherId}/offboarding`);
      const result = await response.json().catch(() => null);
      if (!response.ok || !result) {
        if (!cancelled) {
          setError("Offboarding verisi okunamadı.");
          setLoading(false);
        }
        return;
      }
      if (cancelled) return;
      setPreview(result);
      const defaultTeacher = result.options.teacherTransfers[0]?.id || "";
      setTransferTeacherId(defaultTeacher);
      setTransferCoachTeacherId(result.options.coachTransfers[0]?.id || defaultTeacher);
      setTransferInterventionOwnerId(result.options.interventionOwners[0]?.id || defaultTeacher);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  async function execute() {
    if (!transferTeacherId) return;
    if (!window.confirm("Öğretmen devredilip askıya alınacak. Devam edilsin mi?")) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/panel/users/${teacherId}/offboarding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        transferTeacherId,
        transferCoachTeacherId: transferCoachTeacherId || undefined,
        transferInterventionOwnerId: transferInterventionOwnerId || undefined,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Offboarding tamamlanamadı.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  if (loading) return <p className="text-[12.5px] text-dc-ink-faint">Offboarding özeti hazırlanıyor…</p>;
  if (!preview) return <p className="text-[12.5px] text-[#C2493D]">{error || "Offboarding verisi bulunamadı."}</p>;

  return (
    <div className="space-y-3">
      {preview.blockers.length ? (
        <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3">
          <p className="text-[12.5px] font-semibold text-amber-900">
            Askıya alma için önce aşağıdaki sorumluluklar devredilecek:
          </p>
          <p className="mt-1 text-[12px] text-amber-800">
            {preview.blockers.map((b) => `${b.label} (${b.count})`).join(" · ")}
          </p>
        </div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-[12px] font-semibold text-dc-ink-faint">
          Grup/ders devri
          <select
            value={transferTeacherId}
            onChange={(event) => setTransferTeacherId(event.target.value)}
            className="panel-input mt-1 py-2 text-xs"
          >
            <option value="">Öğretmen seçin</option>
            {preview.options.teacherTransfers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </label>
        {preview.counts.coachAssignments > 0 ? (
          <label className="text-[12px] font-semibold text-dc-ink-faint">
            Koç atamaları devri
            <select
              value={transferCoachTeacherId}
              onChange={(event) => setTransferCoachTeacherId(event.target.value)}
              className="panel-input mt-1 py-2 text-xs"
            >
              <option value="">Koç öğretmen seçin</option>
              {preview.options.coachTransfers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {preview.counts.openInterventions > 0 ? (
          <label className="text-[12px] font-semibold text-dc-ink-faint">
            Müdahale sorumluluğu devri
            <select
              value={transferInterventionOwnerId}
              onChange={(event) => setTransferInterventionOwnerId(event.target.value)}
              className="panel-input mt-1 py-2 text-xs"
            >
              <option value="">Sorumlu seçin</option>
              {preview.options.interventionOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <button
        type="button"
        disabled={busy || !transferTeacherId}
        onClick={() => void execute()}
        className="rounded-[10px] bg-[#C2493D] px-3.5 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Devrediliyor..." : "Devret ve askıya al"}
      </button>
      {error ? <p className="text-[12px] text-[#C2493D]">{error}</p> : null}
    </div>
  );
}
