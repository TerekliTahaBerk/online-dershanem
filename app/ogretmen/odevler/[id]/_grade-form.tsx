"use client";
import { useState, useTransition } from "react";
import { gradeSubmissionAction } from "../actions";

export function GradeForm({
  submissionId,
  initialScore,
  initialFeedback,
}: {
  submissionId: string;
  initialScore: number | null;
  initialFeedback: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<string>(initialScore?.toString() ?? "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      try {
        await gradeSubmissionAction({
          submissionId,
          score: Number(score),
          feedback: feedback || null,
        });
        setMsg("✓ Kaydedildi");
        setOpen(false);
      } catch (e: any) {
        setMsg(e.message ?? "Hata");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pd-btn-ghost"
        style={{ fontSize: 11, padding: "4px 8px" }}
      >
        {initialScore != null ? "Düzenle" : "Notlandır"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input
        type="number"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        className="pd-input"
        style={{ width: 60, fontSize: 11 }}
        placeholder="Puan"
      />
      <input
        type="text"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="pd-input"
        style={{ width: 140, fontSize: 11 }}
        placeholder="Geri bildirim"
      />
      <button type="button" onClick={save} disabled={pending} className="pd-btn-accent" style={{ fontSize: 11, padding: "4px 8px" }}>
        {pending ? "..." : "Kaydet"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="pd-btn-ghost" style={{ fontSize: 11, padding: "4px 6px" }}>
        ×
      </button>
      {msg && <span style={{ fontSize: 10, color: "var(--pd-muted-2)" }}>{msg}</span>}
    </div>
  );
}
