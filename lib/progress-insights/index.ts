export type {
  AcademicInsights,
  AdminGidisatPanel,
  AreaHighlight,
  BehavioralInsights,
  InsightAudience,
  NetTrendPoint,
  ProgressInsightBundle,
  ProgressInsightPeriod,
  RateStat,
  SubjectTrendSeries,
  TeacherGidisatOverview,
  TeacherStudentGidisatRow,
  TrendDirection,
} from "@/lib/progress-insights/types";

export { PROGRESS_INSIGHT_SERIES_COLORS } from "@/lib/progress-insights/types";

export {
  averageNullable,
  buildAcademicInsights,
  buildBehavioralInsights,
  computeProgressInsightBundle,
  isDecliningGidisat,
  isInsightBundleEmpty,
  median,
} from "@/lib/progress-insights/compute";

export {
  buildNarrativeForAudience,
  buildTeacherOverviewNarrative,
} from "@/lib/progress-insights/narrative";

export { assertNoRiskLeak, stripForParentCalm } from "@/lib/progress-insights/privacy";

export {
  buildAdminGidisatPanel,
  buildTeacherGidisatOverview,
} from "@/lib/progress-insights/aggregate";
