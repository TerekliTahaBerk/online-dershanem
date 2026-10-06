"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock3, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/components/panel/offline-sync-provider";
import { EmptyState, StatusBadge, buttonClass } from "@/components/panel/primitives";

type Status = "TODO" | "IN_PROGRESS" | "DONE";
type Submission = {
  id: string;
  attemptNumber: number;
  status: "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";
  textEvidence: string;
  feedback: string | null;
  scores: {
    criterionId: string;
    level: "NEEDS_WORK" | "DEVELOPING" | "MEETS";
  }[];
};
type Assignment = {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  groupName: string;
  subject: string;
  status: Status;
  version: number;
  evidenceRequired: boolean;
  criteria: { id: string; label: string }[];
  submissions: Submission[];
};

const statusCopy: Record<Status, string> = {
  TODO: "Başlanmadı",
  IN_PROGRESS: "Çalışıyorum",
  DONE: "Tamamlandı",
};

const rubricCopy = {
  NEEDS_WORK: "Bir adım daha",
  DEVELOPING: "Gelişiyor",
  MEETS: "Karşılıyor",
} as const;
export function StudentAssignmentList({
  assignments,
  evidenceEnabled = false,
}: {
  assignments: Assignment[];
  evidenceEnabled?: boolean;
}) {
  const router = useRouter();
  const offline = useOfflineSync();
  const [busy, setBusy] = useState<string | null>(null);
  const [items, setItems] = useState(assignments);
  const [message, setMessage] = useState("");
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  useEffect(() => {
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string }>).detail;
      if (detail?.kind === "ASSIGNMENT_PROGRESS") {
        setMessage("Cihazda bekleyen ödev durumu güvenle eşitlendi.");
        router.refresh();
      }
    };
    const conflicted = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string }>).detail;
      if (detail?.kind === "ASSIGNMENT_PROGRESS")
        setMessage(
          "Ödev durumu başka yerde değişti; son durumu görüp yeniden seçin.",
        );
    };
    window.addEventListener("panel-offline-synced", synced);
    window.addEventListener("panel-offline-conflict", conflicted);
    return () => {
      window.removeEventListener("panel-offline-synced", synced);
      window.removeEventListener("panel-offline-conflict", conflicted);
    };
  }, [router]);

  async function submitEvidence(id: string) {
    try {
      await submitEvidenceRequest(id);
    } catch {
      setBusy(null);
      setMessage("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
    }
  }

  async function submitEvidenceRequest(id: string) {
    setBusy(id);
    setMessage("");
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replaceAll("-", "_")
        : `evidence_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const response = await fetch(`/api/panel/assignments/${id}/submissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        textEvidence: evidence[id] || "",
        idempotencyKey,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(body.error || "Kanıt gönderilemedi.");
      return;
    }
    setMessage(
      body.attemptNumber > 1
        ? "Yeni denemen öğretmenine gönderildi."
        : "Kanıtın öğretmen değerlendirmesine gönderildi.",
    );
    router.refresh();
  }

  async function setStatus(id: string, status: Status) {
    setBusy(id);
    const current = items.find((item) => item.id === id);
    const result = await offline.submitMutation({
      kind: "ASSIGNMENT_PROGRESS",
      method: "PATCH",
      url: `/api/panel/assignments/${id}/progress`,
      body: {
        status,
        expectedVersion: current?.version || 0,
        mutationKey: crypto.randomUUID(),
      },
      coalesceKey: `assignment:${id}`,
    });
    setBusy(null);
    if (result.state === "synced" || result.state === "queued") {
      setItems((rows) =>
        rows.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                version:
                  result.state === "synced" &&
                  typeof result.body.version === "number"
                    ? result.body.version
                    : item.version,
              }
            : item,
        ),
      );
      setMessage(
        result.state === "queued"
          ? "Bağlantı yok; ödev durumu bu cihazda güvenle bekliyor."
          : status === "DONE"
            ? "Harika! Çalışma tamamlandı, serin büyüyor."
            : "İlerlemen kaydedildi.",
      );
      // Tamamlama, canlı bölgedeki mesajla duyurulur; uçan kutlama bandı
      // panelin sakin diliyle uyuşmadığı için kaldırıldı (roadmap §5.8).
      if (result.state === "synced") router.refresh();
    } else if (result.state === "conflict") {
      setMessage(
        "Ödev durumu başka bir sekmede değişti. Sayfayı yenileyip yeniden seçin.",
      );
    } else {
      setMessage(
        String(
          result.body.error || "Durum kaydedilemedi. Lütfen yeniden deneyin.",
        ),
      );
    }
  }

  return (
    <>
      <p
        aria-live="polite"
        className="mb-2 min-h-5 text-[13px] font-medium text-pn-text-secondary"
      >
        {message}
      </p>
      <div className="border-t border-pn-border">
        {items.map((assignment) => {
          const overdue =
            assignment.status !== "DONE" &&
            new Date(assignment.dueAt) < new Date();
          const latest = assignment.submissions[0];
          const canSubmit =
            evidenceEnabled &&
            assignment.evidenceRequired &&
            (!latest || latest.status === "CHANGES_REQUESTED");
          return (
            <article
              key={assignment.id}
              className="border-b border-pn-border py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-pn-text">
                  {assignment.title}
                </h2>
                <StatusBadge
                  label={overdue ? "Süresi geçti" : statusCopy[assignment.status]}
                  tone={assignment.status === "DONE" ? "success" : overdue ? "critical" : assignment.status === "IN_PROGRESS" ? "info" : "neutral"}
                />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-pn-text-muted">
                <span>{assignment.groupName} · {assignment.subject}</span>
                <span aria-hidden="true">·</span>
                <Clock3 size={12} aria-hidden="true" />
                <span>
                  Teslim{" "}
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(assignment.dueAt))}
                </span>
              </p>
              <p className="mt-2 max-w-[720px] text-[14px] leading-[1.6] text-pn-text-secondary">
                {assignment.description || "Öğretmenin açıklama eklemedi."}
              </p>
              {assignment.evidenceRequired && evidenceEnabled ? (
                <div className="mt-3 max-w-[720px] rounded-[10px] border border-pn-border bg-pn-surface-subtle p-4">
                  <p className="text-xs font-extrabold">
                    Kanıtlı teslim · ölçütler
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-(--site-body)">
                    {assignment.criteria.map((criterion) => (
                      <li key={criterion.id}>
                        • {criterion.label}
                        {latest?.scores.find(
                          (score) => score.criterionId === criterion.id,
                        )
                          ? ` · ${rubricCopy[latest.scores.find((score) => score.criterionId === criterion.id)!.level]}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                  {latest ? (
                    <div className="mt-3 rounded-md border border-pn-border bg-white p-3 text-xs">
                      <p className="font-extrabold">
                        {latest.attemptNumber}. deneme ·{" "}
                        {latest.status === "SUBMITTED"
                          ? "Öğretmeninde"
                          : latest.status === "APPROVED"
                            ? "Onaylandı"
                            : "Yeniden deneyebilirsin"}
                      </p>
                      {latest.feedback ? (
                        <p className="mt-2 leading-5">
                          Geri bildirim: {latest.feedback}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {canSubmit ? (
                    <div className="mt-3">
                      <label
                        className="text-[11px] font-bold"
                        htmlFor={`evidence-${assignment.id}`}
                      >
                        {latest
                          ? "Yeni denemende neyi değiştirdin?"
                          : "Çözüm yolunu ve kontrolünü kısaca açıkla"}
                      </label>
                      <textarea
                        id={`evidence-${assignment.id}`}
                        value={evidence[assignment.id] || ""}
                        onChange={(event) =>
                          setEvidence((current) => ({
                            ...current,
                            [assignment.id]: event.target.value,
                          }))
                        }
                        maxLength={2000}
                        className="panel-input mt-2 min-h-24 resize-y"
                      />
                      <button
                        type="button"
                        disabled={
                          busy === assignment.id ||
                          (evidence[assignment.id]?.trim().length || 0) < 20
                        }
                        onClick={() => void submitEvidence(assignment.id)}
                        className={buttonClass("primary", "sm", "mt-2")}
                      >
                        {latest ? "Yeni denemeyi gönder" : "Kanıtı gönder"}
                      </button>
                      <p className="mt-2 text-xs text-(--site-muted)">
                        En az 20 karakter yaz (
                        {evidence[assignment.id]?.trim().length || 0}/20).
                        Şimdilik yalnızca yazılı açıklama kabul ediliyor;
                        fotoğraf ve dosya desteği sonra eklenecek.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  role="group"
                  aria-label={`${assignment.title} durumu`}
                  className="mt-3 inline-grid grid-cols-3 gap-0.5 rounded-md border border-pn-border bg-pn-surface-subtle p-0.5"
                >
                  {(["TODO", "IN_PROGRESS", "DONE"] as Status[]).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busy === assignment.id}
                        aria-pressed={assignment.status === status}
                        onClick={() => void setStatus(assignment.id, status)}
                        className={`flex min-h-9 items-center justify-center gap-1 rounded-[5px] px-3 text-[12.5px] font-semibold transition-colors ${assignment.status === status ? "bg-dc-ink text-white" : "text-pn-text-secondary hover:bg-white"}`}
                      >
                        {busy === assignment.id &&
                        assignment.status !== status ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : status === "DONE" ? (
                          <Check size={11} />
                        ) : status === "IN_PROGRESS" ? (
                          <Clock3 size={11} />
                        ) : (
                          <Circle size={11} />
                        )}
                        {statusCopy[status]}
                      </button>
                    ),
                  )}
                </div>
              )}
            </article>
          );
        })}
        {!items.length ? (
          <EmptyState
            className="mt-4"
            title="Aktif ödevin yok."
            body="Öğretmenin yeni bir ödev verdiğinde burada görünecek."
          />
        ) : null}
      </div>
    </>
  );
}
