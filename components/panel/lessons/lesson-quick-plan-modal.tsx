"use client";

/**
 * LessonQuickPlanModal — fast-path lesson planning.
 *
 * Why: the full /ders-programi/yeni page is a heavy multi-step form with
 * recurrence, course defaults, conflict warnings, notification toggles. 90%
 * of admin "I just want to schedule a lesson now" use cases need only:
 *   teacher · (classroom OR single student) · date · time · duration · meet link.
 *
 * This modal uses the same `createLessonAction` so conflict detection,
 * notifications and audit are unchanged. Recurrence/extra fields are *not*
 * exposed here — admins who need them follow the existing "+ Yeni planlama"
 * link.
 *
 * Wiring (server page):
 *   import { createLessonAction } from "./_actions";
 *   import { LessonQuickPlanButton } from "@/components/panel/lessons/lesson-quick-plan-modal";
 *   ...
 *   <LessonQuickPlanButton action={createLessonAction} />
 */

import { useEffect, useId, useRef, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { EntitySearchCombobox } from "@/components/panel/ui/entity-search-combobox";
import { PanelIcon } from "@/components/panel/ui/icon";

type Mode = "classroom" | "student";

type Props = {
  /** Server action: createLessonAction(formData) */
  action: (formData: FormData) => Promise<unknown> | unknown;
  /** Optional pre-fill (when invoked from a context where teacher is implied). */
  defaultTeacherId?: string;
  /** Trigger button label / icon override. */
  label?: string;
  /** Visual variant. */
  variant?: "primary" | "ghost";
};

function todayLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function LessonQuickPlanButton({
  action,
  defaultTeacherId,
  label = "⚡ Hızlı planla",
  variant = "ghost",
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`od-btn od-btn-sm ${variant === "primary" ? "od-btn-primary" : "od-btn-ghost"}`}
      >
        {label}
      </button>
      <LessonQuickPlanModal
        open={open}
        onOpenChange={setOpen}
        action={action}
        defaultTeacherId={defaultTeacherId}
      />
    </>
  );
}

type ModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: (formData: FormData) => Promise<unknown> | unknown;
  defaultTeacherId?: string;
};

function LessonQuickPlanModal({ open, onOpenChange, action, defaultTeacherId }: ModalProps) {
  const router = useRouter();
  const formId = useId();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [mode, setMode] = useState<Mode>("classroom");
  const [teacherId, setTeacherId] = useState<string>(defaultTeacherId ?? "");
  const [classroomId, setClassroomId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setError(null);
      // keep teacher pre-fill, clear targets
      setClassroomId("");
      setStudentId("");
    }
  }, [open]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!teacherId) { setError("Öğretmen seç."); return; }
    if (mode === "classroom" && !classroomId) { setError("Sınıf seç."); return; }
    if (mode === "student" && !studentId) { setError("Öğrenci seç."); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("teacherId", teacherId);
    if (mode === "classroom") {
      fd.set("classroomId", classroomId);
      fd.delete("studentId");
    } else {
      fd.set("studentId", studentId);
      fd.delete("classroomId");
    }
    fd.set("recurrence", "none");
    fd.set("notifyStudents", "on");
    fd.set("notifyTeacher", "on");
    startTransition(async () => {
      try {
        await action(fd);
        // createLessonAction redirects on success; if it doesn't (caught), refresh.
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        // Server actions that redirect throw NEXT_REDIRECT — that's success.
        const msg = (err as Error).message || "";
        if (msg.includes("NEXT_REDIRECT")) {
          onOpenChange(false);
          return;
        }
        setError(msg || "Hata oluştu.");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="od-detail-drawer-overlay" />
        <Dialog.Content
          className="od-modal"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            // focus first field — teacher combobox
            const root = formRef.current;
            root?.querySelector<HTMLInputElement>("input")?.focus();
          }}
        >
          <header className="od-modal-header">
            <div>
              <Dialog.Title className="od-modal-title">Hızlı ders planla</Dialog.Title>
              <Dialog.Description className="od-modal-sub">
                Çakışma kontrolü ve bildirim varsayılan olarak aktif.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="od-icon-btn" aria-label="Kapat">
                <PanelIcon name="x" />
              </button>
            </Dialog.Close>
          </header>

          <form id={formId} ref={formRef} onSubmit={submit} className="od-modal-body">
            {/* Mode toggle */}
            <div className="od-segmented" role="tablist" aria-label="Ders türü">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "classroom"}
                onClick={() => setMode("classroom")}
                className={`od-segmented-item ${mode === "classroom" ? "is-active" : ""}`}
              >
                Sınıf dersi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "student"}
                onClick={() => setMode("student")}
                className={`od-segmented-item ${mode === "student" ? "is-active" : ""}`}
              >
                Bireysel
              </button>
            </div>

            <div className="od-grid g-2" style={{ gap: 12, marginTop: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="od-label">Öğretmen *</label>
                <EntitySearchCombobox
                  entity="teachers"
                  placeholder="Öğretmen ara…"
                  onChange={(id) => setTeacherId(id ?? "")}
                />
              </div>

              {mode === "classroom" ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="od-label">Sınıf *</label>
                  <EntitySearchCombobox
                    entity="classrooms"
                    placeholder="Sınıf ara…"
                    onChange={(id) => setClassroomId(id ?? "")}
                  />
                </div>
              ) : (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="od-label">Öğrenci *</label>
                  <EntitySearchCombobox
                    entity="students"
                    placeholder="Öğrenci ara…"
                    onChange={(id) => setStudentId(id ?? "")}
                  />
                </div>
              )}

              <label className="od-label-block">
                Tarih *
                <input
                  name="scheduledDate"
                  type="date"
                  required
                  defaultValue={todayLocalISO()}
                  className="od-input"
                />
              </label>
              <label className="od-label-block">
                Saat *
                <input
                  name="scheduledTime"
                  type="time"
                  required
                  defaultValue="10:00"
                  className="od-input"
                />
              </label>
              <label className="od-label-block">
                Süre (dk)
                <input
                  name="duration"
                  type="number"
                  min={15}
                  step={15}
                  defaultValue={60}
                  className="od-input"
                />
              </label>
              <label className="od-label-block">
                Konu
                <input
                  name="subject"
                  type="text"
                  placeholder="Örn. Türev — uygulama"
                  className="od-input"
                />
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="od-label-block">
                  Meet bağlantısı
                  <input
                    name="googleMeetLink"
                    type="url"
                    placeholder="https://meet.google.com/…"
                    className="od-input"
                  />
                </label>
              </div>
            </div>

            {error ? (
              <div className="od-alert od-alert-bad" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
                {error}
              </div>
            ) : null}
          </form>

          <footer className="od-modal-footer">
            <Dialog.Close asChild>
              <button type="button" className="od-btn od-btn-ghost od-btn-sm" disabled={pending}>
                İptal
              </button>
            </Dialog.Close>
            <button
              type="submit"
              form={formId}
              className="od-btn od-btn-primary od-btn-sm"
              disabled={pending}
            >
              {pending ? "Planlanıyor…" : "Planla"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
