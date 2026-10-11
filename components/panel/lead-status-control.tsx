"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_INTAKE_STATUS_LABELS } from "@/lib/panel/status-vocabulary";

const labels = LEAD_INTAKE_STATUS_LABELS;
type Status = keyof typeof labels;

export function LeadStatusControl({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <select
      aria-label="Talep durumu"
      value={status}
      disabled={busy}
      onChange={async (event) => {
        setBusy(true);
        const response = await fetch(`/api/panel/leads/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: event.target.value }),
        });
        if (response.ok) router.refresh();
        else setBusy(false);
      }}
      className="rounded-full border-0 bg-(--brand-olive-soft) px-2.5 py-1 text-[10px] font-extrabold text-(--brand-olive) outline-hidden ring-(--brand-olive) focus:ring-2 disabled:opacity-60"
    >
      {Object.entries(labels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
