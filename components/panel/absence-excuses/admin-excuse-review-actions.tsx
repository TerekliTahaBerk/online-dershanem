"use client";

import { useId, useState } from "react";

import {
  adminApproveAbsenceExcuseAction,
  adminRejectAbsenceExcuseAction,
} from "@/app/panel/admin/mazeretler/_actions";

/**
 * Admin variant of inline review controls. Mirrors `ExcuseReviewActions` but
 * binds to admin-side server actions (which use `requirePanelRole("admin")`).
 */
export function AdminExcuseReviewActions({ excuseId }: { excuseId: string }) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const noteId = useId();

  if (mode === "idle") {
    return (
      <div className="od-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          className="od-btn od-btn-primary od-btn-sm"
          onClick={() => setMode("approve")}
        >
          Onayla
        </button>
        <button
          type="button"
          className="od-btn od-btn-ghost od-btn-sm"
          onClick={() => setMode("reject")}
        >
          Reddet
        </button>
      </div>
    );
  }

  const action =
    mode === "approve"
      ? adminApproveAbsenceExcuseAction
      : adminRejectAbsenceExcuseAction;
  const submitLabel = mode === "approve" ? "Onayı kaydet" : "Reddi kaydet";
  const submitTone =
    mode === "approve"
      ? "od-btn od-btn-primary od-btn-sm"
      : "od-btn od-btn-danger od-btn-sm";

  return (
    <form action={action} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="id" value={excuseId} />
      <label htmlFor={noteId} className="od-muted" style={{ fontSize: 12 }}>
        İnceleme notu (opsiyonel)
      </label>
      <textarea
        id={noteId}
        name="reviewNote"
        rows={2}
        maxLength={2000}
        className="od-input"
      />
      <div className="od-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <button type="submit" className={submitTone}>
          {submitLabel}
        </button>
        <button
          type="button"
          className="od-btn od-btn-ghost od-btn-sm"
          onClick={() => setMode("idle")}
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
