"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";

type Filters = { q: string; rol: string; urun: string; durum: string };
type GroupOption = { id: string; name: string; teacherName: string };
type TeacherOption = { id: string; name: string; email: string; isCoach: boolean };
type OwnerOption = { id: string; role: UserRole; name: string; email: string };

type BulkPreview = {
  mode: "PREVIEW";
  action: "RESEND_INVITE" | "TRANSFER_STUDENTS_TO_GROUP" | "OFFBOARD_TEACHERS";
  matched: number;
  capped: boolean;
  sample: Array<{ id: string; name: string; email: string; role: UserRole }>;
};

type BulkExecute = {
  mode: "EXECUTE";
  action: "RESEND_INVITE" | "TRANSFER_STUDENTS_TO_GROUP" | "OFFBOARD_TEACHERS";
  matched: number;
  succeeded: number;
  failed: number;
  capped: boolean;
  invites?: Array<{ id: string; email: string; url: string; message: string; expiresAt: string }>;
  errors: Array<{ id: string; email: string; reason: string }>;
};

export function UserBulkOperations({
  filters,
  total,
  groups,
  teachers,
  interventionOwners,
}: {
  filters: Filters;
  total: number;
  groups: GroupOption[];
  teachers: TeacherOption[];
  interventionOwners: OwnerOption[];
}) {
  const router = useRouter();
  const [action, setAction] = useState<"RESEND_INVITE" | "TRANSFER_STUDENTS_TO_GROUP" | "OFFBOARD_TEACHERS">(
    "RESEND_INVITE",
  );
  const [targetGroupId, setTargetGroupId] = useState("");
  const [transferTeacherId, setTransferTeacherId] = useState("");
  const [transferCoachTeacherId, setTransferCoachTeacherId] = useState("");
  const [transferInterventionOwnerId, setTransferInterventionOwnerId] = useState("");
  const [busy, setBusy] = useState<"preview" | "execute" | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [result, setResult] = useState<BulkExecute | null>(null);

  const coachTeachers = useMemo(() => teachers.filter((teacher) => teacher.isCoach), [teachers]);

  async function call(mode: "PREVIEW" | "EXECUTE") {
    if (mode === "EXECUTE") {
      const confirmation =
        action === "OFFBOARD_TEACHERS"
          ? "Seçili öğretmenler devredilip askıya alınacak. Devam edilsin mi?"
          : action === "TRANSFER_STUDENTS_TO_GROUP"
            ? "Seçili öğrenciler hedef gruba taşınacak. Devam edilsin mi?"
            : "Seçili hesapların daveti yenilenecek ve açık oturumları kapanacak. Devam edilsin mi?";
      if (!window.confirm(confirmation)) return;
    }
    setBusy(mode === "PREVIEW" ? "preview" : "execute");
    setError("");
    if (mode === "PREVIEW") {
      setResult(null);
    }

    const response = await fetch("/api/panel/users/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode,
        action,
        filters,
        options: {
          targetGroupId: targetGroupId || undefined,
          transferTeacherId: transferTeacherId || undefined,
          transferCoachTeacherId: transferCoachTeacherId || undefined,
          transferInterventionOwnerId: transferInterventionOwnerId || undefined,
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok || !payload) {
      setError((payload as { error?: string } | null)?.error || "Toplu işlem tamamlanamadı.");
      return;
    }

    if (mode === "PREVIEW") {
      setPreview(payload as BulkPreview);
      return;
    }
    setResult(payload as BulkExecute);
    router.refresh();
  }

  const needsGroup = action === "TRANSFER_STUDENTS_TO_GROUP";
  const needsTeacher = action === "OFFBOARD_TEACHERS";
  const canPreview =
    (needsGroup ? Boolean(targetGroupId) : true) && (needsTeacher ? Boolean(transferTeacherId) : true);

  return (
    <section className="rounded-[14px] border border-[#DDE4E0] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] font-bold text-dc-ink">Toplu operasyon</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
          Filtre sonucu: {total} kayıt
        </span>
      </div>
      <p className="mt-1 text-[12px] text-dc-ink-muted">
        Tek tek işlem yerine, filtrelenmiş kayıtlar üzerinde güvenli toplu aksiyon çalıştırın.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-[12px] font-semibold text-dc-ink-faint">
          Aksiyon
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value as typeof action);
              setPreview(null);
              setResult(null);
              setError("");
            }}
            className="panel-input mt-1 py-2 text-xs"
          >
            <option value="RESEND_INVITE">Davetleri tekrar gönder</option>
            <option value="TRANSFER_STUDENTS_TO_GROUP">Öğrencileri başka gruba taşı</option>
            <option value="OFFBOARD_TEACHERS">Öğretmenleri güvenli devirle askıya al</option>
          </select>
        </label>

        {needsGroup ? (
          <label className="text-[12px] font-semibold text-dc-ink-faint">
            Hedef grup
            <select
              value={targetGroupId}
              onChange={(event) => setTargetGroupId(event.target.value)}
              className="panel-input mt-1 py-2 text-xs"
            >
              <option value="">Grup seçin</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {group.teacherName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {needsTeacher ? (
          <>
            <label className="text-[12px] font-semibold text-dc-ink-faint">
              Grup/ders devri
              <select
                value={transferTeacherId}
                onChange={(event) => {
                  const next = event.target.value;
                  setTransferTeacherId(next);
                  if (!transferCoachTeacherId) setTransferCoachTeacherId(next);
                  if (!transferInterventionOwnerId) setTransferInterventionOwnerId(next);
                }}
                className="panel-input mt-1 py-2 text-xs"
              >
                <option value="">Öğretmen seçin</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-semibold text-dc-ink-faint">
              Koç devri (opsiyonel)
              <select
                value={transferCoachTeacherId}
                onChange={(event) => setTransferCoachTeacherId(event.target.value)}
                className="panel-input mt-1 py-2 text-xs"
              >
                <option value="">Aynı öğretmen kullanılacak</option>
                {coachTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-semibold text-dc-ink-faint">
              Müdahale sorumluluğu (opsiyonel)
              <select
                value={transferInterventionOwnerId}
                onChange={(event) => setTransferInterventionOwnerId(event.target.value)}
                className="panel-input mt-1 py-2 text-xs"
              >
                <option value="">Aynı öğretmen kullanılacak</option>
                {interventionOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} ({owner.role === "ADMIN" ? "Yönetici" : "Eğitmen"})
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canPreview || busy !== null}
          onClick={() => void call("PREVIEW")}
          className="rounded-[10px] border border-[#DDE4E0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-dc-ink hover:border-dc-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "preview" ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Önizleniyor
            </span>
          ) : (
            "Önizleme al"
          )}
        </button>
        <button
          type="button"
          disabled={!preview || preview.matched < 1 || busy !== null}
          onClick={() => void call("EXECUTE")}
          className="rounded-[10px] bg-dc-brand px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-dc-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "execute" ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Çalışıyor
            </span>
          ) : (
            "Toplu işlemi çalıştır"
          )}
        </button>
      </div>

      {error ? <p className="mt-2 text-[12px] font-semibold text-[#C2493D]">{error}</p> : null}

      {preview ? (
        <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
          <p className="font-semibold">
            Önizleme: {preview.matched} kayıt eşleşti{preview.capped ? " (ilk 500 kayıtla sınırlı)" : ""}.
          </p>
          {preview.sample.length ? (
            <p className="mt-1">
              Örnek: {preview.sample.map((row) => `${row.name} (${row.email})`).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-[10px] border border-[#DDE4E0] bg-slate-50 p-3 text-[12px] text-dc-ink">
          <p className="font-semibold">
            Sonuç: {result.succeeded} başarılı, {result.failed} başarısız
            {result.capped ? " (ilk 500 kayıt işlendi)" : ""}.
          </p>
          {result.errors.length ? (
            <p className="mt-1 text-[#C2493D]">
              Hata örnekleri: {result.errors.slice(0, 5).map((item) => `${item.email}: ${item.reason}`).join(" · ")}
            </p>
          ) : null}
          {result.invites?.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold">Üretilen davet bağlantıları ({result.invites.length})</summary>
              <textarea
                readOnly
                value={result.invites
                  .map((invite) => `${invite.email}\n${invite.url}\n${invite.message}`)
                  .join("\n\n---\n\n")}
                className="mt-2 min-h-[160px] w-full rounded-lg border border-[#DDE4E0] bg-white p-2 font-mono text-[11px]"
              />
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
