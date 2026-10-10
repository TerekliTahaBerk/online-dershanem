"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock3, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/components/panel/offline-sync-provider";
import { EmptyState, StatusBadge, buttonClass } from "@/components/panel/primitives";
import { Drawer, useDrawerParam } from "@/components/panel/primitives/drawer";

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
  TODO: "Başlamadım",
  IN_PROGRESS: "Çalışıyorum",
  DONE: "Tamamladım",
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
        setMessage("Bağlantın gelince bekleyen ödev durumunu da kaydettik.");
        router.refresh();
      }
    };
    const conflicted = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string }>).detail;
      if (detail?.kind === "ASSIGNMENT_PROGRESS")
        setMessage(
          "Bu ödevin durumu başka bir yerden değişmiş; son hâline bakıp yeniden seçebilirsin.",
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
      setMessage("Bağlantı kuramadık. İnternetini kontrol edip bir daha dener misin?");
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
      setMessage(body.error || "Gönderemedik. Bir daha dener misin?");
      return;
    }
    setMessage(
      body.attemptNumber > 1
        ? "Yeni denemeni öğretmenine gönderdik."
        : "Gönderdik! Öğretmenin bakıp sana dönecek.",
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
          ? "Şu an bağlantın yok; seçimini bu cihazda sakladık, bağlantı gelince kaydedeceğiz."
          : status === "DONE"
            ? "Harika, çalışmayı tamamladın! Serin büyüyor."
            : "İlerlemeni kaydettik.",
      );
      // Tamamlama, canlı bölgedeki mesajla duyurulur; uçan kutlama bandı
      // panelin sakin diliyle uyuşmadığı için kaldırıldı (roadmap §5.8).
      if (result.state === "synced") router.refresh();
    } else if (result.state === "conflict") {
      setMessage(
        "Bu ödevin durumu başka bir sekmede değişmiş. Sayfayı yenileyip yeniden seçebilirsin.",
      );
    } else {
      setMessage(
        String(
          result.body.error || "Durumunu kaydedemedik. Bir daha dener misin?",
        ),
      );
    }
  }

  const [openParam, setOpenParam] = useDrawerParam();
  const openId = openParam?.startsWith("odev:") ? openParam.slice(5) : null;
  const opened = openId ? items.find((item) => item.id === openId) ?? null : null;
  const closeDrawer = useCallback(() => setOpenParam(null), [setOpenParam]);
  const dueLabel = (dueAt: string) =>
    new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dueAt));
  const isOverdue = (assignment: Assignment) =>
    assignment.status !== "DONE" && new Date(assignment.dueAt) < new Date();
  const statusTone = (assignment: Assignment) =>
    assignment.status === "DONE" ? "success" : isOverdue(assignment) ? "critical" : assignment.status === "IN_PROGRESS" ? "info" : "neutral";

  return (
    <>
      <p
        aria-live="polite"
        className="mb-2 min-h-5 text-[13px] font-medium text-pn-text-secondary"
      >
        {/* Yan panel açıkken mesaj panelin içinde duyurulur; iki kez okunmaz. */}
        {opened ? "" : message}
      </p>
      <div className="border-t border-pn-border">
        {items.map((assignment) => {
          const overdue = isOverdue(assignment);
          const latest = assignment.submissions[0];
          const evidenceFlow = evidenceEnabled && assignment.evidenceRequired;
          const canSubmit = evidenceFlow && (!latest || latest.status === "CHANGES_REQUESTED");
          return (
            <article
              key={assignment.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-pn-border py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-pn-text">{assignment.title}</h2>
                  <StatusBadge
                    label={overdue ? "Süresi geçti" : statusCopy[assignment.status]}
                    tone={statusTone(assignment)}
                  />
                  {evidenceFlow && latest ? (
                    <StatusBadge
                      label={
                        latest.status === "SUBMITTED"
                          ? "Öğretmeninde"
                          : latest.status === "APPROVED"
                            ? "Onaylandı"
                            : "Yeniden deneyebilirsin"
                      }
                      tone={latest.status === "APPROVED" ? "success" : latest.status === "CHANGES_REQUESTED" ? "warning" : "info"}
                    />
                  ) : null}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-pn-text-muted">
                  <span>{assignment.groupName} · {assignment.subject}</span>
                  <span aria-hidden="true">·</span>
                  <Clock3 size={12} aria-hidden="true" />
                  <span>Teslim {dueLabel(assignment.dueAt)}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {evidenceFlow ? (
                  <button
                    type="button"
                    onClick={() => setOpenParam(`odev:${assignment.id}`)}
                    className={buttonClass(canSubmit ? "primary" : "secondary", "sm")}
                    aria-haspopup="dialog"
                  >
                    {canSubmit ? (latest ? "Yeni deneme gönder" : "Kanıt gönder") : "Ayrıntılar"}
                  </button>
                ) : (
                  <>
                    <div
                      role="group"
                      aria-label={`${assignment.title} durumu`}
                      className="inline-grid grid-cols-3 gap-0.5 rounded-md border border-pn-border bg-pn-surface-subtle p-0.5"
                    >
                      {(["TODO", "IN_PROGRESS", "DONE"] as Status[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={busy === assignment.id}
                          aria-pressed={assignment.status === status}
                          onClick={() => void setStatus(assignment.id, status)}
                          className={`flex min-h-9 items-center justify-center gap-1 rounded-[5px] px-3 text-[12.5px] font-semibold transition-colors ${assignment.status === status ? "bg-dc-ink text-white" : "text-pn-text-secondary hover:bg-white"}`}
                        >
                          {busy === assignment.id && assignment.status !== status ? (
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
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenParam(`odev:${assignment.id}`)}
                      className={buttonClass("ghost", "sm")}
                      aria-label={`${assignment.title} ayrıntıları`}
                      aria-haspopup="dialog"
                    >
                      Ayrıntılar
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {!items.length ? (
          <EmptyState
            className="mt-4"
            title="Bekleyen ödevin yok."
            body="Her şey yolunda görünüyor. Öğretmenin yeni bir ödev verdiğinde ilk burada göreceksin."
          />
        ) : null}
      </div>

      <Drawer
        open={Boolean(opened)}
        onClose={closeDrawer}
        title={opened?.title ?? "Ödev"}
        description={opened ? `${opened.groupName} · ${opened.subject} · Teslim ${dueLabel(opened.dueAt)}` : undefined}
      >
        {opened ? <AssignmentDetail
          assignment={opened}
          evidenceEnabled={evidenceEnabled}
          busy={busy === opened.id}
          evidenceText={evidence[opened.id] || ""}
          onEvidenceChange={(value) => setEvidence((current) => ({ ...current, [opened.id]: value }))}
          onSubmitEvidence={() => void submitEvidence(opened.id)}
          statusLabel={isOverdue(opened) ? "Süresi geçti" : statusCopy[opened.status]}
          statusTone={statusTone(opened)}
          message={message}
        /> : null}
      </Drawer>
    </>
  );
}

function AssignmentDetail({
  assignment,
  evidenceEnabled,
  busy,
  evidenceText,
  onEvidenceChange,
  onSubmitEvidence,
  statusLabel,
  statusTone,
  message,
}: {
  assignment: Assignment;
  evidenceEnabled: boolean;
  busy: boolean;
  evidenceText: string;
  onEvidenceChange: (value: string) => void;
  onSubmitEvidence: () => void;
  statusLabel: string;
  statusTone: "success" | "critical" | "info" | "neutral";
  message: string;
}) {
  const latest = assignment.submissions[0];
  const evidenceFlow = evidenceEnabled && assignment.evidenceRequired;
  const canSubmit = evidenceFlow && (!latest || latest.status === "CHANGES_REQUESTED");
  const scoreFor = (criterionId: string) => latest?.scores.find((score) => score.criterionId === criterionId);
  return (
    <div className="space-y-5">
      <div>
        <StatusBadge label={statusLabel} tone={statusTone} />
        <p className="mt-3 text-[14px] leading-[1.6] text-pn-text-secondary">
          {assignment.description || "Öğretmenin bu ödev için ek bir açıklama yazmadı."}
        </p>
      </div>
      {evidenceFlow ? (
        <section aria-labelledby={`criteria-${assignment.id}`}>
          <h3 id={`criteria-${assignment.id}`} className="text-[13.5px] font-semibold text-pn-text">
            Nasıl yaptığını anlat · ölçütler
          </h3>
          <ul className="mt-2 space-y-1 text-[13px] text-pn-text-secondary">
            {assignment.criteria.map((criterion) => (
              <li key={criterion.id}>
                • {criterion.label}
                {scoreFor(criterion.id) ? ` · ${rubricCopy[scoreFor(criterion.id)!.level]}` : ""}
              </li>
            ))}
          </ul>
          {latest ? (
            <div className="mt-3 rounded-md border border-pn-border bg-pn-surface-subtle p-3 text-[13px]">
              <p className="font-semibold text-pn-text">
                {latest.attemptNumber}. deneme ·{" "}
                {latest.status === "SUBMITTED" ? "Öğretmeninde" : latest.status === "APPROVED" ? "Onaylandı" : "Yeniden deneyebilirsin"}
              </p>
              {latest.feedback ? <p className="mt-2 leading-5 text-pn-text-secondary">Geri bildirim: {latest.feedback}</p> : null}
            </div>
          ) : null}
          {canSubmit ? (
            <div className="mt-4">
              <label className="text-[13px] font-medium text-pn-text" htmlFor={`evidence-${assignment.id}`}>
                {latest ? "Bu sefer neyi farklı yaptın?" : "Nasıl çözdüğünü ve nasıl kontrol ettiğini kısaca anlat"}
              </label>
              <textarea
                id={`evidence-${assignment.id}`}
                value={evidenceText}
                onChange={(event) => onEvidenceChange(event.target.value)}
                maxLength={2000}
                className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2 min-h-28 resize-y"
              />
              <button
                type="button"
                disabled={busy || evidenceText.trim().length < 20}
                onClick={onSubmitEvidence}
                className={buttonClass("primary", "md", "mt-2")}
              >
                {latest ? "Yeni denemeyi gönder" : "Kanıtı gönder"}
              </button>
              <p className="mt-2 text-[12.5px] text-pn-text-muted">
                En az 20 karakter yazman yeterli ({evidenceText.trim().length}/20). Şimdilik yalnızca yazılı açıklama
                gönderebiliyorsun; fotoğraf ve dosya desteği yakında geliyor.
              </p>
            </div>
          ) : null}
          {message ? (
            <p role="status" className="mt-3 text-[13px] font-medium text-pn-text-secondary">
              {message}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
