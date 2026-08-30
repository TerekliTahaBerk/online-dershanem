"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkInLabels } from "@/lib/student-check-in";
import { PanelActionRow, PanelStatusBadge } from "@/components/panel/ui";

type Row = {
  id: string;
  studentName: string;
  groupName: string;
  energy: keyof typeof checkInLabels.energy;
  confidence: keyof typeof checkInLabels.confidence;
  barrier: keyof typeof checkInLabels.barrier;
  status: "OPEN" | "RESPONDED";
  dueAt: string;
  version: number;
  helpful: boolean | null;
  responseAction: keyof typeof checkInLabels.action | null;
};

export function TeacherHelpRequests({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState(rows);

  async function respond(row: Row, action: keyof typeof checkInLabels.action) {
    if (busy) return;
    setBusy(row.id);
    setMessage("");

    const response = await fetch(`/api/panel/student-help-requests/${row.id}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedVersion: row.version, action }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(null);
      return setMessage(data.error || "Yanıt kaydedilemedi.");
    }

    setItems((current) =>
      current.map((item) =>
        item.id === row.id
          ? {
              ...item,
              status: "RESPONDED",
              responseAction: action,
              version: item.version + 1,
              helpful: null,
            }
          : item,
      ),
    );
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="text-sm font-bold text-dc-ink">
          {message}
        </p>
      ) : null}

      {items.length ? (
        <div className="rounded-[12px] border border-dc-line-soft bg-white">
          {items.map((row, index) => {
          const overdue = row.status === "OPEN" && new Date(row.dueAt) < new Date();
          return (
            <article
              key={row.id}
              id={`yardim-${row.id}`}
              className={`px-4 py-4 ${index < items.length - 1 ? "border-b border-dc-line-soft" : ""}`}
            >
              <PanelActionRow
                className="!border-0 !px-0 !py-0"
                title={row.studentName}
                description={`${checkInLabels.energy[row.energy]} · ${checkInLabels.confidence[row.confidence]}`}
                meta={`${row.groupName} · Engel: ${checkInLabels.barrier[row.barrier]}`}
                status={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PanelStatusBadge label="Öğrenci talebi" tone="info" />
                    <PanelStatusBadge
                      label={
                        row.status === "OPEN"
                          ? overdue
                            ? "Süresi geçti"
                            : "Yanıt bekliyor"
                          : row.helpful === false
                            ? "Yeni adım bekliyor"
                            : "Yanıtlandı"
                      }
                      tone={row.status === "OPEN" ? (overdue ? "warning" : "info") : "success"}
                    />
                  </div>
                }
              />

              {row.responseAction ? (
                <p className="mt-3 rounded-xl bg-dc-surface-soft p-3 text-sm text-dc-ink-body">
                  Son adım: {checkInLabels.action[row.responseAction]}
                </p>
              ) : null}

              {row.status === "OPEN" ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-extrabold text-dc-ink-muted">
                    Taahhüt edebileceğiniz küçük destek adımı
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(checkInLabels.action).map(([action, label]) => (
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => respond(row, action as keyof typeof checkInLabels.action)}
                        key={action}
                        className="panel-secondary-button min-h-10 text-left text-xs"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dc-line border-dashed bg-white p-6 text-sm text-dc-ink-muted">
          Yanıt bekleyen yardım isteği yok.
        </div>
      )}
    </div>
  );
}
