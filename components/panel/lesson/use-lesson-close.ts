"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendPanelEvent } from "@/lib/panel-event-client";
import { useOfflineSync } from "@/components/panel/offline-sync-provider";
import type { SelectedOutcome } from "@/components/panel/outcome-picker";
import { noteSnapshot, type LessonData, type LessonStudent, type NoteTemplate, type OutcomeSkipReason } from "./types";

export type SaveState = "idle" | "saving" | "saved" | "error";

type Flags = {
  baselineMetricsEnabled: boolean;
  learningOutcomesEnabled: boolean;
  quickLessonCloseEnabled: boolean;
};

/**
 * DERS KAPANIŞI DURUMU — sekmelerden bağımsız tek kaynak.
 *
 * Otomatik taslak kaydı (850 ms), çevrimdışı kuyruk (`LESSON_CLOSE`),
 * sürüm/işlem anahtarıyla güvenli kapanış, kaydedilmemiş değişiklik
 * uyarısı ve ölçüm olayları burada; sekme bileşenleri yalnız çizer.
 */
export function useLessonClose(lesson: LessonData, flags: Flags) {
  const { baselineMetricsEnabled, learningOutcomesEnabled, quickLessonCloseEnabled } = flags;
  const { submitMutation } = useOfflineSync();
  const [form, setForm] = useState(lesson);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [completed, setCompleted] = useState(lesson.status === "COMPLETED");
  const [actionMessage, setActionMessage] = useState("");
  const [templates, setTemplates] = useState(lesson.templates);
  const [templateTitle, setTemplateTitle] = useState("");
  const [showStudentExceptions, setShowStudentExceptions] = useState(!quickLessonCloseEnabled);
  const [assignmentPreview, setAssignmentPreview] = useState(false);
  const [assignmentRecipients, setAssignmentRecipients] = useState<string[]>([]);
  const first = useRef(true);
  const closeVersion = useRef(lesson.closeVersion);
  const closeIdempotencyKey = useRef<string | null>(null);
  const lastSaved = useRef(noteSnapshot(lesson));
  const telemetry = useRef({
    startedAt: null as number | null,
    interactionCount: 0,
    draftSaveCount: 0,
    templateApplied: false,
    previousGoalUsed: false,
  });
  const dirty = noteSnapshot(form) !== lastSaved.current;
  const exceptionCount = form.students.filter((student) => student.attendance !== "PRESENT" || student.note.trim()).length;

  function recordInteraction() {
    if (!baselineMetricsEnabled) return;
    telemetry.current.interactionCount = Math.min(1000, telemetry.current.interactionCount + 1);
    if (telemetry.current.startedAt !== null) return;
    telemetry.current.startedAt = performance.now();
    if (lesson.status === "COMPLETED") {
      sendPanelEvent({ name: "lesson_close_reopened", properties: { groupSize: lesson.students.length } });
    } else {
      sendPanelEvent({
        name: "lesson_close_started",
        properties: { groupSize: lesson.students.length, initialStatus: "PLANNED" },
      });
    }
  }

  function patchSharedForm(patch: Partial<Pick<LessonData, "topic" | "note" | "nextGoal" | "homework">>) {
    recordInteraction();
    setForm((current) => ({ ...current, ...patch }));
  }

  const save = useCallback(
    async (complete: boolean) => {
      if (baselineMetricsEnabled && !complete)
        telemetry.current.draftSaveCount = Math.min(100, telemetry.current.draftSaveCount + 1);
      setSaveState("saving");
      if (complete && quickLessonCloseEnabled && !closeIdempotencyKey.current)
        closeIdempotencyKey.current = crypto.randomUUID();
      const assignmentDraft =
        complete && quickLessonCloseEnabled && assignmentPreview && form.homework.trim() && assignmentRecipients.length
          ? {
              title: `${form.topic || form.title} çalışması`,
              description: form.homework,
              dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
              studentIds: assignmentRecipients,
            }
          : null;
      const requestBody = {
        topic: form.topic,
        note: form.note,
        nextGoal: form.nextGoal,
        homework: form.homework,
        complete,
        students: form.students.map((student) => ({
          studentId: student.id,
          note: student.note,
          attendance: student.attendance,
        })),
        outcomes: learningOutcomesEnabled ? form.outcomeLinks : [],
        outcomeSkipReason: learningOutcomesEnabled ? form.outcomeSkipReason : null,
        expectedVersion: quickLessonCloseEnabled ? closeVersion.current : undefined,
        idempotencyKey: complete && quickLessonCloseEnabled ? closeIdempotencyKey.current : undefined,
        assignmentDraft,
      };
      const result = await submitMutation({
        kind: "LESSON_CLOSE",
        method: "PUT",
        url: `/api/panel/lessons/${lesson.id}/notes`,
        body: requestBody,
        coalesceKey: `lesson:${lesson.id}`,
      });
      const responseBody = result.body as {
        error?: string;
        version?: number;
        replayed?: boolean;
        assignmentCreated?: boolean;
      };
      const saved = result.state === "synced";
      const queued = result.state === "queued";
      setSaveState(saved || queued ? "saved" : "error");
      if (!saved && !queued && baselineMetricsEnabled) {
        sendPanelEvent({
          name: "lesson_autosave_failed",
          properties: { groupSize: lesson.students.length, completionAttempt: complete },
        });
      }
      if (saved || queued) {
        lastSaved.current = noteSnapshot(form);
        if (saved && typeof responseBody?.version === "number") closeVersion.current = responseBody.version;
      }
      if (!saved && !queued && complete)
        setActionMessage(responseBody?.error || "Ders kapatılamadı; değişiklikleriniz taslakta korunuyor.");
      if (queued)
        setActionMessage(
          complete
            ? "Bağlantı yok; ders kapanışı bu cihazda en fazla 24 saat güvenle bekliyor."
            : "Bağlantı yok; ders taslağı bu cihazda güvenle bekliyor.",
        );
      if (saved && complete) {
        setCompleted(true);
        setActionMessage(
          responseBody?.replayed
            ? "Bu kapanış daha önce güvenle tamamlandı; çift kayıt oluşturulmadı."
            : responseBody?.assignmentCreated
              ? `Ders tamamlandı; ödev ${assignmentRecipients.length} öğrenciye gönderildi.`
              : "Ders tamamlandı; öğrenci ve veli özeti hazır.",
        );
        if (baselineMetricsEnabled) {
          const initialStudents = new Map(lesson.students.map((student) => [student.id, student]));
          const changedStudentCount = form.students.filter((student) => {
            const initial = initialStudents.get(student.id);
            return !initial || initial.note !== student.note || initial.attendance !== student.attendance;
          }).length;
          sendPanelEvent({
            name: "lesson_close_completed",
            properties: {
              durationMs: Math.min(
                8 * 60 * 60 * 1000,
                Math.round(telemetry.current.startedAt === null ? 0 : performance.now() - telemetry.current.startedAt),
              ),
              groupSize: form.students.length,
              changedStudentCount,
              privateNoteCount: form.students.filter((student) => student.note.trim()).length,
              filledSharedFieldCount: [form.topic, form.note, form.nextGoal, form.homework].filter((value) => value.trim()).length,
              draftSaveCount: telemetry.current.draftSaveCount,
              interactionCount: telemetry.current.interactionCount,
              templateApplied: telemetry.current.templateApplied,
              previousGoalUsed: telemetry.current.previousGoalUsed,
              quickCloseEnabled: quickLessonCloseEnabled,
              exceptionCount,
              assignmentRecipientCount: assignmentDraft?.studentIds.length || 0,
            },
          });
        }
      }
      return saved;
    },
    [
      assignmentPreview,
      assignmentRecipients,
      baselineMetricsEnabled,
      exceptionCount,
      form,
      learningOutcomesEnabled,
      lesson.id,
      lesson.students,
      quickLessonCloseEnabled,
      submitMutation,
    ],
  );

  // Taslak otomatik kaydı: ilk çizimde değil, her değişiklikten 850 ms sonra.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => void save(false), 850);
    return () => window.clearTimeout(timer);
  }, [save]);

  // Kaydedilmemiş değişiklik varken sayfadan ayrılma uyarısı.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || saveState === "saving" || saveState === "error") event.preventDefault();
    };
    const guardLink = (event: MouseEvent) => {
      if (!dirty && saveState !== "saving" && saveState !== "error") return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      if (!window.confirm("Notlarda henüz güvenli biçimde kaydedilmemiş değişiklikler var. Yine de ayrılmak istiyor musunuz?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty, saveState]);

  // Çevrimdışı kuyruk eşitlendiğinde ya da çakıştığında durumu güncelle.
  useEffect(() => {
    const url = `/api/panel/lessons/${lesson.id}/notes`;
    const synced = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind: string;
          url: string;
          body?: { version?: number };
          requestBody?: { complete?: boolean };
        }>
      ).detail;
      if (detail?.kind !== "LESSON_CLOSE" || detail.url !== url) return;
      if (typeof detail.body?.version === "number") closeVersion.current = detail.body.version;
      setSaveState("saved");
      if (detail.requestBody?.complete) {
        setCompleted(true);
        setActionMessage("Cihazda bekleyen ders kapanışı güvenle eşitlendi.");
      } else setActionMessage("Cihazda bekleyen ders taslağı güvenle eşitlendi.");
    };
    const conflicted = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; url: string }>).detail;
      if (detail?.kind !== "LESSON_CLOSE" || detail.url !== url) return;
      setSaveState("error");
      setActionMessage("Ders başka yerde değişti. Son kaydı açıp cihazdaki değişiklikleri yeniden uygulayın.");
    };
    window.addEventListener("panel-offline-synced", synced);
    window.addEventListener("panel-offline-conflict", conflicted);
    return () => {
      window.removeEventListener("panel-offline-synced", synced);
      window.removeEventListener("panel-offline-conflict", conflicted);
    };
  }, [lesson.id]);

  async function createAssignment() {
    if (!form.homework.trim()) return setActionMessage("Önce çalışma alanını doldurun.");
    if (!(await save(false))) return;
    const response = await fetch("/api/panel/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        groupId: form.groupId,
        lessonId: form.id,
        title: `${form.topic || form.title} çalışması`,
        description: form.homework,
        dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        outcomeIds: learningOutcomesEnabled ? form.outcomeLinks.map((item) => item.outcomeId) : [],
        outcomeSkipReason: learningOutcomesEnabled ? form.outcomeSkipReason : null,
      }),
    });
    setActionMessage(response.ok ? "Çalışma ödeve dönüştürüldü ve öğrencilere gönderildi." : "Ödev oluşturulamadı.");
  }

  function patchStudent(id: string, patch: Partial<LessonStudent>) {
    recordInteraction();
    setForm((current) => ({
      ...current,
      students: current.students.map((student) => (student.id === id ? { ...student, ...patch } : student)),
    }));
  }

  function markEveryonePresent() {
    recordInteraction();
    setForm((current) => ({
      ...current,
      students: current.students.map((student) => ({ ...student, attendance: "PRESENT" as const })),
    }));
  }

  /** Önizleme açılabildiyse `true` döner (çalışma alanı boşsa açılmaz). */
  function toggleAssignmentPreview(): boolean {
    if (!form.homework.trim()) {
      setActionMessage("Ödev önizlemesi için önce çalışma alanını doldurun.");
      return false;
    }
    setAssignmentPreview((current) => {
      if (!current && !assignmentRecipients.length)
        setAssignmentRecipients(
          form.students
            .filter((student) => student.attendance === "PRESENT" || student.attendance === "LATE")
            .map((student) => student.id),
        );
      return !current;
    });
    return true;
  }

  function toggleRecipient(id: string) {
    setAssignmentRecipients((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function applyTemplate(template: Pick<NoteTemplate, "note" | "nextGoal" | "homework">) {
    recordInteraction();
    telemetry.current.templateApplied = true;
    setForm((current) => ({ ...current, note: template.note, nextGoal: template.nextGoal, homework: template.homework }));
  }

  function applyPreviousGoal() {
    recordInteraction();
    telemetry.current.previousGoalUsed = true;
    setForm((current) => ({ ...current, topic: current.topic || current.previousGoal || "" }));
  }

  function setOutcomeLinks(outcomeLinks: SelectedOutcome[]) {
    recordInteraction();
    setForm((current) => ({
      ...current,
      outcomeLinks,
      outcomeSkipReason: outcomeLinks.length ? null : current.outcomeSkipReason,
    }));
  }

  function setOutcomeSkipReason(outcomeSkipReason: OutcomeSkipReason) {
    setForm((current) => ({ ...current, outcomeSkipReason }));
  }

  async function saveTemplate() {
    if (templateTitle.trim().length < 2) return setActionMessage("Şablona kısa bir ad verin.");
    const response = await fetch("/api/panel/teacher/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: templateTitle, note: form.note, nextGoal: form.nextGoal, homework: form.homework }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setActionMessage(body.error || "Şablon kaydedilemedi.");
    setTemplates((current) => [
      { id: body.id, title: body.title, note: body.note || "", nextGoal: body.nextGoal || "", homework: body.homework || "" },
      ...current,
    ]);
    setTemplateTitle("");
    setActionMessage("Kişisel not şablonu kaydedildi.");
  }

  async function deleteTemplate(id: string) {
    const response = await fetch(`/api/panel/teacher/templates/${id}`, { method: "DELETE" });
    if (response.ok) setTemplates((current) => current.filter((template) => template.id !== id));
  }

  function close() {
    recordInteraction();
    void save(true);
  }

  return {
    form,
    flags,
    saveState,
    completed,
    actionMessage,
    templates,
    templateTitle,
    setTemplateTitle,
    showStudentExceptions,
    setShowStudentExceptions,
    assignmentPreview,
    assignmentRecipients,
    exceptionCount,
    patchSharedForm,
    patchStudent,
    markEveryonePresent,
    toggleAssignmentPreview,
    toggleRecipient,
    applyTemplate,
    applyPreviousGoal,
    setOutcomeLinks,
    setOutcomeSkipReason,
    saveTemplate,
    deleteTemplate,
    createAssignment,
    close,
  };
}

export type LessonCloseState = ReturnType<typeof useLessonClose>;
