/**
 * Online Koçum — haftalık plan şablonları.
 * Template task setidir; uygulandığında gerçek WeeklyPlanTask kayıtlarına dönüşür.
 */

import type { KocumTaskKind } from "./plan-tasks";

export type TemplateTaskDef = {
  dayOffset: number;
  title: string;
  description?: string;
  subject?: string;
  topic?: string;
  taskKind?: KocumTaskKind;
  scheduleMode?: "SCHEDULED" | "FLEXIBLE";
  targetType?: "QUESTIONS" | "MINUTES" | "PAGES" | "VIDEOS" | "NONE";
  targetValue?: number;
  durationMinutes: number;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
};

export type AppliedTemplateTask = TemplateTaskDef & {
  scheduledFor: Date;
  position: number;
  sourceType: "TEMPLATE";
  reasonCode: "CAPACITY_BALANCE";
  taskKind: KocumTaskKind;
  scheduleMode: "SCHEDULED" | "FLEXIBLE";
  targetType: "QUESTIONS" | "MINUTES" | "PAGES" | "VIDEOS" | "NONE";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
};

export function parseTemplateTaskDefs(raw: unknown): TemplateTaskDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const dayOffset = typeof row.dayOffset === "number" ? row.dayOffset : NaN;
    const durationMinutes =
      typeof row.durationMinutes === "number" ? row.durationMinutes : NaN;
    if (!title || !Number.isInteger(dayOffset) || dayOffset < 0 || dayOffset > 6) return [];
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) return [];
    return [
      {
        dayOffset,
        title,
        description: typeof row.description === "string" ? row.description : undefined,
        subject: typeof row.subject === "string" ? row.subject : undefined,
        topic: typeof row.topic === "string" ? row.topic : undefined,
        taskKind: (row.taskKind as KocumTaskKind | undefined) || "CUSTOM",
        scheduleMode: row.scheduleMode === "SCHEDULED" ? "SCHEDULED" : "FLEXIBLE",
        targetType:
          row.targetType === "QUESTIONS" ||
          row.targetType === "MINUTES" ||
          row.targetType === "PAGES" ||
          row.targetType === "VIDEOS"
            ? row.targetType
            : "NONE",
        targetValue: typeof row.targetValue === "number" ? row.targetValue : undefined,
        durationMinutes: Math.round(durationMinutes),
        priority:
          row.priority === "LOW" ||
          row.priority === "HIGH" ||
          row.priority === "URGENT"
            ? row.priority
            : "NORMAL",
      },
    ];
  });
}

export function applyTemplateToWeek(input: {
  weekStart: Date;
  taskDefs: TemplateTaskDef[];
  addDays: (weekStart: Date, offset: number) => Date;
}): AppliedTemplateTask[] {
  const defs = [...input.taskDefs].sort(
    (a, b) => a.dayOffset - b.dayOffset || a.title.localeCompare(b.title, "tr"),
  );
  const positionByDay = new Map<number, number>();
  return defs.map((def) => {
    const position = (positionByDay.get(def.dayOffset) || 0) + 1;
    positionByDay.set(def.dayOffset, position);
    return {
      ...def,
      scheduledFor: input.addDays(input.weekStart, def.dayOffset),
      position,
      sourceType: "TEMPLATE" as const,
      reasonCode: "CAPACITY_BALANCE" as const,
      taskKind: def.taskKind || "CUSTOM",
      scheduleMode: def.scheduleMode || "FLEXIBLE",
      targetType: def.targetType || "NONE",
      priority: def.priority || "NORMAL",
    };
  });
}

export const SYSTEM_TEMPLATE_CODES = [
  "LGS_STANDARD",
  "TYT_MATH_HEAVY",
  "AYT_SAYISAL",
  "MOCK_EXAM_WEEK",
  "REVIEW_WEEK",
] as const;
