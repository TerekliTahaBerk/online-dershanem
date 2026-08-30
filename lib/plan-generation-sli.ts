import { panelEventSchema } from "@/lib/panel-events";

export const PLAN_GENERATION_SLI_WINDOW_MINUTES = 15;
export const PLAN_GENERATION_ERROR_RATE_THRESHOLD = 3;

export type PlanGenerationEventRow = {
  name: string;
  properties: unknown;
};

export type PlanGenerationSliSnapshot = {
  status: "healthy" | "breached" | "no_data";
  windowMinutes: number;
  eligibleRequests: number;
  generatedPlans: number;
  systemErrors: number;
  generationRate: number | null;
  errorRate: number | null;
  errorRateThreshold: number;
};

export function evaluatePlanGenerationSli(rows: PlanGenerationEventRow[]): PlanGenerationSliSnapshot {
  const eligible = rows.flatMap((row) => {
    const parsed = panelEventSchema.safeParse({ name: row.name, properties: row.properties });
    return parsed.success && parsed.data.name === "plan_generation_finished" && parsed.data.properties.eligible
      ? [parsed.data]
      : [];
  });
  const generatedPlans = eligible.filter((event) => event.properties.outcome === "success").length;
  const systemErrors = eligible.filter((event) => event.properties.outcome === "system_error").length;
  const eligibleRequests = eligible.length;
  const generationRate = eligibleRequests ? Math.round((generatedPlans / eligibleRequests) * 10_000) / 100 : null;
  const errorRate = eligibleRequests ? Math.round((systemErrors / eligibleRequests) * 10_000) / 100 : null;

  return {
    status: errorRate === null ? "no_data" : errorRate > PLAN_GENERATION_ERROR_RATE_THRESHOLD ? "breached" : "healthy",
    windowMinutes: PLAN_GENERATION_SLI_WINDOW_MINUTES,
    eligibleRequests,
    generatedPlans,
    systemErrors,
    generationRate,
    errorRate,
    errorRateThreshold: PLAN_GENERATION_ERROR_RATE_THRESHOLD,
  };
}
