"use client";

import { useActionState } from "react";

import { createOrUpdateStudentGoalAction } from "@/app/panel/ogrenci/hedefim/_actions";
import type { AcademicGoalRow } from "@/lib/panel/academic-roadmap";

const EXAM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Belirtilmedi" },
  { value: "TYT", label: "TYT" },
  { value: "AYT", label: "AYT" },
  { value: "YKS", label: "YKS (TYT + AYT)" },
  { value: "LGS", label: "LGS" },
  { value: "OTHER", label: "Diğer" },
];

function dateToInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function nullableNum(v: number | null): string {
  return v == null ? "" : String(v);
}

/**
 * Single-active-goal form. The submit always upserts the active goal for
 * the signed-in student; no studentId or goalId is sent over the wire.
 */
export function AcademicGoalForm({
  goal,
}: {
  goal: AcademicGoalRow | null;
}) {
  const [state, formAction, pending] = useActionState(
    createOrUpdateStudentGoalAction,
    { ok: true } as { ok: boolean; error?: string; fieldErrors?: Record<string, string> },
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      style={{ display: "grid", gap: 12 }}
      aria-busy={pending}
    >
      {state.error ? (
        <div className="od-alert od-alert-bad" role="alert">
          {state.error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 8,
        }}
      >
        <div className="od-field">
          <label className="od-label" htmlFor="examType">
            Sınav türü
          </label>
          <select
            id="examType"
            name="examType"
            defaultValue={goal?.examType ?? ""}
            className="od-input"
          >
            {EXAM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="od-field">
          <label className="od-label" htmlFor="targetDate">
            Hedef tarih
          </label>
          <input
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={dateToInputValue(goal?.targetDate ?? null)}
            className="od-input"
          />
          {fieldErrors.targetDate ? (
            <div className="od-field-error">{fieldErrors.targetDate}</div>
          ) : null}
        </div>
      </div>

      <div className="od-field">
        <label className="od-label" htmlFor="targetUniversity">
          Hedef üniversite
        </label>
        <input
          id="targetUniversity"
          name="targetUniversity"
          type="text"
          maxLength={160}
          defaultValue={goal?.targetUniversity ?? ""}
          placeholder="Örn. ODTÜ"
          className="od-input"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 8,
        }}
      >
        <div className="od-field">
          <label className="od-label" htmlFor="targetDepartment">
            Hedef bölüm
          </label>
          <input
            id="targetDepartment"
            name="targetDepartment"
            type="text"
            maxLength={160}
            defaultValue={goal?.targetDepartment ?? ""}
            placeholder="Örn. Bilgisayar Mühendisliği"
            className="od-input"
          />
        </div>
        <div className="od-field">
          <label className="od-label" htmlFor="targetSchool">
            Hedef okul (lise/ortaokul)
          </label>
          <input
            id="targetSchool"
            name="targetSchool"
            type="text"
            maxLength={160}
            defaultValue={goal?.targetSchool ?? ""}
            placeholder="Örn. Fen Lisesi"
            className="od-input"
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0,1fr))",
          gap: 8,
        }}
      >
        <div className="od-field">
          <label className="od-label" htmlFor="targetNet">
            Hedef net
          </label>
          <input
            id="targetNet"
            name="targetNet"
            type="text"
            inputMode="decimal"
            maxLength={16}
            defaultValue={nullableNum(goal?.targetNet ?? null)}
            placeholder="Örn. 95.5"
            className="od-input"
          />
          {fieldErrors.targetNet ? (
            <div className="od-field-error">{fieldErrors.targetNet}</div>
          ) : null}
        </div>
        <div className="od-field">
          <label className="od-label" htmlFor="targetScore">
            Hedef puan
          </label>
          <input
            id="targetScore"
            name="targetScore"
            type="text"
            inputMode="decimal"
            maxLength={16}
            defaultValue={nullableNum(goal?.targetScore ?? null)}
            placeholder="Örn. 480"
            className="od-input"
          />
          {fieldErrors.targetScore ? (
            <div className="od-field-error">{fieldErrors.targetScore}</div>
          ) : null}
        </div>
        <div className="od-field">
          <label className="od-label" htmlFor="targetRank">
            Hedef sıralama
          </label>
          <input
            id="targetRank"
            name="targetRank"
            type="text"
            inputMode="numeric"
            maxLength={16}
            defaultValue={goal?.targetRank != null ? String(goal.targetRank) : ""}
            placeholder="Örn. 5000"
            className="od-input"
          />
          {fieldErrors.targetRank ? (
            <div className="od-field-error">{fieldErrors.targetRank}</div>
          ) : null}
        </div>
      </div>

      <div className="od-field">
        <label className="od-label" htmlFor="note">
          Not (opsiyonel)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={2000}
          defaultValue={goal?.note ?? ""}
          placeholder="Hedefini neden seçtiğini, sınırlamaları, motivasyon notlarını yazabilirsin."
          className="od-input"
        />
      </div>

      <div className="od-row" style={{ gap: 8 }}>
        <button
          type="submit"
          disabled={pending}
          className="od-btn od-btn-primary od-btn-sm"
        >
          {goal ? "Hedefi güncelle" : "Hedefi kaydet"}
        </button>
      </div>
    </form>
  );
}
