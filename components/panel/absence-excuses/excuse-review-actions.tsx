"use client";

import { useId, useState } from "react";

import {
  approveAbsenceExcuseAction,
  rejectAbsenceExcuseAction,
} from "@/app/panel/ogretmen/_excuse-actions";

/**
 * Inline approve / reject controls for a single AbsenceExcuse row.
 *
 * Renders a compact toolbar of two buttons. Clicking either one expands a
 * lightweight review-note textarea and submits the form to the matching
 * server action. On success the parent server component will re-render via
 * `revalidatePath`.
 */
export function ExcuseReviewActions({
  excuseId,
  variant = "teacher",
}: {
  excuseId: string;
  /** Reserved for admin-side mounting; same actions for now. */
  variant?: "teacher" | "admin";
}) {
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
    mode === "approve" ? approveAbsenceExcuseAction : rejectAbsenceExcuseAction;
  const submitLabel = mode === "approve" ? "Onayı kaydet" : "Reddi kaydet";
  const submitTone =
    mode === "approve" ? "od-btn od-btn-primary od-btn-sm" : "od-btn od-btn-danger od-btn-sm";

  return (
    <form action={action} style={{ display: "grid", gap: 6 }} data-variant={variant}>
      <input type="hidden" name="id" value={excuseId} />
      <label htmlFor={noteId} className="od-muted" style={{ fontSize: 12 }}>
        İnceleme notu (opsiyonel, veliye iletilebilir)
      </label>
      <textarea
        id={noteId}
        name="reviewNote"
        rows={2}
        maxLength={2000}
        className="od-input"
        placeholder={
          mode === "approve"
            ? "Örn. Belge tamam, derslere mazeretli yazıldı."
            : "Örn. Belge eksik, lütfen yeniden gönderin."
        }
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
