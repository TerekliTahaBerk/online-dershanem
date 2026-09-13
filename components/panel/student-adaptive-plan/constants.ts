/** Adaptif planın sabit etiketleri, biçimleyicileri ve saf görünüm yardımcıları. */
import type { CompletionField } from "@/lib/kocum/plan-tasks";
import type { OverloadOption } from "@/lib/adaptive-plan-overload";
import type { CompletionDraft, Task } from "./types";

export const days = [
  { id: 1, label: "Pzt" },
  { id: 2, label: "Sal" },
  { id: 3, label: "Çar" },
  { id: 4, label: "Per" },
  { id: 5, label: "Cum" },
  { id: 6, label: "Cmt" },
  { id: 7, label: "Paz" },
];

export const sourceLabels: Record<Task["sourceType"], string> = {
  ASSIGNMENT: "Ödev",
  REVIEW: "Tekrar",
  WEAK_OUTCOME: "Konu tekrarı",
  EXAM_PREP: "Sınav hazırlığı",
  RECOVERY: "Telafi",
  MANUAL_COACH: "Koç görevi",
  MOCK_EXAM: "Deneme",
  SYSTEM_SUGGESTED: "Öneri",
  TEMPLATE: "Şablon",
  PERSONAL_GOAL: "Hedef",
};

export const changeCategoryLabels: Record<string, string> = {
  TOO_MUCH: "Plan fazla yoğun",
  WRONG_DAYS: "Günler bana uymuyor",
  PRIORITY: "Öncelik doğru görünmüyor",
  OTHER: "Başka bir neden",
};
export const overloadOptionLabels: Record<OverloadOption, string> = {
  REDUCE_LIGHT: "Biraz azalt",
  REDUCE_HEAVY: "Çok azalt",
  CHANGE_DAYS: "Günleri değiştirmek istiyorum",
};
export function isOverloadOption(value: string): value is OverloadOption {
  return value === "REDUCE_LIGHT" || value === "REDUCE_HEAVY" || value === "CHANGE_DAYS";
}

export const dayHeading = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "short" });
export const dateTime = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function emptyDraft(status: CompletionDraft["status"], task: Task): CompletionDraft {
  return {
    status,
    actualQuestions: task.targetType === "QUESTIONS" && task.targetValue ? String(task.targetValue) : "",
    actualCorrect: "",
    actualIncorrect: "",
    actualBlank: "",
    actualMinutes: task.durationMinutes > 0 ? String(task.durationMinutes) : "",
    studentNote: "",
    difficultyFelt: "",
    energyFelt: "",
  };
}

export function fieldLabel(field: CompletionField): string {
  return {
    actualQuestions: "Çözülen soru",
    actualCorrect: "Doğru",
    actualIncorrect: "Yanlış",
    actualBlank: "Boş",
    actualMinutes: "Geçen süre (dk)",
    studentNote: "Notun",
    difficultyFelt: "Zorluk (1–5)",
    energyFelt: "Çalışma hissi (1–5)",
  }[field];
}
