/**
 * Online Koçum — domain barrel + student/coach work item ayrımı.
 */

export type WorkItemDomain = "DERSANEM_ASSIGNMENT" | "KOCUM_PLAN_TASK";

export type UnifiedWorkItem = {
  domain: WorkItemDomain;
  id: string;
  title: string;
  meta: string;
};

/** UI'da iki domain'i tek listede birleştirirken etiket zorunlu. */
export function workItemDomainLabel(domain: WorkItemDomain): string {
  return domain === "DERSANEM_ASSIGNMENT" ? "Dershanem ödevi" : "Koçum plan görevi";
}

export function separateWorkItems(items: UnifiedWorkItem[]): {
  assignments: UnifiedWorkItem[];
  planTasks: UnifiedWorkItem[];
} {
  return {
    assignments: items.filter((i) => i.domain === "DERSANEM_ASSIGNMENT"),
    planTasks: items.filter((i) => i.domain === "KOCUM_PLAN_TASK"),
  };
}

export * from "./plan-tasks";
export * from "./metrics";
export * from "./templates";
export * from "./visibility";
export * from "./adaptive-suggestions";
export * from "./schedule";
