"use client";

/**
 * AttendanceQuickTake — modal form to mark attendance for a lesson session
 * in one shot. Per row: PRESENT / LATE / ABSENT / EXCUSED + optional
 * minutesLate (auto-revealed for LATE) + freeform note.
 *
 * Defaults:
 *   - Pre-fills with whatever is already in DB (so re-opening the modal
 *     during the lesson doesn't lose state).
 *   - Empty status means "skip this student" — admin must click a chip.
 *   - "Tümünü 'Geldi' yap" shortcut at the top.
 *
 * Submits to `bulkMarkAttendanceAction` (server-bound to lessonId).
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { PanelIcon } from "@/components/panel/ui/icon";
import {
  getAttendanceStatusLabel,
  getAttendanceStatusTone,
  WRITABLE_ATTENDANCE_STATUSES,
} from "@/lib/attendance";
import type { AttendanceStatus } from "@prisma/client";

type Roster = Array<{
  studentId: string;
  studentName: string;
  current?: { status: AttendanceStatus; minutesLate: number | null; notes: string | null } | null;
}>;

type Props = {
  lessonId: string;
  lessonLabel: string; // "Türev — Salı 10:00"
  roster: Roster;
  action: (formData: FormData) => Promise<unknown> | unknown;
  /** Optional custom trigger label/variant. */
  triggerLabel?: string;
  triggerVariant?: "primary" | "ghost";
};

type Status = AttendanceStatus;

/** Display order in the chip strip — Phase 1.5 includes LEFT_EARLY. */
const STATUS_ORDER: Status[] = WRITABLE_ATTENDANCE_STATUSES;

export function AttendanceQuickTakeButton({
  lessonId,
  lessonLabel,
  roster,
  action,
  triggerLabel = "📋 Yoklama al",
  triggerVariant = "primary",
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`od-btn od-btn-sm ${triggerVariant === "primary" ? "od-btn-primary" : "od-btn-ghost"}`}
      >
        {triggerLabel}
      </button>
      <AttendanceQuickTakeModal
        open={open}
        onOpenChange={setOpen}
        lessonId={lessonId}
        lessonLabel={lessonLabel}
        roster={roster}
        action={action}
      />
    </>
  );
}

type ModalProps = Omit<Props, "triggerLabel" | "triggerVariant"> & {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

function AttendanceQuickTakeModal({ open, onOpenChange, lessonLabel, roster, action }: ModalProps) {
  const router = useRouter();
  const initialState = useMemo(() => {
    const m = new Map<string, { status: Status | null; minutesLate: string; note: string }>();
    for (const r of roster) {
      m.set(r.studentId, {
        status: r.current?.status ?? null,
        minutesLate: r.current?.minutesLate ? String(r.current.minutesLate) : "",
        note: r.current?.notes ?? "",
      });
    }
    return m;
  }, [roster]);

  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Reset state when modal re-opens (so latest server data wins).
  useEffect(() => {
    if (open) {
      setState(new Map(initialState));
      setError(null);
      setSavedAt(null);
    }
  }, [open, initialState]);

  const updateRow = (studentId: string, patch: Partial<{ status: Status | null; minutesLate: string; note: string }>) => {
    setState((prev) => {
      const next = new Map(prev);
      const cur = next.get(studentId) ?? { status: null, minutesLate: "", note: "" };
      next.set(studentId, { ...cur, ...patch });
      return next;
    });
  };

  const markAllPresent = () => {
    setState((prev) => {
      const next = new Map(prev);
      for (const r of roster) {
        const cur = next.get(r.studentId) ?? { status: null, minutesLate: "", note: "" };
        if (cur.status === null) next.set(r.studentId, { ...cur, status: "PRESENT" });
      }
      return next;
    });
  };

  const summary = useMemo(() => {
    const t: Record<Status, number> = {
      PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, LEFT_EARLY: 0,
    };
    let unmarked = 0;
    for (const v of state.values()) {
      if (v.status) t[v.status]++; else unmarked++;
    }
    return { ...t, unmarked };
  }, [state]);

  const submit = () => {
    setError(null);
    setSavedAt(null);
    const fd = new FormData();
    let any = false;
    for (const [sid, v] of state.entries()) {
      if (!v.status) continue;
      any = true;
      fd.set(`status_${sid}`, v.status);
      if (v.status === "LATE" && v.minutesLate) fd.set(`minutesLate_${sid}`, v.minutesLate);
      if (v.note) fd.set(`note_${sid}`, v.note);
    }
    if (!any) { setError("En az bir öğrenci için durum seç."); return; }
    startTransition(async () => {
      try {
        await action(fd);
        setSavedAt(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
        router.refresh();
      } catch (e) {
        setError((e as Error).message || "Hata oluştu.");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="od-detail-drawer-overlay" />
        <Dialog.Content
          className="od-modal"
          style={{ width: "min(720px, calc(100vw - 32px))", maxHeight: "calc(100vh - 32px)" }}
        >
          <header className="od-modal-header">
            <div>
              <Dialog.Title className="od-modal-title">Yoklama — {lessonLabel}</Dialog.Title>
              <Dialog.Description className="od-modal-sub">
                {roster.length} öğrenci · İşaretlenmemiş kayıtlar atlanır.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="od-icon-btn" aria-label="Kapat"><PanelIcon name="x" /></button>
            </Dialog.Close>
          </header>

          <div className="od-modal-body" style={{ padding: 0 }}>
            <div style={{ display: "flex", gap: 8, padding: "10px 18px", borderBottom: "1px solid var(--pd-line)", flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={markAllPresent}>
                ✓ İşaretsizleri &quot;Geldi&quot; yap
              </button>
              <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, fontSize: 12, flexWrap: "wrap" }}>
                <span style={{ color: "var(--pd-good)" }}>✓ {summary.PRESENT}</span>
                <span style={{ color: "var(--pd-warn)" }}>⏱ {summary.LATE}</span>
                <span style={{ color: "var(--pd-warn)" }}>↗ {summary.LEFT_EARLY}</span>
                <span style={{ color: "var(--pd-bad)" }}>✗ {summary.ABSENT}</span>
                <span style={{ color: "var(--pd-muted)" }}>✎ {summary.EXCUSED}</span>
                <span style={{ color: "var(--pd-muted)" }}>· {summary.unmarked} işaretsiz</span>
              </span>
            </div>

            <div style={{ overflow: "auto" }}>
              <table className="od-table" style={{ tableLayout: "fixed", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Öğrenci</th>
                    <th style={{ width: "auto" }}>Durum</th>
                    <th style={{ width: "90px" }}>Gecikme</th>
                    <th style={{ width: "30%" }}>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r) => {
                    const v = state.get(r.studentId) ?? { status: null, minutesLate: "", note: "" };
                    return (
                      <tr key={r.studentId}>
                        <td style={{ verticalAlign: "middle" }}>
                          <strong style={{ fontSize: 13 }}>{r.studentName}</strong>
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                            {STATUS_ORDER.map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateRow(r.studentId, { status: v.status === st ? null : st })}
                                className={`od-chip od-chip-${getAttendanceStatusTone(st)} ${v.status === st ? "is-active" : ""}`}
                                title={getAttendanceStatusLabel(st)}
                              >
                                {getAttendanceStatusLabel(st)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          <input
                            type="number"
                            min={1}
                            max={300}
                            placeholder="dk"
                            disabled={v.status !== "LATE"}
                            value={v.minutesLate}
                            onChange={(e) => updateRow(r.studentId, { minutesLate: e.target.value })}
                            className="od-input"
                            style={{ height: 28, fontSize: 12 }}
                          />
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          <input
                            type="text"
                            placeholder="Opsiyonel"
                            value={v.note}
                            maxLength={500}
                            onChange={(e) => updateRow(r.studentId, { note: e.target.value })}
                            className="od-input"
                            style={{ height: 28, fontSize: 12 }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error ? (
              <div className="od-alert od-alert-bad" style={{ margin: "12px 18px" }}>{error}</div>
            ) : null}
            {savedAt ? (
              <div style={{ margin: "12px 18px", fontSize: 12, color: "var(--pd-good)" }}>
                ✓ Kaydedildi — {savedAt}
              </div>
            ) : null}
          </div>

          <footer className="od-modal-footer">
            <Dialog.Close asChild>
              <button type="button" className="od-btn od-btn-ghost od-btn-sm" disabled={pending}>Kapat</button>
            </Dialog.Close>
            <button type="button" className="od-btn od-btn-primary od-btn-sm" onClick={submit} disabled={pending}>
              {pending ? "Kaydediliyor…" : "Yoklamayı kaydet"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
